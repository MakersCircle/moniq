import { expect, test } from '@playwright/test';
import type { DataState } from '../src/store/types';
import { installFakeGoogle } from './fixtures/google';

test('E-21: cached data stays local while a returning user retries a persistent Sheets outage', async ({
  page,
}) => {
  const google = await installFakeGoogle(page);
  await page.goto('/');
  await page.waitForFunction(
    () => (window as unknown as { __fakeGoogleScopes?: string[] }).__fakeGoogleScopes?.length
  );
  await page.locator('.group > div.cursor-pointer').click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Welcome to Moniq' })).toBeVisible();

  const accountId = await page.evaluate(() => {
    const store = (
      window as typeof window & { useDataStore: { getState: () => DataState } }
    ).useDataStore.getState();
    return store.addAccount({
      name: 'Offline Cached Checking',
      type: 'Asset',
      initialBalance: 900,
      isSavings: false,
      excludeFromNet: false,
      isActive: true,
    }).accountId;
  });
  await expect
    .poll(() => google.sheetRows('Accounts').some(row => row[0] === accountId))
    .toBe(true);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<number>((resolve, reject) => {
            const request = indexedDB.open('moniq-db');
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              const db = request.result;
              const count = db.transaction('accounts', 'readonly').objectStore('accounts').count();
              count.onerror = () => reject(count.error);
              count.onsuccess = () => {
                db.close();
                resolve(count.result);
              };
            };
          })
      )
    )
    .toBe(1);

  google.setSheetsUnavailable(true);
  await page.reload();

  await expect(page.getByRole('heading', { name: 'Connection Error' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Welcome to Moniq' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Retry Connection' })).toBeVisible();
  const cachedState = await page.evaluate(() => {
    const store = (
      window as typeof window & { useDataStore: { getState: () => DataState } }
    ).useDataStore.getState();
    return {
      names: store.accounts.map(account => account.name),
      cloudInitialized: store.isCloudInitialized,
    };
  });
  expect(cachedState.names).toContain('Offline Cached Checking');
  expect(cachedState.cloudInitialized).toBe(false);
  expect(google.failedBatchGets).toBeGreaterThanOrEqual(1);

  await page.getByRole('button', { name: 'Retry Connection' }).click();
  await expect.poll(() => google.failedBatchGets).toBeGreaterThanOrEqual(2);
  await expect(page.getByRole('heading', { name: 'Connection Error' })).toBeVisible();

  google.setSheetsUnavailable(false);
  await page.getByRole('button', { name: 'Retry Connection' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome to Moniq' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Connection Error' })).toBeHidden();
  await expect
    .poll(() => google.sheetRows('Accounts').some(row => row[0] === accountId))
    .toBe(true);
  expect(google.createdSpreadsheets.filter(name => name === 'Moniq Database')).toHaveLength(1);
  expect(google.unexpectedRequests).toEqual([]);
});
