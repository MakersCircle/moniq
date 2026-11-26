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

  const filterButton = page.getByRole('button', { name: 'Filters' });
  await filterButton.click();
  const backdrop = page.locator('.fixed.inset-0.backdrop-blur-sm');
  await expect(backdrop).toBeVisible();
  await expect(backdrop).toHaveCSS('animation-delay', '0s');
  const menu = page.getByRole('dialog', { name: 'Filters' });
  await expect(menu).toBeVisible();
  await expect(menu).toHaveCSS('animation-delay', '0s');
  await expect(menu).toHaveClass(/slide-in-from-bottom/);
  const typeSection = menu.getByRole('button', { name: 'Filter by type' });
  const accountSection = menu.getByRole('button', { name: 'Filter by account' });
  const categorySection = menu.getByRole('button', { name: 'Filter by category' });
  await expect(typeSection).toHaveAttribute('aria-expanded', 'true');
  await expect(accountSection).toHaveAttribute('aria-expanded', 'false');
  await expect(categorySection).toHaveAttribute('aria-expanded', 'false');
  await expect(menu.getByRole('group', { name: 'Filter by type' })).toBeVisible();
  await menu.getByRole('checkbox', { name: 'Income', exact: true }).uncheck();
  await menu.getByRole('checkbox', { name: 'Transfer', exact: true }).uncheck();
  await accountSection.click();
  await expect(accountSection).toHaveAttribute('aria-expanded', 'true');
  await expect(typeSection).toHaveAttribute('aria-expanded', 'false');
  const accountSearch = menu.getByPlaceholder('Search accounts...');
  if (await accountSearch.count()) await accountSearch.fill('Fixture Checking');
  await menu.getByRole('checkbox', { name: 'Fixture Checking', exact: true }).check();
  await categorySection.click();
  await expect(categorySection).toHaveAttribute('aria-expanded', 'true');
  await expect(accountSection).toHaveAttribute('aria-expanded', 'false');
  const categorySearch = menu.getByPlaceholder('Search categories...');
  if (await categorySearch.count()) await categorySearch.fill('Fixture Food');
  await menu.getByRole('checkbox', { name: 'Fixture Food', exact: true }).check();

  await expect(page.getByText('Fixture groceries', { exact: true })).toBeVisible();
  await expect(page.getByText('Fixture paycheck', { exact: true })).toHaveCount(0);
  await expect(page.locator('[data-ledger-filter-indicator]')).toBeVisible();
  await expect(typeSection).toBeVisible();
  await expect(typeSection).toHaveAttribute('aria-expanded', 'false');

  await typeSection.click();
  await menu.getByRole('checkbox', { name: 'Expenses', exact: true }).uncheck();
  await expect(page.getByText('Fixture groceries', { exact: true })).toBeVisible();
  await categorySection.click();
  await menu.getByRole('checkbox', { name: 'Fixture Food', exact: true }).uncheck();
  await accountSection.click();
  await menu.getByRole('checkbox', { name: 'Fixture Checking', exact: true }).uncheck();
  await expect(page.locator('[data-ledger-filter-indicator]')).toHaveCount(0);
  await expect(page.getByText('Fixture paycheck', { exact: true })).toBeVisible();
  await expect(page.getByText('Fixture groceries', { exact: true })).toBeVisible();
});
