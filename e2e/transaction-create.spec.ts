import type { Locator, Page } from '@playwright/test';
import type { DataState } from '../src/store/types';
import { test, expect } from './fixtures/demo';

async function openTransactionForm(page: Page): Promise<Locator> {
  if ((page.viewportSize()?.width ?? 0) >= 1024) {
    await page.getByRole('button', { name: 'New Transaction' }).click();
  } else {
    await page.locator('body > div aside').first().locator('button').click();
  }
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return dialog;
}

async function chooseLabeledOption(page: Page, dialog: Locator, label: string, option: string) {
  await dialog.getByText(label, { exact: true }).locator('..').getByRole('combobox').click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

async function openLedger(page: Page) {
  await page.goto('/transactions');
  await expect(page).toHaveURL(/\/transactions$/);
}

function ledgerRow(page: Page, note: string) {
  return page.locator('div.cursor-pointer').filter({ hasText: note });
}

async function expectAccountBalance(page: Page, account: string, amount: number) {
  await page.goto('/dashboard');
  const accountRow = page.getByText(account, { exact: true }).first().locator('../..');
  await expect(accountRow).toContainText(new Intl.NumberFormat('en-IN').format(amount));
}

test('DEMO-01/TXN-02: expense saves through the form and survives reload', async ({
  seededDemoPage: page,
}) => {
  const dialog = await openTransactionForm(page);
  const save = dialog.getByRole('button', { name: 'Save expense' });
  await expect(save).toBeDisabled();
  await dialog.getByPlaceholder('0.00').fill('125');
  await expect(save).toBeDisabled();
  await chooseLabeledOption(page, dialog, 'Category', 'Fixture Food');
  await dialog.getByPlaceholder('What was this for?').fill('Browser expense');
  await expect(save).toBeEnabled();
  await save.click();
  await expect(dialog).toBeHidden();

  await openLedger(page);
  await expect(ledgerRow(page, 'Browser expense')).toContainText('Fixture Food');
  await expect(ledgerRow(page, 'Browser expense')).toContainText('Fixture Checking');
  await expect(ledgerRow(page, 'Browser expense')).toContainText('125');
  await page.reload();
  await expect(ledgerRow(page, 'Browser expense')).toBeVisible();
  await expectAccountBalance(page, 'Fixture Checking', 2625);
  await expect(page.getByText('Expenses', { exact: true }).locator('..')).toContainText('375');
  await expect(page.getByText('Fixture Food', { exact: true }).first().locator('..')).toContainText(
    '375'
  );
});

test('TXN-03: income saves through the form and increases the linked account', async ({
  seededDemoPage: page,
}) => {
  const dialog = await openTransactionForm(page);
  await dialog.getByRole('tab', { name: 'Income' }).click();
  const save = dialog.getByRole('button', { name: 'Save income' });
  await dialog.getByPlaceholder('0.00').fill('125');
  await expect(save).toBeDisabled();
  await chooseLabeledOption(page, dialog, 'Category', 'Fixture Salary');
  await dialog.getByPlaceholder('What was this for?').fill('Browser income');
  await save.click();
  await expect(dialog).toBeHidden();

  await openLedger(page);
  const row = ledgerRow(page, 'Browser income');
  await expect(row).toContainText('Fixture Salary');
  await expect(row).toContainText('Fixture Checking');
  await expect(row).toContainText('+');
  await expectAccountBalance(page, 'Fixture Checking', 2875);
  await expect(page.getByText('Income', { exact: true }).locator('..')).toContainText('2,125');
});

test('TXN-04: transfer saves between accounts without changing income or expense totals', async ({
  seededDemoPage: page,
}) => {
  await page.evaluate(() => {
    const app = window as typeof window & { useDataStore: { getState: () => DataState } };
    app.useDataStore.getState().addAccount(
      {
        name: 'Fixture Savings',
        type: 'Asset',
        initialBalance: 200,
        isSavings: true,
        isActive: true,
      },
      'Fixture Savings Method'
    );
  });

  const dialog = await openTransactionForm(page);
  await dialog.getByRole('tab', { name: 'Transfer' }).click();
  const save = dialog.getByRole('button', { name: 'Save transfer' });
  await dialog.getByPlaceholder('0.00').fill('60');
  await expect(save).toBeDisabled();
  await chooseLabeledOption(page, dialog, 'From', 'Fixture Checking · Fixture Debit Card');
  await expect(save).toBeDisabled();
  await chooseLabeledOption(page, dialog, 'To', 'Fixture Savings Method');
  await dialog.getByPlaceholder('What was this for?').fill('Browser transfer');
  await save.click();
  await expect(dialog).toBeHidden();

  await openLedger(page);
  const row = ledgerRow(page, 'Browser transfer');
  await expect(row).toContainText('Fixture Checking');
  await expect(row).toContainText('Fixture Savings');
  await expect(row).toContainText('60');
  await expectAccountBalance(page, 'Fixture Checking', 2690);
  await expectAccountBalance(page, 'Fixture Savings', 260);
  await expect(page.getByText('Income', { exact: true }).locator('..')).toContainText('2,000');
  await expect(page.getByText('Expenses', { exact: true }).locator('..')).toContainText('250');
});

test('TXN-06: split expense requires full allocation and creates a row per category', async ({
  seededDemoPage: page,
}) => {
  await page.evaluate(() => {
    const app = window as typeof window & { useDataStore: { getState: () => DataState } };
    app.useDataStore
      .getState()
      .addCategory({ group: 'Needs', head: 'Fixture Rent', isActive: true });
  });

  const dialog = await openTransactionForm(page);
  await dialog.getByPlaceholder('0.00').fill('100');
  await dialog.getByRole('button', { name: 'Split this transaction' }).click();
  const save = dialog.getByRole('button', { name: 'Save expense' });
  const splitAmounts = dialog.getByPlaceholder('Amt');
  await splitAmounts.nth(0).fill('40');
  await splitAmounts.nth(1).fill('50');
  await expect(save).toBeDisabled();

  for (const [index, category] of ['Fixture Food', 'Fixture Rent'].entries()) {
    await splitAmounts.nth(index).locator('../..').getByRole('combobox').click();
    await page.getByRole('option', { name: category, exact: true }).click();
  }
  await splitAmounts.nth(1).fill('60');
  await dialog.getByPlaceholder('What was this for?').fill('Browser split');
  await expect(dialog).toContainText('All Splits');
  await expect(save).toBeEnabled();
  await save.click();
  await expect(dialog).toBeHidden();

  await openLedger(page);
  const rows = ledgerRow(page, 'Browser split');
  await expect(rows).toHaveCount(2);
  await expect(rows.filter({ hasText: 'Fixture Food' })).toContainText('40');
  await expect(rows.filter({ hasText: 'Fixture Rent' })).toContainText('60');
  await expectAccountBalance(page, 'Fixture Checking', 2650);
});
