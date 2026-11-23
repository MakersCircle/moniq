import { expect, test, type Page } from '@playwright/test';
import type { DataState } from '../src/store/types';
import { installFakeGoogle } from './fixtures/google';

async function establishWorkspace(page: Page) {
  const google = await installFakeGoogle(page);
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
  const id = await page.evaluate(
    () =>
      (window as typeof window & { useDataStore: { getState: () => DataState } }).useDataStore
        .getState()
        .addAccount({
          name: 'Private Checking',
          type: 'Asset',
          initialBalance: 1234,
          isActive: true,
          isSavings: false,
        }).accountId
  );
  await expect.poll(() => google.sheetRows('Accounts').some(row => row[0] === id)).toBe(true);
  await page.goto('/settings/accounts');
  await expect(page.getByText('Private Checking')).toBeVisible();
  return google;
}

test('#91: shared devices hide records and transaction entry until fresh profile verification completes', async ({
  page,
}) => {
  const google = await establishWorkspace(page);
  const hold = google.holdNextUserInfo();
  await page.reload();
  await hold.requested;
  await expect(page.getByRole('heading', { name: 'Unlock your workspace' })).toBeVisible();
  await expect(page.getByText('Private Checking')).toBeHidden();
  await expect(page.getByRole('button', { name: 'New Transaction' })).toBeHidden();
  await expect(page.getByRole('dialog')).toBeHidden();
  hold.release();
  await expect(page.getByText('Private Checking')).toBeVisible();
  expect(google.unexpectedRequests).toEqual([]);
});

test('verified unlock waits for the initial Sheets pull before showing the workspace', async ({
  page,
}) => {
  const google = await establishWorkspace(page);
  const transactionNote = 'Cloud transaction after unlock';
  const transactionId = await page.evaluate(note => {
    const store = (window as typeof window & { useDataStore: { getState: () => DataState } })
      .useDataStore;
    const { id: categoryId } = store
      .getState()
      .addCategory({ head: 'Unlock Test', group: 'Needs', isActive: true });
    const accountId = store
      .getState()
      .accounts.find(account => account.name === 'Private Checking')!.id;
    store.getState().addTransaction({
      date: '2026-11-21',
      uiType: 'expense',
      amount: 25,
      accountId,
      targetId: categoryId,
      note,
    });
    return store.getState().transactions.find(transaction => transaction.note === note)!.id;
  }, transactionNote);
  await expect
    .poll(() => google.sheetRows('Transactions').some(row => row.includes(transactionNote)))
    .toBe(true);

  // Reproduce an installed device whose local cache missed a cloud transaction.
  await page.evaluate(
    id =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('moniq-db');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction('transactions', 'readwrite');
          transaction.objectStore('transactions').delete(id);
          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        };
      }),
    transactionId
  );
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Unlock your workspace' })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as typeof window & { useDataStore: { getState: () => DataState } }
          ).useDataStore.getState().transactions.length
      )
    )
    .toBe(0);
  const hold = google.holdNextBatchGet();
  await page.getByRole('button', { name: 'Unlock with Google' }).click();
  await hold.requested;

  await expect(page.getByText('Pulling your data from Google Drive...')).toBeVisible();
  await expect(page.getByText(transactionNote)).toBeHidden();
  hold.release();
  await page.waitForFunction(
    () =>
      (
        window as typeof window & { useDataStore: { getState: () => DataState } }
      ).useDataStore.getState().isCloudInitialized
  );
  await page.goto('/transactions');
  await expect(page.getByText(transactionNote)).toBeVisible();
});

test('#91: a failed profile verification keeps financial data locked and Retry recovers', async ({
  page,
}) => {
  const google = await establishWorkspace(page);
  google.setProfileUnavailable(true);
  await page.reload();
  await expect(
    page.getByText('Could not verify your account. Check your connection and try again.')
  ).toBeVisible();
  await expect(page.getByText('Private Checking')).toBeHidden();
  google.setProfileUnavailable(false);
  await page.getByRole('button', { name: 'Retry verification' }).click();
  await expect(page.getByText('Private Checking')).toBeVisible();
});

test('#91: wrong-account unlock cannot grant trust; correct-account trust permits local access until revoked', async ({
  page,
}) => {
  const google = await establishWorkspace(page);
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Unlock your workspace' })).toBeVisible();
  await expect(page.getByText('Private Checking')).toBeHidden();
  await page.getByRole('checkbox', { name: 'Trust this device' }).check();
  google.setUserEmail('other@example.test');
  await page.getByRole('button', { name: 'Unlock with Google' }).click();
  await expect(
    page.getByText("Reconnect with browser@example.test to sync this device's records.")
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Unlock your workspace' })).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (
          window as typeof window & { useDataStore: { getState: () => DataState } }
        ).useDataStore.getState().isDeviceTrusted
    )
  ).toBe(false);
  google.setUserEmail('browser@example.test');
  await page.getByRole('button', { name: 'Unlock with Google' }).click();
  await expect(page.getByText('Private Checking')).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as typeof window & { useDataStore: { getState: () => DataState } }
          ).useDataStore.getState().isDeviceTrusted
      )
    )
    .toBe(true);
  await page.waitForFunction(
    () =>
      (
        window as typeof window & { useDataStore: { getState: () => DataState } }
      ).useDataStore.getState().isCloudInitialized
  );
  google.setProfileUnavailable(true);
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await expect(page.getByText('Private Checking')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reconnect Google' })).toBeVisible();
  await page.getByRole('link', { name: 'General', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Trust this device' }).uncheck();
  await expect(page.getByRole('checkbox', { name: 'Trust this device' })).toBeEnabled();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as typeof window & { useDataStore: { getState: () => DataState } }
          ).useDataStore.getState().isDeviceTrusted
      )
    )
    .toBe(false);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Unlock your workspace' })).toBeVisible();
  await expect(page.getByText('Private Checking')).toBeHidden();
});
