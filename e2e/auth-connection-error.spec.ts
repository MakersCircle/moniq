import { expect, test, type Page } from '@playwright/test';
import { installFakeGoogle } from './fixtures/google';

async function signIn(page: Page) {
  await page.goto('/');
  await page.waitForFunction(
    () => (window as unknown as { __fakeGoogleScopes?: string[] }).__fakeGoogleScopes?.length
  );
  await page.locator('.group > div.cursor-pointer').click();
}

test('AUTH-06: a failed Sheets initialization stays gated and Retry Connection recovers', async ({
  page,
}) => {
  const google = await installFakeGoogle(page);
  google.failNextBatchGet();
  await signIn(page);

  await expect(page.getByRole('heading', { name: 'Connection Error' })).toBeVisible();
  await expect(page.getByText(/Could not reconcile data with Google Sheets/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Welcome to Moniq' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();
  expect(google.failedBatchGets).toBe(1);

  await page.getByRole('button', { name: 'Retry Connection' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Welcome to Moniq' })).toBeVisible();
  expect(google.createdSpreadsheets.filter(name => name === 'Moniq Database')).toHaveLength(1);
  expect(google.unexpectedRequests).toEqual([]);
});

test('AUTH-06: Sign Out from a failed initialization returns to the landing page', async ({
  page,
}) => {
  const google = await installFakeGoogle(page);
  google.failNextBatchGet();
  await signIn(page);

  await expect(page.getByRole('heading', { name: 'Connection Error' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign Out' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('Sign in with Google')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Connection Error' })).toBeHidden();

  await page.reload();
  await expect(page.getByText('Sign in with Google')).toBeVisible();
  expect(google.failedBatchGets).toBe(1);
  expect(google.unexpectedRequests).toEqual([]);
});
