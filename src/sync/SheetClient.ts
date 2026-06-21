import { googleService } from '../lib/google';
import { SHEET_HEADERS } from './types';

/** Shape of a single sheet entry in Google Sheets spreadsheet metadata */
interface SpreadsheetSheetMeta {
  properties: {
    title: string;
    sheetId: number;
  };
}

/**
 * Low-level Google Sheets API wrapper.
 * Handles reading/writing specific rows and ranges — replaces the old full-overwrite approach.
 */
export class SheetClient {
  private spreadsheetId: string;

  private static requestTimestamps: number[] = [];
  private static readonly MAX_REQUESTS_PER_MINUTE = 50; // Keep a buffer of 10 requests

  constructor(spreadsheetId: string) {
    this.spreadsheetId = spreadsheetId;
  }

  /**
   * Enforces the 60 requests per minute Google Sheets API limit across instances.
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    // Keep only timestamps from the last 60 seconds
    SheetClient.requestTimestamps = SheetClient.requestTimestamps.filter(t => now - t < 60000);

    if (SheetClient.requestTimestamps.length >= SheetClient.MAX_REQUESTS_PER_MINUTE) {
      const oldest = SheetClient.requestTimestamps[0];
      const waitTime = 60000 - (now - oldest);
      if (waitTime > 0) {
        console.warn(
          `[Moniq Sync] Approaching Google Sheets API rate limit. Pausing for ${Math.ceil(waitTime / 1000)} seconds...`
        );
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      return this.rateLimit(); // Re-evaluate after sleeping
    }

    SheetClient.requestTimestamps.push(Date.now());
  }

  /**
   * A rate-limited wrapper around the global googleService.sheetsRequest
   */
  private async safeRequest(url: string, init?: RequestInit): Promise<Response> {
    await this.rateLimit();
    return googleService.sheetsRequest(url, init);
  }

  // ── Read Operations ─────────────────────────────────────────

  /** Read all rows from a sheet tab (including header row). */
  async readSheet(sheetName: string): Promise<string[][]> {
    const url = `/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(sheetName)}`;
    const res = await this.safeRequest(url);

    if (!res.ok) {
      if (res.status === 400) {
        // Sheet might not exist yet — return empty
        return [];
      }
      const errorText = await res.text();
      throw new Error(`Failed to read sheet "${sheetName}": ${res.status} ${errorText}`);
    }

    const data = await res.json();
    return data.values || [];
  }

  /**
   * Fetch all listed sheets in a single `values:batchGet` request.
   * Returns one `string[][]` per sheet, in the same order as `sheetNames`.
   * Falls back to an empty array for any sheet that has no data yet.
   *
   * Using this instead of 6 parallel `readSheet` calls reduces the number of
   * API requests from 6 to 1 on every `initialize()`.
   */
  async batchGetSheets(sheetNames: string[]): Promise<string[][][]> {
    if (sheetNames.length === 0) return [];

    const params = sheetNames.map(n => `ranges=${encodeURIComponent(n)}`).join('&');
    const url = `/spreadsheets/${this.spreadsheetId}/values:batchGet?${params}`;
    const res = await this.safeRequest(url);

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to batch-get sheets: ${res.status} ${errorText}`);
    }

    const data: { valueRanges: { values?: string[][] }[] } = await res.json();

    // valueRanges is returned in the same order as the requested ranges.
    return (data.valueRanges || []).map(vr => vr.values || []);
  }

  /** Read a specific row by 1-based index. */
  async readRow(sheetName: string, rowIndex: number): Promise<string[] | null> {
    const range = `${sheetName}!A${rowIndex}:Z${rowIndex}`;
    const url = `/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(range)}`;
    const res = await this.safeRequest(url);

    if (!res.ok) return null;

    const data = await res.json();
    return data.values?.[0] || null;
  }

  // ── Write Operations ────────────────────────────────────────

  /** Ensure a sheet has its header row. If empty, write headers. */
  async ensureHeaders(sheetName: string): Promise<void> {
    const headerDef = SHEET_HEADERS[sheetName];
    if (!headerDef) return;

    const existing = await this.readSheet(sheetName);
    if (existing.length === 0) {
      await this.writeRange(sheetName, 'A1', [headerDef]);
    }
  }

  /** Write/Overwrite the header row of a sheet. */
  async writeHeader(sheetName: string, headers: string[]): Promise<void> {
    await this.writeRange(sheetName, 'A1', [headers]);
  }

  /** Append rows to the bottom of a sheet. Returns the starting 1-based row index where data was inserted. */
  async appendRows(sheetName: string, rows: string[][]): Promise<number> {
    if (rows.length === 0) throw new Error('Cannot append 0 rows');

    const range = `${sheetName}!A1`;
    const url = `/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

