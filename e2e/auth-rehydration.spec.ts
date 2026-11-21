import { expect, test } from '@playwright/test';
import { serializeAccount } from '../src/schema/entities/account.schema';
import type { Account } from '../src/types';
import type { DataState } from '../src/store/types';
import { installFakeGoogle } from './fixtures/google';

test('AUTH-04: reload opens local data immediately and reconciles remote changes in the background', async ({
  page,
}) => {
  const google = await installFakeGoogle(page);
  await page.goto('/');
  await page.waitForFunction(
    () => (window as unknown as { __fakeGoogleScopes?: string[] }).__fakeGoogleScopes?.length
  );
  await page.locator('.group > div.cursor-pointer').click();
  await expect(page.getByRole('heading', { name: 'Welcome to Moniq' })).toBeVisible();

  const localAccount = await page.evaluate(() => {
    const store = (
      window as typeof window & { useDataStore: { getState: () => DataState } }
    ).useDataStore.getState();
    const { accountId } = store.addAccount({
      name: 'Local Checking',
      type: 'Asset',
      initialBalance: 1200,
      isSavings: false,
      excludeFromNet: false,
      isActive: true,
    });
    return (window as typeof window & { useDataStore: { getState: () => DataState } }).useDataStore
      .getState()
      .accounts.find(account => account.id === accountId)!;
  });

  await expect
    .poll(() => google.sheetRows('Accounts').some(row => row[0] === localAccount.id))
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

  const remoteAccount: Account = {
    ...localAccount,
    id: 'remote-account',
    name: 'Remote Savings',
    initialBalance: 3000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  google.appendSheetRow('Accounts', serializeAccount(remoteAccount));

  const hold = google.holdNextBatchGet();
  await page.reload();
  await hold.requested;

  await expect(page.getByRole('heading', { name: 'Welcome to Moniq' })).toBeVisible();
  const hydrated = await page.evaluate(() => {
    const store = (
      window as typeof window & { useDataStore: { getState: () => DataState } }
    ).useDataStore.getState();
    return { names: store.accounts.map(account => account.name), ready: store.isCloudInitialized };
  });
  expect(hydrated.names).toContain('Local Checking');
  expect(hydrated.names).not.toContain('Remote Savings');
  expect(hydrated.ready).toBe(false);

  const addedDuringPull = await page.evaluate(() => {
    const store = (
      window as typeof window & { useDataStore: { getState: () => DataState } }
    ).useDataStore.getState();
    store.updateAccount(store.accounts[0].id, { name: 'Edited During Pull' });
    return store.addAccount({
      name: 'Added During Pull',
      type: 'Asset',
      initialBalance: 20,
      isSavings: false,
      isActive: true,
    }).accountId;
  });
  hold.release();
  await expect
    .poll(() => google.sheetRows('Accounts').some(row => row[0] === addedDuringPull))
    .toBe(true);
  await expect(page.getByRole('heading', { name: 'Welcome to Moniq' })).toBeVisible();
  const reconciled = await page.evaluate(() => {
    const store = (
      window as typeof window & { useDataStore: { getState: () => DataState } }
    ).useDataStore.getState();
    return store.accounts.map(account => account.name);
  });
  expect(reconciled).toEqual(
    expect.arrayContaining(['Edited During Pull', 'Added During Pull', 'Remote Savings'])
  );

  const settingsLink =
    (page.viewportSize()?.width ?? 0) >= 1024
      ? page.locator('aside a[href="/settings"]')
      : page.locator('header a[href="/settings"]');
  await settingsLink.click();
  await page.locator('a[href="/settings/accounts"]').click();
  await expect(page.getByText('Edited During Pull')).toBeVisible();
  await expect(page.getByText('Remote Savings')).toBeVisible();
  expect(google.unexpectedRequests).toEqual([]);
});
