import { expect, test } from './fixtures/demo';

test('INSIGHT-07: daily cashflow heatmap shows income and spent totals on hover or tap', async ({
  seededDemoPage: page,
}) => {
  const isPhone = test.info().project.name === 'iphone-portrait';
  test.skip(!['desktop', 'iphone-portrait'].includes(test.info().project.name));

  await page.getByRole('link', { name: 'Insights', exact: true }).click();
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const spendingDayNumber = now.getDate() === 1 ? 2 : 1;
  const spendingDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(spendingDayNumber).padStart(2, '0')}`;
  await page.evaluate(
    ({ spendingDate }) => {
      const app = window as typeof window & {
        useDataStore?: {
          getState: () => {
            accounts: { id: string; name: string }[];
            methods: { id: string; linkedAccountId?: string }[];
            categories: { id: string; head: string }[];
            addTransaction: (transaction: object) => void;
          };
        };
      };
      const store = app.useDataStore?.getState();
      if (!store) throw new Error('Demo store is unavailable');
      const account = store.accounts.find(item => item.name === 'Fixture Checking');
      const method = store.methods.find(item => item.linkedAccountId === account?.id);
      const category = store.categories.find(item => item.head === 'Fixture Food');
      if (!account || !method || !category)
        throw new Error('Fixture transaction references are unavailable');
      store.addTransaction({
        date: spendingDate,
        uiType: 'expense',
        amount: 3000,
        accountId: account.id,
        targetId: category.id,
        methodId: method.id,
        note: 'Heatmap spending fixture',
      });
      store.addTransaction({
        date: '2025-06-15',
        uiType: 'expense',
        amount: 700,
        accountId: account.id,
        targetId: category.id,
        methodId: method.id,
        note: 'Previous year heatmap fixture',
      });
    },
    { spendingDate }
  );
  const day = page.getByTestId(`cashflow-day-${date}`);
  const spendingDay = page.getByTestId(`cashflow-day-${spendingDate}`);

  await expect(
    page.getByRole('region', { name: 'Daily income and spending calendar' })
  ).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Calendar year' })).toHaveText(
    String(now.getFullYear())
  );
  await expect(page.getByText('Jan', { exact: true })).toBeVisible();
  await expect(page.getByText('Dec', { exact: true })).toBeVisible();
  if (isPhone) {
    const calendarScroll = page.getByTestId('cashflow-calendar-scroll');
    const calendarDimensions = await calendarScroll.evaluate(element => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      scrollLeft: element.scrollLeft,
    }));
    expect(calendarDimensions.scrollWidth).toBeGreaterThan(calendarDimensions.clientWidth);
    expect(calendarDimensions.scrollLeft).toBeGreaterThan(0);
    const todayBounds = await day.boundingBox();
    const calendarBounds = await calendarScroll.boundingBox();
    expect(todayBounds).not.toBeNull();
    expect(calendarBounds).not.toBeNull();
    expect(todayBounds!.x).toBeGreaterThanOrEqual(calendarBounds!.x);
    expect(todayBounds!.x + todayBounds!.width).toBeLessThanOrEqual(
      calendarBounds!.x + calendarBounds!.width
    );
  }
  await expect(day).toHaveAttribute('data-cashflow-state', 'income');
  await expect(day).toHaveAttribute('aria-label', /income \$2\.0K · spent \$250/);
  await expect(day).toHaveClass(/bg-emerald-/);
  await expect(spendingDay).toHaveAttribute('data-cashflow-state', 'spending');
  await expect(spendingDay).toHaveClass(/bg-rose-/);
  await day.focus();
  const details = page.getByTestId('cashflow-day-details');
  await expect(details).toContainText('$250');
  await expect(details).toContainText('$2.0K');
  if (isPhone) await day.click();
  else await day.hover();

  await expect(details).toContainText('$250');
  await expect(details).toContainText('$2.0K');

  const yearSelector = page.getByRole('combobox', { name: 'Calendar year' });
  await yearSelector.click();
  await page.getByRole('option', { name: '2025', exact: true }).click();
  await expect(page.getByTestId('cashflow-day-2025-06-15')).toHaveAttribute(
    'data-cashflow-state',
    'spending'
  );
  await expect(day).toHaveCount(0);
  await page.getByRole('button', { name: 'Date range' }).click();
  await page.getByRole('radio', { name: 'Previous Month' }).check();
  await expect(yearSelector).toHaveText('2025');
  await expect(page.getByTestId('cashflow-day-2025-06-15')).toBeVisible();

  if (isPhone) {
    const viewportWidth = page.viewportSize()?.width || 0;
    const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(documentWidth).toBeLessThanOrEqual(viewportWidth);
  }
});
