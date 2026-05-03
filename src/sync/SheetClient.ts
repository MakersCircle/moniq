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

  constructor(spreadsheetId: string) {
    this.spreadsheetId = spreadsheetId;
  }

  // ── Read Operations ─────────────────────────────────────────

  /** Read all rows from a sheet tab (including header row). */
  async readSheet(sheetName: string): Promise<string[][]> {
    const url = `/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(sheetName)}`;
    const res = await googleService.sheetsRequest(url);

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

  /** Read a specific row by 1-based index. */
  async readRow(sheetName: string, rowIndex: number): Promise<string[] | null> {
    const range = `${sheetName}!A${rowIndex}:Z${rowIndex}`;
    const url = `/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(range)}`;
    const res = await googleService.sheetsRequest(url);

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

  /** Append rows to the bottom of a sheet. Returns the number of rows appended. */
  async appendRows(sheetName: string, rows: string[][]): Promise<number> {
    if (rows.length === 0) return 0;

    const range = `${sheetName}!A1`;
    const url = `/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

    const res = await googleService.sheetsRequest(url, {
      method: 'POST',
      body: JSON.stringify({ values: rows }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to append rows to "${sheetName}": ${res.status} ${errorText}`);
    }

    return rows.length;
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
    const res = await googleService.sheetsRequest(url, {
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

    const res = await googleService.sheetsRequest(url, {
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
    await googleService.sheetsRequest(clearUrl, { method: 'POST' });

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
    const metaRes = await googleService.sheetsRequest(metaUrl);

    if (!metaRes.ok) throw new Error('Failed to fetch spreadsheet metadata');

    const metaData: { sheets: SpreadsheetSheetMeta[] } = await metaRes.json();
    const existing = new Set(metaData.sheets.map(s => s.properties.title));

    const missing = requiredSheets.filter(name => !existing.has(name));
    if (missing.length === 0) return;

    const requests = missing.map(title => ({
      addSheet: { properties: { title } },
    }));

    const batchUrl = `/spreadsheets/${this.spreadsheetId}:batchUpdate`;
    const res = await googleService.sheetsRequest(batchUrl, {
      method: 'POST',
      body: JSON.stringify({ requests }),
    });

    if (!res.ok) {
      console.warn('Failed to create missing sheets:', await res.text());
    }
  }

  /** Clear all data rows from all registered application sheets (keeping headers). */
  async clearAllData(sheetNames: string[]): Promise<void> {
    const url = `/spreadsheets/${this.spreadsheetId}/values:batchClear`;
    const res = await googleService.sheetsRequest(url, {
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

  /** Get the total number of data rows in a sheet (excluding header). */
  async getRowCount(sheetName: string): Promise<number> {
    const rows = await this.readSheet(sheetName);
    return Math.max(0, rows.length - 1); // subtract header row
  }
}
