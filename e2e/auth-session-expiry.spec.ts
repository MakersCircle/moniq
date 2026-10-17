import { expect, test } from '@playwright/test';
import type { DataState } from '../src/store/types';
import { installFakeGoogle } from './fixtures/google';

test('AUTH-05: an expired session keeps local data visible and Reconnect restores cloud access', async ({
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

  await expect(page.getByText(/Session expired\. Your changes won't sync/)).toBeVisible();
  await expect(page.getByText('Expiry Checking')).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (
          window as typeof window & { useDataStore: { getState: () => DataState } }
        ).useDataStore.getState().accessToken
    )
  ).toBeNull();
  await page.waitForFunction(
    () =>
      ((window as unknown as { __fakeGoogleScopes?: string[] }).__fakeGoogleScopes?.length || 0) >=
      2
  );

  await page.getByRole('button', { name: 'Reconnect' }).click();
  await expect(page.getByText(/Session expired\. Your changes won't sync/)).toBeHidden();
  await expect(page.getByText('Expiry Checking')).toBeVisible();
  await expect
    .poll(
      () =>
        google.authorizedRequests.filter(request => request === 'GET /oauth2/v3/userinfo').length
    )
    .toBeGreaterThanOrEqual(2);
  expect(google.createdSpreadsheets.filter(name => name === 'Moniq Database')).toHaveLength(1);
  expect(google.unexpectedRequests).toEqual([]);
});

test('AUTH-05: a failed silent refresh keeps a valid token until it actually expires', async ({
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
  await expect(page.getByRole('button', { name: 'Reconnect' })).toBeHidden();
  await page.clock.fastForward(120_000);
  await expect(page.getByRole('button', { name: 'Reconnect' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Welcome to Moniq' })).toBeVisible();
  expect(google.unexpectedRequests).toEqual([]);
});
