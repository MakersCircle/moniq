import type { SheetClient } from '@/sync/SheetClient';
import { TRANSACTION_COLUMNS } from '@/schema/entities/transaction.schema';

const SHEET = 'Transactions';
const NEW_COL = 'Sort Order';

/**
 * Sheets Migration 002 — Add Sort Order column to the Transactions sheet.
 *
 * Strategy:
 *  1. Read all existing rows (header + data).
 *  2. If the header already contains 'Sort Order', this is a no-op.
 *  3. Otherwise, find where the new column should be inserted (just before 'Checksum'),
 *     splice it into the header, splice an empty string into every data row at the same
 *     position, then overwrite the sheet with the updated data.
 *
 * This is safe to re-run — the column-present check makes it idempotent.
 */
const migration002Sheets: {
  version: number;
  up: (client: SheetClient) => Promise<void>;
} = {
  version: 2,

  async up(client: SheetClient): Promise<void> {
    const rows = await client.readSheet(SHEET);

    // Sheet is empty or header already has the column — nothing to do
    if (rows.length === 0 || rows[0].includes(NEW_COL)) return;

    const header = rows[0];
    const dataRows = rows.slice(1);

    // Find insertion index: just before 'Checksum', or at end if not found
    const checksumIdx = header.indexOf('Checksum');
    const insertAt = checksumIdx === -1 ? header.length : checksumIdx;

    // Build new header matching TRANSACTION_COLUMNS order
    const newHeader = [...TRANSACTION_COLUMNS];

    // Splice new column into each data row (empty value for existing rows)
    const newDataRows = dataRows.map(row => {
      const updated = [...row];
      updated.splice(insertAt, 0, '');
      return updated;
    });

    // Overwrite the full sheet: writeHeader then appendRows
    await client.writeHeader(SHEET, newHeader);
    if (newDataRows.length > 0) {
      // Use batchUpdateRows to rewrite all data rows starting at row 2
      await client.batchUpdateRows(
        SHEET,
        newDataRows.map((data, i) => ({ rowIndex: i + 2, data }))
      );
    }
  },
};

export default migration002Sheets;
