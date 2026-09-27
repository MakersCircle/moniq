import { test, expect } from './fixtures/demo';

test('DEMO-01/02: seeded demo data and session survive reload', async ({ seededDemoPage: page }) => {
  await expect(page.getByText('Fixture Checking')).toBeVisible();
  await expect(page.getByText('Fixture groceries')).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator('#main-scroll-container > div').first()).toContainText('Demo Mode');
  await expect(page.getByText('Fixture Checking')).toBeVisible();
  await expect(page.getByText('Fixture groceries')).toBeVisible();
});

test('NAV-01: main navigation opens each app page', async ({ demoPage: page }) => {
  const routes = [
    ['/transactions', 'Ledger', 'Nothing here yet'],
    ['/insights', 'Insights', 'Nothing here yet'],
    ['/budget', 'Budget', 'Nothing here yet'],
    ['/dashboard', 'Dashboard', 'Welcome to Moniq'],
  ] as const;

  for (const [path, label, heading] of routes) {
    await page.locator(`aside a[href="${path}"]`).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.locator(`aside a[href="${path}"]`)).toContainText(label);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }

  const desktop = (page.viewportSize()?.width ?? 0) >= 1024;
  const settingsLink = desktop
    ? page.locator('aside a[href="/settings"]')
    : page.locator('header a[href="/settings"]');
  await settingsLink.click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole('heading', { name: 'General', exact: true })).toBeVisible();
  await expect(page.locator('a[href="/settings/accounts"]')).toBeVisible();
});

test('NAV-02: settings navigation opens all management pages', async ({ demoPage: page }) => {
  await page.goto('/settings');
  const routes = [
    ['/settings/accounts', 'Accounts'],
    ['/settings/methods', 'Payment Methods'],
    ['/settings/categories', 'Categories'],
    ['/settings/trash', 'Recently Deleted'],
  ] as const;

  for (const [path, heading] of routes) {
    const link = page.locator(`a[href="${path}"]`);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(link).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
});

test('NAV-03/TXN-01: desktop sidebar or mobile bottom bar opens the transaction form', async ({ demoPage: page }) => {
  const desktop = (page.viewportSize()?.width ?? 0) >= 1024;
  const sidebar = page.locator('body > div aside').first();
  const box = await sidebar.boundingBox();
  expect(box).not.toBeNull();

  if (desktop) {
    expect(box!.width).toBeGreaterThan(180);
    expect(box!.height).toBeGreaterThan(500);
    await expect(page.getByRole('button', { name: 'New Transaction' })).toBeVisible();
    await expect(page.locator('header a[href="/settings"]')).toBeHidden();
    await page.getByRole('button', { name: 'New Transaction' }).click();
  } else {
    expect(box!.height).toBeLessThan(90);
    expect(box!.y).toBeGreaterThan((page.viewportSize()?.height ?? 0) - 100);
    await expect(page.locator('header a[href="/settings"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'New Transaction' })).toBeHidden();
    await sidebar.locator('button').click();
  }

  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('New Transaction');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('NAV-03: app shell fits desktop and mobile viewport widths', async ({ demoPage: page }) => {
  for (const path of ['/dashboard', '/transactions', '/settings']) {
    await page.goto(path);
    await expect(page.locator('#main-scroll-container')).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      page: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(dimensions.page, `${path} overflows at ${dimensions.viewport}px`).toBeLessThanOrEqual(
      dimensions.viewport
    );
  }
});
