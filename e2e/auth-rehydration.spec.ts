import { expect, test } from '@playwright/test';
import { deserializeTransaction } from '../src/schema/entities/transaction.schema';
import { serializeAccount } from '../src/schema/entities/account.schema';
import type { Account } from '../src/types';
import type { DataState } from '../src/store/types';
import { installFakeGoogle } from './fixtures/google';

test('AUTH-04: reload keeps the workspace gated until the initial Sheets pull completes', async ({
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

  await expect(page.getByText('Pulling your data from Google Drive...')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Welcome to Moniq' })).toBeHidden();
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
  await expect(page.getByRole('heading', { name: 'Welcome to Moniq' })).toBeVisible();
  await expect
    .poll(() => google.sheetRows('Accounts').some(row => row[0] === addedDuringPull))
    .toBe(true);
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

test('SYNC-06/#92: edits, deletes and creates during reconciliation upload survive commit and reload', async ({
  page,
}) => {
  const google = await installFakeGoogle(page);
  await page.goto('/');
  await page.waitForFunction(
    () => (window as unknown as { __fakeGoogleScopes?: string[] }).__fakeGoogleScopes?.length
  );
  await page.locator('.group > div.cursor-pointer').click();
  await expect(page.getByRole('heading', { name: 'Welcome to Moniq' })).toBeVisible();
  const ids = await page.evaluate(() => {
    const store = (window as typeof window & { useDataStore: { getState: () => DataState } })
      .useDataStore;
    store.getState().expireSession();
    const { accountId } = store.getState().addAccount({
      name: 'Race Checking',
      type: 'Asset',
      initialBalance: 500,
      isActive: true,
      isSavings: false,
    });
    const { id: categoryId } = store
      .getState()
      .addCategory({ head: 'Race Food', group: 'Needs', isActive: true });
    for (const note of ['Before edit', 'Before delete'])
      store.getState().addTransaction({
        date: '2026-11-21',
        uiType: 'expense',
        amount: 20,
        accountId,
        targetId: categoryId,
        note,
      });
    return {
      accountId,
      categoryId,
      editId: store.getState().transactions.find(transaction => transaction.note === 'Before edit')!
        .id,
      deleteId: store
        .getState()
        .transactions.find(transaction => transaction.note === 'Before delete')!.id,
    };
  });
  const hold = google.holdNextAppend('Transactions');
  await page.getByRole('button', { name: 'Reconnect Google' }).click();
  await hold.requested;
  // The engine has already captured local arrays and queue IDs at this point.
  const createdId = await page.evaluate(({ accountId, categoryId, editId, deleteId }) => {
    const store = (window as typeof window & { useDataStore: { getState: () => DataState } })
      .useDataStore;
    store.getState().updateTransaction(editId, { note: 'Edited during upload' });
    store.getState().deleteTransaction(deleteId);
    store.getState().addTransaction({
      date: '2026-11-21',
      uiType: 'expense',
      amount: 30,
      accountId,
      targetId: categoryId,
      note: 'Created during upload',
    });
    return store
      .getState()
      .transactions.find(transaction => transaction.note === 'Created during upload')!.id;
  }, ids);
  hold.release();
  await expect
    .poll(() => {
      const rows = google.sheetRows('Transactions');
      const transactions = rows.slice(1).map(row => deserializeTransaction(row, rows[0]));
      return {
        edited: transactions.find(transaction => transaction.id === ids.editId)?.note,
        deleted: transactions.find(transaction => transaction.id === ids.deleteId)?.isDeleted,
        created: transactions.find(transaction => transaction.id === createdId)?.note,
      };
    })
    .toEqual({ edited: 'Edited during upload', deleted: true, created: 'Created during upload' });
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const store = (
          window as typeof window & { useDataStore: { getState: () => DataState } }
        ).useDataStore.getState();
        return store.transactions.map(transaction => ({
          note: transaction.note,
          deleted: transaction.isDeleted,
        }));
      })
    )
    .toEqual(
      expect.arrayContaining([
        { note: 'Edited during upload', deleted: false },
        { note: 'Before delete', deleted: true },
        { note: 'Created during upload', deleted: false },
      ])
    );
  const rows = google.sheetRows('Transactions').slice(1);
  expect(new Set(rows.map(row => row[0])).size).toBe(rows.length);
  expect(google.unexpectedRequests).toEqual([]);
});
