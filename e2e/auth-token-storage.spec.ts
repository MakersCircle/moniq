import { expect, test } from '@playwright/test';
import type { DataState } from '../src/store/types';
import { installFakeGoogle } from './fixtures/google';

test('#97: credentials survive reload but are removed from durable storage and absent in a fresh tab', async ({
  page,
  context,
}) => {
  await installFakeGoogle(page);
  await page.goto('/');
  await page.waitForFunction(
    () => (window as unknown as { __fakeGoogleScopes?: string[] }).__fakeGoogleScopes?.length
  );
  await page.locator('.group > div.cursor-pointer').click();
  await page.waitForFunction(
    () =>
      (
        window as typeof window & { useDataStore: { getState: () => DataState } }
      ).useDataStore.getState().isCloudInitialized
  );
  expect(
    await page.evaluate(
      () => JSON.parse(sessionStorage.getItem('moniq.oauth-session') || '{}').accessToken
    )
  ).toBe('fake-access-token');
  // Simulate credentials left on disk by an older release.
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('moniq-db');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction('meta', 'readwrite');
          transaction.objectStore('meta').put({ key: 'accessToken', value: 'legacy-secret' });
          transaction
            .objectStore('meta')
            .put({ key: 'tokenExpiresAt', value: String(Date.now() + 3600000) });
          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
        };
      })
  );
  await page.reload();
  await page.waitForFunction(
    () =>
      (
        window as typeof window & { useDataStore: { getState: () => DataState } }
      ).useDataStore.getState().isHydrated
  );
  expect(
    await page.evaluate(
      () =>
        (
          window as typeof window & { useDataStore: { getState: () => DataState } }
        ).useDataStore.getState().accessToken
    )
  ).toBe('fake-access-token');
  expect(
    await page.evaluate(
      () =>
        new Promise<unknown[]>((resolve, reject) => {
          const request = indexedDB.open('moniq-db');
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction('meta');
            const token = transaction.objectStore('meta').get('accessToken');
            const expiry = transaction.objectStore('meta').get('tokenExpiresAt');
            transaction.oncomplete = () => {
              db.close();
              resolve([token.result ?? null, expiry.result ?? null]);
            };
          };
        })
    )
  ).toEqual([null, null]);
  const freshTab = await context.newPage();
  await installFakeGoogle(freshTab);
  await freshTab.goto('/');
  await freshTab.waitForFunction(
    () =>
      (
        window as typeof window & { useDataStore: { getState: () => DataState } }
      ).useDataStore.getState().isHydrated
  );
  expect(
    await freshTab.evaluate(() => ({
      token: (
        window as typeof window & { useDataStore: { getState: () => DataState } }
      ).useDataStore.getState().accessToken,
      stored: sessionStorage.getItem('moniq.oauth-session'),
    }))
  ).toEqual({ token: null, stored: null });
  await freshTab.close();
});
