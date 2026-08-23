import type { SheetClient } from '../../../sync/SheetClient';
import { ACCOUNT_COLUMNS } from '../../entities/account.schema';
import { METHOD_COLUMNS } from '../../entities/method.schema';
import { CATEGORY_COLUMNS } from '../../entities/category.schema';
import { TRANSACTION_COLUMNS } from '../../entities/transaction.schema';
import { BUDGET_COLUMNS } from '../../entities/budget.schema';
import { SETTINGS_COLUMNS } from '../../entities/settings.schema';

/** All sheet tab names required by v1 */
const REQUIRED_TABS = ['Accounts', 'Methods', 'Categories', 'Transactions', 'Budgets', 'Settings'];

/** V1 headers map — keyed by sheet tab name */
const V1_HEADERS: Record<string, readonly string[]> = {
  Accounts: ACCOUNT_COLUMNS,
  Methods: METHOD_COLUMNS,
  Categories: CATEGORY_COLUMNS,
  Transactions: TRANSACTION_COLUMNS,
  Budgets: BUDGET_COLUMNS,
  Settings: SETTINGS_COLUMNS,
};

/**
 * Sheets Migration 001 — Initial Schema
 *
 * Ensures all required sheet tabs exist and each has its header row written.
 * For new users this creates the entire spreadsheet structure from scratch.
 * For existing users with matching headers, this is a no-op.
 */
const migration001Sheets: {
  version: number;
  up: (client: SheetClient) => Promise<void>;
} = {
  version: 1,

  async up(client: SheetClient): Promise<void> {
    // 1. Ensure all tabs exist (creates any that are missing)
    await client.ensureSheetTabs(REQUIRED_TABS);

    // 2. Ensure each tab has the correct header row (only writes if empty)
    for (const tabName of REQUIRED_TABS) {
      const headers = V1_HEADERS[tabName];
      if (!headers) continue;
      const existing = await client.readSheet(tabName);
      if (existing.length === 0) {
        await client.writeHeader(tabName, [...headers]);
      }
    }

    // 3. Ensure the _meta tab exists for schema version tracking
    await client.ensureSheetTabs(['_meta']);
  },
};

export default migration001Sheets;
