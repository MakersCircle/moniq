import { expect, test, type Page } from '@playwright/test';
import type { DataState } from '../src/store/types';
import { installFakeGoogle } from './fixtures/google';

const settingsState = (page: Page) =>
  page.evaluate(
    () =>
      (
        window as typeof window & { useDataStore: { getState: () => DataState } }
      ).useDataStore.getState().settings
  );
const cloudReady = (page: Page) =>
  page.waitForFunction(
    () =>
      (
        window as typeof window & { useDataStore: { getState: () => DataState } }
      ).useDataStore.getState().isCloudInitialized
  );
async function signIn(page: Page) {
  await page.goto('/');
  await page.waitForFunction(
    () => (window as unknown as { __fakeGoogleScopes?: string[] }).__fakeGoogleScopes?.length
  );
  await page.locator('.group > div.cursor-pointer').click();
  await cloudReady(page);
}

async function changePreferences(page: Page) {
  await page.evaluate(() => {
    const store = (
      window as typeof window & { useDataStore: { getState: () => DataState } }
    ).useDataStore.getState();
    store.updateSettings({ currency: 'GBP', numberLocale: 'en-GB', dateFormat: 'yyyy-MM-dd' });
  });
  // Observe durable storage before requesting an immediate document reload.
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<string | undefined>((resolve, reject) => {
            const request = indexedDB.open('moniq-db');
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              const db = request.result;
              const read = db.transaction('settings').objectStore('settings').get('dateFormat');
              read.onsuccess = () => {
                db.close();
                resolve(read.result?.value);
              };
              read.onerror = () => reject(read.error);
            };
          })
      )
    )
    .toBe('yyyy-MM-dd');
}

test('#108: explicit demo preferences survive a hard reload', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('try-demo').click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await changePreferences(page);
  await page.reload();
  await expect
    .poll(() => settingsState(page))
    .toMatchObject({
      currency: 'GBP',
      currencySymbol: '£',
      numberLocale: 'en-GB',
      dateFormat: 'yyyy-MM-dd',
    });
});

test('#108: pending preferences survive reload before their cloud upload', async ({ page }) => {
  const google = await installFakeGoogle(page);
  await signIn(page);
  await page.evaluate(() =>
    (window as typeof window & { useDataStore: { getState: () => DataState } }).useDataStore
      .getState()
      .setCloudInitialized(false)
  );
  await changePreferences(page);
  await page.reload();
  await cloudReady(page);
  await expect
    .poll(() => settingsState(page))
    .toMatchObject({ currency: 'GBP', numberLocale: 'en-GB', dateFormat: 'yyyy-MM-dd' });
  expect(google.sheetRows('Settings')).toEqual(
    expect.arrayContaining([
      expect.arrayContaining(['currency', 'GBP']),
      expect.arrayContaining(['dateFormat', 'yyyy-MM-dd']),
    ])
  );
});

test('#108: first defaults are saved to Sheets and restored on a differently localized device', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'language', {
      get: () => localStorage.getItem('test-language') || 'en-GB',
    });
    Object.defineProperty(navigator, 'languages', { get: () => [navigator.language] });
  });
  const google = await installFakeGoogle(page);
  await signIn(page);
  const canonical = await settingsState(page);
  expect(canonical).toMatchObject({
    currency: 'GBP',
    numberLocale: 'en-GB',
    dateFormat: 'dd/MM/yyyy',
  });
  expect(google.sheetRows('Settings')).toEqual(
    expect.arrayContaining([expect.arrayContaining(['currency', 'GBP'])])
  );
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        localStorage.setItem('test-language', 'en-US');
        const request = indexedDB.open('moniq-db');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction('settings', 'readwrite');
          transaction.objectStore('settings').clear();
          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        };
      })
  );
  await page.reload();
  await cloudReady(page);
  expect(await settingsState(page)).toEqual(canonical);
});
