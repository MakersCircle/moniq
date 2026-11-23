import { format } from 'date-fns';
import { test, expect } from './fixtures/demo';
import type { DataState } from '../src/store/types';

async function seedAccountFilterData(page: import('@playwright/test').Page) {
  const today = format(new Date(), 'yyyy-MM-dd');
  await page.evaluate(today => {
    const app = window as typeof window & { useDataStore?: { getState: () => DataState } };
    const store = app.useDataStore?.getState();
    if (!store) throw new Error('Demo store is unavailable');

    const category = store.categories.find(item => item.head === 'Fixture Food' && !item.subHead);
    if (!category) throw new Error('Seeded Ledger category is missing');

    const { accountId, methodId } = store.addAccount(
      {
        name: 'Fixture Savings',
        type: 'Asset',
        initialBalance: 500,
        isSavings: true,
        excludeFromNet: false,
        isActive: true,
      },
      'Fixture Savings Card'
    );
    store.addTransaction({
      date: today,
      uiType: 'expense',
      amount: 45,
      accountId,
      targetId: category.id,
      methodId,
      note: 'Account savings transaction',
    });
  }, today);
}

test('LEDGER-12: account checkboxes filter matching Ledger rows', async ({
  seededDemoPage: page,
}) => {
  test.skip(
    test.info().project.name !== 'desktop',
    'The Accounts column is hidden on phone layouts'
  );
  await seedAccountFilterData(page);
  await page.getByRole('link', { name: 'Ledger', exact: true }).first().click();

  await page.getByRole('button', { name: 'Filter by account' }).click();
  const filter = page
    .locator('[data-radix-popper-content-wrapper]')
    .filter({ has: page.getByPlaceholder('Search accounts...') });
  await expect(filter.getByPlaceholder('Search accounts...')).toBeFocused();

  const checkingCheckbox = filter.getByRole('checkbox', { name: 'Fixture Checking', exact: true });
  await checkingCheckbox.click();
  await filter.getByPlaceholder('Search accounts...').fill('Fixture Savings');
  const savingsCheckbox = filter.getByRole('checkbox', { name: 'Fixture Savings', exact: true });
  await savingsCheckbox.click();

  await expect(filter.getByText('2 selected', { exact: true })).toBeVisible();
  await expect(page.getByText('Fixture paycheck', { exact: true })).toBeVisible();
  await expect(page.getByText('Fixture groceries', { exact: true })).toBeVisible();
  await expect(page.getByText('Account savings transaction', { exact: true })).toBeVisible();

  await filter.getByRole('button', { name: 'Clear account filter' }).click();
  await expect(page.getByText('Fixture paycheck', { exact: true })).toBeVisible();
  await filter.getByPlaceholder('Search accounts...').fill('missing account');
  await expect(filter.getByText('No accounts found.')).toBeVisible();
});

test('LEDGER-16: mobile common filters include account, type, and category', async ({
  seededDemoPage: page,
}) => {
  test.skip(
    (page.viewportSize()?.width ?? 0) >= 768,
    'The common filter menu is for phone layouts'
  );
  await page.getByRole('link', { name: 'Ledger', exact: true }).first().click();

  await page.getByRole('button', { name: 'Filters' }).click();
  const menu = page.locator('[data-radix-popper-content-wrapper]').filter({
    has: page.getByPlaceholder('Search accounts...'),
  });
  await expect(menu.getByRole('group', { name: 'Filter by type' })).toBeVisible();
  await menu.getByRole('checkbox', { name: 'Income', exact: true }).uncheck();
  await menu.getByRole('checkbox', { name: 'Transfer', exact: true }).uncheck();
  await menu.getByPlaceholder('Search accounts...').fill('Fixture Checking');
  await menu.getByRole('checkbox', { name: 'Fixture Checking', exact: true }).check();
  await menu.getByPlaceholder('Search categories...').fill('Fixture Food');
  await menu.getByRole('checkbox', { name: 'Fixture Food', exact: true }).check();

  await expect(page.getByText('Fixture groceries', { exact: true })).toBeVisible();
  await expect(page.getByText('Fixture paycheck', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Filter by type' })).toBeHidden();
});
