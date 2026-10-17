import { test, expect } from './fixtures/demo';
import type { DataState } from '../src/store/types';

test('LEDGER-06: income row and detail agree on the debit account', async ({
  seededDemoPage: page,
}) => {
  // A legacy multi-entry income row can contain another account credit before
  // the account debit. Both views must select the debit account as the source.
  await page.evaluate(() => {
    const app = window as typeof window & { useDataStore: { getState: () => DataState } };
    const store = app.useDataStore.getState();
    const { accountId: otherAccountId } = store.addAccount({
      name: 'Fixture Other',
      type: 'Asset',
      initialBalance: 0,
      isSavings: false,
      isActive: true,
    });
    const income = store.transactions.find(txn => txn.note === 'Fixture paycheck');
    const categoryId = income?.entries.find(entry => entry.type === 'CREDIT')?.accountId;
    if (!income || !categoryId) throw new Error('Seeded income was not found');

    store.updateTransaction(income.id, {
      entries: [
        { accountId: otherAccountId, type: 'CREDIT', amount: 100 },
        ...income.entries,
        { accountId: categoryId, type: 'DEBIT', amount: 100 },
      ],
    });
  });

  await page.locator('aside a[href="/transactions"]').click();
  const row = page
    .locator('div.cursor-pointer')
    .filter({ has: page.getByText('Fixture paycheck', { exact: true }) })
    .last();
  await expect(row).toContainText('Fixture Checking');
  await expect(row).not.toContainText('Fixture Other');

  await page.getByText('Fixture paycheck', { exact: true }).click();
  const detailPanel = page.getByRole('heading', { name: 'Transaction Details' }).locator('../..');
  await expect(detailPanel.getByText('Fixture Checking', { exact: true })).toBeVisible();
  await expect(detailPanel.getByText('Fixture Other', { exact: true })).toHaveCount(0);
});
