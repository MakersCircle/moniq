import type { Page } from '@playwright/test';
import type { DataState } from '../src/store/types';
import { test, expect } from './fixtures/demo';

function ledgerRow(page: Page, note: string) {
  return page.locator('div.cursor-pointer').filter({ hasText: note });
}

async function openExpenseDetails(page: Page) {
  await page.goto('/transactions');
  await ledgerRow(page, 'Fixture groceries').click();
  const panel = page.getByRole('heading', { name: 'Transaction Details' }).locator('../..');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('Fixture Checking');
  await expect(panel).toContainText('Fixture Food');
  return panel;
}

test('LEDGER-07: editing updates one transaction, its category, and its balance', async ({
  seededDemoPage: page,
}) => {
  await page.evaluate(() => {
    const app = window as typeof window & { useDataStore: { getState: () => DataState } };
    app.useDataStore
      .getState()
      .addCategory({ group: 'Needs', head: 'Fixture Rent', isActive: true });
  });

  const panel = await openExpenseDetails(page);
  await panel.getByRole('button', { name: 'Edit' }).click();
  const editPanel = page.getByRole('heading', { name: 'Edit Transaction' }).locator('../..');
  await expect(editPanel.getByPlaceholder('0.00')).toHaveValue('250');
  await expect(editPanel.getByPlaceholder('What was this for?')).toHaveValue('Fixture groceries');

  await editPanel.getByPlaceholder('0.00').fill('350');
  await editPanel
    .getByText('Category', { exact: true })
    .locator('..')
    .getByRole('combobox')
    .click();
  await page.getByRole('option', { name: 'Fixture Rent', exact: true }).click();
  await editPanel.getByPlaceholder('What was this for?').fill('Browser edited groceries');
  await expect(editPanel.getByText('Expected Balance:')).toContainText('2,650');
  await editPanel.getByRole('button', { name: 'Save expense' }).click();

  await expect(page.getByRole('heading', { name: 'Transaction Details' })).toBeVisible();
  await expect(ledgerRow(page, 'Browser edited groceries')).toContainText('Fixture Rent');
  await expect(ledgerRow(page, 'Browser edited groceries')).toContainText('350');
  await expect(ledgerRow(page, 'Fixture groceries')).toHaveCount(0);
  await expect(ledgerRow(page, 'Fixture paycheck')).toHaveCount(1);

  await page.reload();
  await expect(ledgerRow(page, 'Browser edited groceries')).toHaveCount(1);
  await expect(ledgerRow(page, 'Fixture groceries')).toHaveCount(0);
  await page.goto('/dashboard');
  await expect(
    page.getByText('Fixture Checking', { exact: true }).first().locator('../..')
  ).toContainText('2,650');
  await expect(page.getByText('Fixture Rent', { exact: true }).first().locator('..')).toContainText(
    '350'
  );
});

test('LEDGER-08: deleting removes the active row and keeps it in Recently Deleted', async ({
  seededDemoPage: page,
}) => {
  const panel = await openExpenseDetails(page);
  await panel.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('heading', { name: 'Transaction Details' })).toHaveCount(0);
  await expect(ledgerRow(page, 'Fixture groceries')).toHaveCount(0);
  await expect(ledgerRow(page, 'Fixture paycheck')).toHaveCount(1);

  await page.reload();
  await expect(ledgerRow(page, 'Fixture groceries')).toHaveCount(0);
  await page.goto('/dashboard');
  await expect(
    page.getByText('Fixture Checking', { exact: true }).first().locator('../..')
  ).toContainText('3,000');

  await page.goto('/settings/trash');
  await expect(page.getByRole('heading', { name: 'Recently Deleted' })).toBeVisible();
  await expect(page.getByRole('row', { name: /Fixture groceries/ })).toContainText('250');
});
