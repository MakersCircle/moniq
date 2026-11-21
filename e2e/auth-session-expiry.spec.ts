import { expect, test } from '@playwright/test';
import type { DataState } from '../src/store/types';
import { installFakeGoogle } from './fixtures/google';

test('AUTH-05: an expired session allows local recording and Reconnect uploads queued changes', async ({
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

  await page.evaluate(() =>
    (window as typeof window & { useDataStore: { getState: () => DataState } }).useDataStore
      .getState()
      .setDeviceTrusted(true)
  );
  const accountId = await page.evaluate(() => {
    const store = (
      window as typeof window & { useDataStore: { getState: () => DataState } }
    ).useDataStore.getState();
    return store.addAccount({
      name: 'Expiry Checking',
      type: 'Asset',
      initialBalance: 500,
      isSavings: false,
      excludeFromNet: false,
      isActive: true,
    }).accountId;
  });
  await expect
    .poll(() => google.sheetRows('Accounts').some(row => row[0] === accountId))
    .toBe(true);

  const settingsLink =
    (page.viewportSize()?.width ?? 0) >= 1024
      ? page.locator('aside a[href="/settings"]')
      : page.locator('header a[href="/settings"]');
  await settingsLink.click();
  await page.locator('a[href="/settings/accounts"]').click();
  await expect(page.getByText('Expiry Checking')).toBeVisible();

  await google.failSilentRefresh();
  await page.evaluate(() => {
    (window as typeof window & { useDataStore: { getState: () => DataState } }).useDataStore
      .getState()
      .setAccessToken('fake-access-token', Date.now() - 1000);
  });

  await expect(
    page.getByRole('status', { name: 'Google sync paused. Saved on this device.' })
  ).toBeVisible();
  await expect(page.getByText('Expiry Checking')).toBeVisible();
  // The compact message and action occupy one row even on narrow phones.
  if ((page.viewportSize()?.width ?? 0) < 640) {
    await page.setViewportSize({ width: 320, height: 740 });
    const banner = page.getByRole('status', { name: 'Google sync paused. Saved on this device.' });
    const message = await banner.locator('p').boundingBox();
    const action = await banner.getByRole('button', { name: 'Reconnect Google' }).boundingBox();
    expect(message).not.toBeNull();
    expect(action).not.toBeNull();
    expect(
      Math.abs(message!.y + message!.height / 2 - (action!.y + action!.height / 2))
    ).toBeLessThan(2);
    expect(action!.x + action!.width).toBeLessThanOrEqual(320);
    expect((await banner.boundingBox())!.height).toBeLessThanOrEqual(48);
  }
  expect(
    await page.evaluate(
      () =>
        (
          window as typeof window & { useDataStore: { getState: () => DataState } }
        ).useDataStore.getState().accessToken
    )
  ).toBeNull();
  await page.evaluate(() => {
    const store = (
      window as typeof window & { useDataStore: { getState: () => DataState } }
    ).useDataStore.getState();
    store.addCategory({ head: 'Offline Food', group: 'Needs', isActive: true });
  });
  // Use the actual form while Google authorization is absent.
  await page.evaluate(() => window.openTransactionModal?.openNew());
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByPlaceholder('0.00').fill('25');
  await dialog.getByText('Category', { exact: true }).locator('..').getByRole('combobox').click();
  await page.getByRole('option', { name: 'Offline Food', exact: true }).click();
  await dialog.getByPlaceholder('What was this for?').fill('Recorded while disconnected');
  await dialog.getByRole('button', { name: 'Save expense' }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole('status', { name: 'Google sync paused. Saved on this device.' })
  ).toContainText(/changes waiting to sync/);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Reconnect Google' })).toBeVisible();
  expect(
    google.sheetRows('Transactions').some(row => row.includes('Recorded while disconnected'))
  ).toBe(false);

  await page.getByRole('button', { name: 'Reconnect Google' }).click();
  await expect(
    page.getByRole('status', { name: 'Google sync paused. Saved on this device.' })
  ).toBeHidden();
  await expect(page.getByText('Expiry Checking')).toBeVisible();
  await expect
    .poll(
      () =>
        google.authorizedRequests.filter(request => request === 'GET /oauth2/v3/userinfo').length
    )
    .toBeGreaterThanOrEqual(2);
  await expect
    .poll(() =>
      google.sheetRows('Transactions').some(row => row.includes('Recorded while disconnected'))
    )
    .toBe(true);
  expect(google.createdSpreadsheets.filter(name => name === 'Moniq Database')).toHaveLength(1);
  expect(google.unexpectedRequests).toEqual([]);
});

test('AUTH-05: a valid token stays usable until expiry without background authorization', async ({
  page,
}) => {
  await page.clock.install();
  const google = await installFakeGoogle(page);
  await page.goto('/');
  await page.waitForFunction(
    () => (window as unknown as { __fakeGoogleScopes?: string[] }).__fakeGoogleScopes?.length
  );
  await page.locator('.group > div.cursor-pointer').click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Welcome to Moniq' })).toBeVisible();

  await google.failSilentRefresh();
  await page.evaluate(() => {
    (window as typeof window & { useDataStore: { getState: () => DataState } }).useDataStore
      .getState()
      .setAccessToken('fake-access-token', Date.now() + 90_000);
  });

  await expect(page.getByRole('heading', { name: 'Welcome to Moniq' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reconnect Google' })).toBeHidden();
  const loginCount = await page.evaluate(
    () => (window as unknown as { __fakeGoogleLoginCount: number }).__fakeGoogleLoginCount
  );
  await page.clock.fastForward(120_000);
  expect(
    await page.evaluate(
      () => (window as unknown as { __fakeGoogleLoginCount: number }).__fakeGoogleLoginCount
    )
  ).toBe(loginCount);
  await expect(page.getByRole('button', { name: 'Reconnect Google' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Welcome to Moniq' })).toBeVisible();
  expect(google.unexpectedRequests).toEqual([]);
});

test('E-23: an expired session reloads into cached data and can still sign out', async ({
  page,
}) => {
  await page.addInitScript(() => {
    (
      window as typeof window & { __fakeGoogleFailSilentRefresh: boolean }
    ).__fakeGoogleFailSilentRefresh = true;
  });
  const google = await installFakeGoogle(page);
  await page.goto('/');
  await page.waitForFunction(
    () => (window as unknown as { __fakeGoogleScopes?: string[] }).__fakeGoogleScopes?.length
  );
  await page.locator('.group > div.cursor-pointer').click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.waitForFunction(
    () =>
      (
        window as typeof window & { useDataStore: { getState: () => DataState } }
      ).useDataStore.getState().isWorkspaceUnlocked
  );
  await page.evaluate(() =>
    (window as typeof window & { useDataStore: { getState: () => DataState } }).useDataStore
      .getState()
      .setDeviceTrusted(true)
  );
  const accountId = await page.evaluate(() => {
    const store = (
      window as typeof window & { useDataStore: { getState: () => DataState } }
    ).useDataStore.getState();
    return store.addAccount({
      name: 'Cached After Expiry',
      type: 'Asset',
      initialBalance: 500,
      isSavings: false,
      excludeFromNet: false,
      isActive: true,
    }).accountId;
  });
  await expect
    .poll(() => google.sheetRows('Accounts').some(row => row[0] === accountId))
    .toBe(true);

  const expiredAt = Date.now() - 1000;
  await page.evaluate(expiresAt => {
    sessionStorage.setItem(
      'moniq.oauth-session',
      JSON.stringify({ accessToken: 'fake-access-token', expiresAt })
    );
  }, expiredAt);

  await page.reload();
  await expect(
    page.getByRole('status', { name: 'Google sync paused. Saved on this device.' })
  ).toBeVisible();
  const settingsLink =
    (page.viewportSize()?.width ?? 0) >= 1024
      ? page.locator('aside a[href="/settings"]')
      : page.locator('header a[href="/settings"]');
  await settingsLink.first().click();
  await page.locator('a[href="/settings/accounts"]').click();
  await expect(page.getByText('Cached After Expiry')).toBeVisible();

  await page.getByRole('link', { name: 'General' }).click();
  await page.getByRole('button', { name: /^sign out$/i }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('Sign in with Google')).toBeVisible();
  await expect(page.getByText('Cached After Expiry')).toBeHidden();
  await page.reload();
  await expect(page.getByText('Sign in with Google')).toBeVisible();
  expect(google.unexpectedRequests).toEqual([]);
});

test('AUTH-05: reconnecting a different Google account preserves this device records and queue', async ({
  page,
}) => {
  const google = await installFakeGoogle(page);
  await page.goto('/');
  await page.waitForFunction(
    () => (window as unknown as { __fakeGoogleScopes?: string[] }).__fakeGoogleScopes?.length
  );
  await page.locator('.group > div.cursor-pointer').click();
  await expect(page.getByRole('heading', { name: 'Welcome to Moniq' })).toBeVisible();
  await page.evaluate(() => {
    const store = (
      window as typeof window & { useDataStore: { getState: () => DataState } }
    ).useDataStore.getState();
    store.expireSession();
    store.addAccount({
      name: 'Unsynced Original Account',
      type: 'Asset',
      initialBalance: 40,
      isSavings: false,
      isActive: true,
    });
  });
  await expect(
    page.getByRole('status', { name: 'Google sync paused. Saved on this device.' })
  ).toContainText(/changes waiting to sync/);
  google.setUserEmail('other@example.test');
  await page.getByRole('button', { name: 'Reconnect Google' }).click();
  await expect(
    page.getByText("Reconnect with browser@example.test to sync this device's records.")
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reconnect Google' })).toBeVisible();
  expect(
    await page.evaluate(() => {
      const store = (
        window as typeof window & { useDataStore: { getState: () => DataState } }
      ).useDataStore.getState();
      return {
        email: store.userProfile?.email,
        names: store.accounts.map(account => account.name),
        pending: store.pendingCount,
      };
    })
  ).toMatchObject({
    email: 'browser@example.test',
    names: ['Unsynced Original Account'],
    pending: 2,
  });
  expect(google.sheetRows('Accounts').some(row => row.includes('Unsynced Original Account'))).toBe(
    false
  );
  google.setUserEmail('browser@example.test');
  await page.getByRole('button', { name: 'Reconnect Google' }).click();
  await expect
    .poll(() => google.sheetRows('Accounts').some(row => row.includes('Unsynced Original Account')))
    .toBe(true);
  expect(google.unexpectedRequests).toEqual([]);
});
