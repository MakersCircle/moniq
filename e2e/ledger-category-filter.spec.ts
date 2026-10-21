import { format } from 'date-fns';
import { test, expect } from './fixtures/demo';
import type { DataState } from '../src/store/types';

async function seedCategoryFilterData(page: import('@playwright/test').Page) {
  const today = format(new Date(), 'yyyy-MM-dd');
  await page.evaluate(today => {
    const app = window as typeof window & { useDataStore?: { getState: () => DataState } };
    const store = app.useDataStore?.getState();
    if (!store) throw new Error('Demo store is unavailable');

    const account = store.accounts.find(item => item.name === 'Fixture Checking');
    const method = store.methods.find(item => item.name === 'Fixture Debit Card');
    const food = store.categories.find(item => item.head === 'Fixture Food' && !item.subHead);
    if (!account || !method || !food) throw new Error('Seeded Ledger dependencies are missing');

    const groceries = store.addCategory({
      group: 'Needs',
      head: 'Fixture Food',
      subHead: 'Groceries',
      isActive: true,
    }).id;
    const dining = store.addCategory({
      group: 'Needs',
      head: 'Fixture Food',
      subHead: 'Dining',
      isActive: true,
    }).id;
    const transport = store.addCategory({
      group: 'Wants',
      head: 'Transport',
      isActive: true,
    }).id;

    store.addTransaction({
      date: today,
      uiType: 'expense',
      amount: 20,
      accountId: account.id,
      targetId: groceries,
      methodId: method.id,
      note: 'Category groceries',
    });
    store.addTransaction({
      date: today,
      uiType: 'expense',
      amount: 30,
      accountId: account.id,
      targetId: dining,
      methodId: method.id,
      note: 'Category dining',
    });
    store.addTransaction({
      date: today,
      uiType: 'expense',
      amount: 15,
      accountId: account.id,
      targetId: transport,
      methodId: method.id,
      note: 'Category transport',
    });
    store.addTransaction({
      date: today,
      uiType: 'expense',
      amount: 40,
      accountId: account.id,
      targetId: groceries,
      methodId: method.id,
      note: 'Category mixed split',
    });

    const mixedSplit = app.useDataStore
      ?.getState()
      .transactions.find(transaction => transaction.note === 'Category mixed split');
    if (!mixedSplit) throw new Error('Mixed-category fixture transaction was not created');
    store.updateTransaction(mixedSplit.id, {
      entries: [
        { accountId: groceries, type: 'DEBIT', amount: 20 },
        { accountId: dining, type: 'DEBIT', amount: 20 },
        { accountId: account.id, type: 'CREDIT', amount: 40 },
      ],
    });
  }, today);
}

test('LEDGER-11: category and subcategory checkboxes filter matching Ledger rows', async ({
  seededDemoPage: page,
}) => {
  test.skip(
    test.info().project.name !== 'desktop',
    'The Category column is hidden on phone layouts'
  );
  await seedCategoryFilterData(page);
  await page.getByRole('link', { name: 'Ledger', exact: true }).first().click();

  await page.getByRole('button', { name: 'Filter by category' }).click();
  const filter = page
    .locator('[data-radix-popper-content-wrapper]')
    .filter({ has: page.getByPlaceholder('Search categories...') });
  await expect(filter.getByPlaceholder('Search categories...')).toBeFocused();

  await expect(filter.getByText('Needs', { exact: true })).toHaveCount(0);
  await filter.getByRole('button', { name: 'Expand Fixture Food' }).click();
  const parentCheckbox = filter.getByRole('checkbox', { name: 'Fixture Food', exact: true });
  const groceriesCheckbox = filter.getByRole('checkbox', { name: 'Groceries', exact: true });
  await groceriesCheckbox.click();

  await expect(parentCheckbox).toHaveAttribute('aria-checked', 'mixed');
  await expect(page.getByText('Category groceries', { exact: true })).toBeVisible();
  await expect(page.getByText('Category mixed split', { exact: true })).toBeVisible();
  await expect(page.getByText('Category dining', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Category transport', { exact: true })).toHaveCount(0);

  await parentCheckbox.click();
  await expect(parentCheckbox).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByText('Fixture groceries', { exact: true })).toBeVisible();
  await expect(page.getByText('Category dining', { exact: true })).toBeVisible();
  await expect(page.getByText('Category mixed split', { exact: true })).toBeVisible();
  await expect(page.getByText('Category transport', { exact: true })).toHaveCount(0);

  await parentCheckbox.click();
  await expect(page.getByText('Category dining', { exact: true })).toBeVisible();
  await expect(page.getByText('Category transport', { exact: true })).toBeVisible();

  const search = filter.getByPlaceholder('Search categories...');
  await search.fill('Groceries');
  await expect(filter.getByRole('checkbox', { name: 'Groceries', exact: true })).toBeVisible();
  await expect(filter.getByRole('checkbox', { name: 'Dining', exact: true })).toHaveCount(0);
  await search.fill('missing category');
  await expect(filter.getByText('No categories found.')).toBeVisible();
});
