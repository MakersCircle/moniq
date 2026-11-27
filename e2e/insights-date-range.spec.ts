import { format } from 'date-fns';
import { enterDemoMode, expect, seedDemoData, test } from './fixtures/demo';

const desktopAndPhone = () => ['desktop', 'iphone-portrait'].includes(test.info().project.name);
const calendarLabel = (date: Date) => format(date, 'EEEE, MMMM do, yyyy');

test('INSIGHT-04: Insights controls render while the chart module is loading', async ({ page }) => {
  test.skip(!desktopAndPhone(), 'Checks Insights loading on desktop and phone layouts');
  const chartLoad = Promise.withResolvers<void>();
  const chartModule = '**/src/components/Insights/InsightsCharts.tsx*';
  const heading = page.getByRole('heading', { name: 'Insights', exact: true });
  const rangeButton = page.getByRole('button', { name: 'Date range' });
  const scrollContainer = page.locator('#main-scroll-container');
  await page.route(chartModule, async route => {
    await chartLoad.promise;
    await route.continue();
  });

  let loadingLayout;
  try {
    const backgroundRequests = Promise.all([
      page.waitForRequest(chartModule),
      page.waitForRequest('**/src/pages/Transactions.tsx*'),
    ]);
    await enterDemoMode(page);
    await seedDemoData(page);
    await backgroundRequests;
    await page.getByRole('link', { name: 'Insights', exact: true }).click();
    await expect(heading).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Loading charts…' })).toBeVisible();
    await rangeButton.click();
    await page.getByRole('radio', { name: 'All time' }).check();
    await expect(rangeButton).toContainText('All Time');
    loadingLayout = {
      width: await scrollContainer.evaluate(element => element.clientWidth),
      headingX: (await heading.boundingBox())!.x,
      buttonX: (await rangeButton.boundingBox())!.x,
    };
  } finally {
    chartLoad.resolve();
  }
  await expect(page.getByRole('heading', { name: 'Daily cash flow' })).toBeVisible();
  expect(await scrollContainer.evaluate(element => element.clientWidth)).toBe(loadingLayout.width);
  expect((await heading.boundingBox())!.x).toBeCloseTo(loadingLayout.headingX);
  expect((await rangeButton.boundingBox())!.x).toBeCloseTo(loadingLayout.buttonX);
});

test('INSIGHT-04: title and date selector stay pinned while the charts scroll', async ({
  seededDemoPage: page,
}) => {
  test.skip(!desktopAndPhone(), 'Checks the pinned Insights header on desktop and phone layouts');
  await page.getByRole('link', { name: 'Insights', exact: true }).click();
  const heading = page.getByRole('heading', { name: 'Insights', exact: true });
  const rangeButton = page.getByRole('button', { name: 'Date range' });
  const scrollContainer = page.locator('#main-scroll-container');
  await expect(page.getByRole('heading', { name: 'Daily cash flow' })).toBeVisible();
  await scrollContainer.evaluate(element => {
    element.scrollTop = element.scrollHeight;
  });

  await expect
    .poll(() => scrollContainer.evaluate(element => element.scrollTop))
    .toBeGreaterThan(100);
  await expect(heading).toBeInViewport({ ratio: 1 });
  await expect(rangeButton).toBeInViewport({ ratio: 1 });
  await rangeButton.click();
  await page.getByRole('radio', { name: 'All time' }).check();
  await expect(rangeButton).toContainText('All Time');
  await expect(rangeButton).toHaveAttribute('aria-expanded', 'false');
});

test('INSIGHT-04: custom range uses one calendar with hover preview and reverse endpoint support', async ({
  seededDemoPage: page,
}) => {
  test.skip(!desktopAndPhone(), 'Checks Insights custom range on desktop and phone layouts');
  const today = new Date();
  const firstDate = new Date(today.getFullYear(), today.getMonth(), 28);
  const secondDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const middleDate = new Date(today.getFullYear(), today.getMonth(), 15);

  await page.getByRole('link', { name: 'Insights', exact: true }).click();
  const rangeButton = page.getByRole('button', { name: 'Date range' });
  await rangeButton.click();
  const rangePopover = page.locator('[data-radix-popper-content-wrapper]').last();
  await rangePopover.getByRole('radio', { name: 'Custom range' }).check();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'Select date' }).first().click();

  const calendar = page.locator('[data-radix-popper-content-wrapper]').last();
  await calendar.getByRole('button', { name: calendarLabel(firstDate) }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await calendar.getByRole('button', { name: calendarLabel(secondDate) }).hover();
  await expect(calendar.getByRole('button', { name: calendarLabel(middleDate) })).toHaveClass(
    /bg-primary\/25/
  );
  await calendar.getByRole('button', { name: calendarLabel(secondDate) }).click();

  await expect(page.getByLabel('From date')).toHaveValue(format(firstDate, 'dd/MM/yyyy'));
  await expect(page.getByLabel('To date')).toHaveValue(format(secondDate, 'dd/MM/yyyy'));
  await expect(rangePopover).toHaveCount(0);
  await expect(rangeButton).not.toContainText('Custom range');
  await expect(page.getByRole('heading', { name: 'Money flow' })).toBeVisible();
});
