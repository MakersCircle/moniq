import { expect, test } from '@playwright/test';
import { installFakeGoogle } from './fixtures/google';

test('Google sign-in requests the expected scopes and provisions a new cloud database', async ({
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
  const oauth = await page.evaluate(() => ({
    count: (window as unknown as { __fakeGoogleLoginCount: number }).__fakeGoogleLoginCount,
    scopes: (window as unknown as { __fakeGoogleScopes: string[] }).__fakeGoogleScopes,
  }));
  expect(oauth.count).toBe(1);
  expect(oauth.scopes.join(' ')).toContain('https://www.googleapis.com/auth/drive.file');
  expect(oauth.scopes.join(' ')).toContain('https://www.googleapis.com/auth/userinfo.profile');
  expect(oauth.scopes.join(' ')).toContain('https://www.googleapis.com/auth/userinfo.email');
  expect(google.createdFolders).toContain('moniq');
  expect(google.createdSpreadsheets).toContain('Moniq Database');
  expect(google.authorizedRequests).toContain('GET /oauth2/v3/userinfo');
  expect(google.authorizedRequests.some(request => request.includes('/drive/v3/files'))).toBe(true);
  expect(google.authorizedRequests.some(request => request.includes('/v4/spreadsheets/'))).toBe(
    true
  );
  expect(google.unexpectedRequests).toEqual([]);

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Welcome to Moniq' })).toBeVisible();
  expect(google.createdFolders.filter(name => name === 'moniq')).toHaveLength(1);
  expect(google.createdSpreadsheets.filter(name => name === 'Moniq Database')).toHaveLength(1);
  expect(google.unexpectedRequests).toEqual([]);
});

test('mobile redirect token opens the initialized dashboard and clears the URL fragment', async ({
  page,
  hasTouch,
}) => {
  test.skip(!hasTouch, 'Redirect callback is the touch-device OAuth flow');
  const google = await installFakeGoogle(page);
  await page.goto('/#access_token=fake-access-token&expires_in=3600');

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Welcome to Moniq' })).toBeVisible();
  expect(await page.evaluate(() => window.location.hash)).toBe('');
  expect(google.createdSpreadsheets).toContain('Moniq Database');
  expect(google.unexpectedRequests).toEqual([]);
});