    const res = await this.safeRequest(url, {
      method: 'POST',
      body: JSON.stringify({ values: rows }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to append rows to "${sheetName}": ${res.status} ${errorText}`);
    }

    const data = await res.json();
    const updatedRange = data.updates?.updatedRange; // e.g. "Transactions!A16:M16" or "'My Sheet'!A16:M17"

    if (updatedRange) {
      const match = updatedRange.match(/!A(\d+)/);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
    }

    throw new Error(
      `Failed to parse starting row from Sheets API response: ${JSON.stringify(data)}`
    );
  }

  /** Update a specific row (1-based index) with new data. */
  async updateRow(sheetName: string, rowIndex: number, data: string[]): Promise<void> {
    await this.writeRange(sheetName, `A${rowIndex}`, [data]);
  }

  /** Batch update multiple specific rows. More efficient than individual updateRow calls. */
  async batchUpdateRows(
    sheetName: string,
    updates: { rowIndex: number; data: string[] }[]
  ): Promise<void> {
    if (updates.length === 0) return;

    const data = updates.map(u => ({
      range: `${sheetName}!A${u.rowIndex}`,
      values: [u.data],
    }));

    const url = `/spreadsheets/${this.spreadsheetId}/values:batchUpdate`;
    const res = await this.safeRequest(url, {
      method: 'POST',
      body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to batch update "${sheetName}": ${res.status} ${errorText}`);
    }
  }

  /** Write data to a specific range. */
  private async writeRange(
    sheetName: string,
    startCell: string,
    values: string[][]
  ): Promise<void> {
    const range = `${sheetName}!${startCell}`;
    const url = `/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

    const res = await this.safeRequest(url, {
      method: 'PUT',
      body: JSON.stringify({ values }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to write range "${range}": ${res.status} ${errorText}`);
    }
  }

  // ── Full Sheet Write (for initial sync or force sync) ──────

  /** Clear a sheet and write all data (header + rows). Used for force sync. */
  async overwriteSheet(sheetName: string, rows: string[][]): Promise<void> {
    // Clear existing data
    const clearUrl = `/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(sheetName)}:clear`;
    await this.safeRequest(clearUrl, { method: 'POST' });

    // Write header + rows
    const headerDef = SHEET_HEADERS[sheetName];
    const allRows = headerDef ? [headerDef, ...rows] : rows;

    if (allRows.length > 0) {
      await this.writeRange(sheetName, 'A1', allRows);
    }
  }

  // ── Sheet Metadata ────────────────────────────────────────────

  /** Ensure required sheet tabs exist. Creates missing ones. */
  async ensureSheetTabs(requiredSheets: string[]): Promise<void> {
    const metaUrl = `/spreadsheets/${this.spreadsheetId}`;
    const metaRes = await this.safeRequest(metaUrl);

    if (!metaRes.ok) throw new Error('Failed to fetch spreadsheet metadata');

    const metaData: { sheets: SpreadsheetSheetMeta[] } = await metaRes.json();
    const existing = new Set(metaData.sheets.map(s => s.properties.title));

    const missing = requiredSheets.filter(name => !existing.has(name));

    // Check for orphaned "Sheet1"
    const sheet1 = metaData.sheets.find(s => s.properties.title === 'Sheet1');
    const willHaveOtherSheets = existing.size > (sheet1 ? 1 : 0) || missing.length > 0;

    const requests: Record<string, unknown>[] = [];

    // 1. Add missing sheets
    missing.forEach(title => {
      requests.push({ addSheet: { properties: { title } } });
    });

    // 2. Delete Sheet1 if it exists and we have other sheets
    if (sheet1 && willHaveOtherSheets) {
      requests.push({ deleteSheet: { sheetId: sheet1.properties.sheetId } });
    }

    if (requests.length === 0) return;

    const batchUrl = `/spreadsheets/${this.spreadsheetId}:batchUpdate`;
    const res = await this.safeRequest(batchUrl, {
      method: 'POST',
      body: JSON.stringify({ requests }),
    });

    if (!res.ok) {
      console.warn('Failed to update sheets (create/delete):', await res.text());
    }
  }

  /** Clear all data rows from all registered application sheets (keeping headers). */
  async clearAllData(sheetNames: string[]): Promise<void> {
    const url = `/spreadsheets/${this.spreadsheetId}/values:batchClear`;
    const res = await this.safeRequest(url, {
      method: 'POST',
      body: JSON.stringify({
        ranges: sheetNames.map(name => `${name}!A2:Z`),
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Failed to batch clear sheets: ${res.status} ${errorText}`);
    }
  }
}
