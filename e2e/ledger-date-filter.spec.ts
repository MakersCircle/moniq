import { addDays, format } from 'date-fns';
import { test, expect } from './fixtures/demo';
import type { DataState } from '../src/store/types';

const dateKey = (date: Date) => format(date, 'yyyy-MM-dd');
const calendarLabel = (date: Date) => format(date, 'EEEE, MMMM do, yyyy');

function makeFixtureDates() {
  const today = new Date();
  const monthIndex = today.getMonth() === 11 ? today.getMonth() - 1 : today.getMonth() + 1;
  const year = today.getFullYear() % 10 === 0 ? today.getFullYear() + 1 : today.getFullYear() - 1;
  const outsideMonthIndex = Array.from({ length: 12 }, (_, index) => index).find(
    index => index !== today.getMonth() && index !== monthIndex
  )!;
  const outsideYear = year < today.getFullYear() ? year - 1 : year + 1;

  return {
    today,
    yesterday: addDays(today, -1),
    previousWeek: addDays(today, -8),
    otherMonth: new Date(today.getFullYear(), monthIndex, 15),
    outsideMonth: new Date(today.getFullYear(), outsideMonthIndex, 15),
    otherYear: new Date(year, today.getMonth(), 1),
    outsideYear: new Date(outsideYear, today.getMonth(), 1),
  };
}

async function seedFilterTransactions(page: import('@playwright/test').Page) {
  const dates = makeFixtureDates();
  const fixtures = [
    ['Filter today', dates.today],
    ['Filter yesterday', dates.yesterday],
    ['Filter two days ago', addDays(dates.today, -2)],
    ['Filter previous week', dates.previousWeek],
    ['Filter other month', dates.otherMonth],
    ['Filter outside month', dates.outsideMonth],
    ['Filter other year', dates.otherYear],
    ['Filter outside year', dates.outsideYear],
  ].map(([note, date]) => ({ note, date: dateKey(date as Date) }));

  await page.evaluate(fixtures => {
    const app = window as typeof window & { useDataStore?: { getState: () => DataState } };
    const store = app.useDataStore?.getState();
    if (!store) throw new Error('Demo store is unavailable');

    const account = store.accounts.find(item => item.name === 'Fixture Checking');
    const method = store.methods.find(item => item.name === 'Fixture Debit Card');
    const category = store.categories.find(item => item.head === 'Fixture Food');
    if (!account || !method || !category) throw new Error('Seeded Ledger dependencies are missing');

    fixtures.forEach(({ note, date }) => {
      store.addTransaction({
        date,
        uiType: 'expense',
        amount: 25,
        accountId: account.id,
        targetId: category.id,
        methodId: method.id,
        note,
      });
    });
  }, fixtures);

  return dates;
}

async function openDateFilter(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Filter by date' }).click();
  return page
    .locator('[data-radix-popper-content-wrapper]')
    .filter({ has: page.getByRole('button', { name: 'Day', exact: true }) });
}

async function openLedger(page: import('@playwright/test').Page) {
  await page.getByRole('link', { name: 'Ledger', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Filter by date' })).toBeVisible();
}

const desktopAndPhone = () => ['desktop', 'iphone-portrait'].includes(test.info().project.name);

test('LEDGER-03: day, week, month, and year filters select multiple periods', async ({
  seededDemoPage: page,
}) => {
  test.skip(!desktopAndPhone(), 'Checks the date filter on desktop and phone layouts');
  const dates = await seedFilterTransactions(page);
  await openLedger(page);
  const filter = await openDateFilter(page);

  await filter.getByRole('button', { name: 'Day', exact: true }).click();
  const todayButton = filter.getByRole('button', { name: calendarLabel(dates.today) });
  await expect(todayButton.locator('span[aria-hidden="true"]')).toHaveCount(1);
  await todayButton.click();
  await filter.getByRole('button', { name: calendarLabel(dates.yesterday) }).click();
  await expect(page.getByText('Filter today', { exact: true })).toBeVisible();
  await expect(page.getByText('Filter yesterday', { exact: true })).toBeVisible();
  await expect(page.getByText('Filter previous week', { exact: true })).toHaveCount(0);
  await todayButton.click();
  await expect(page.getByText('Filter today', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Filter yesterday', { exact: true })).toBeVisible();
  await todayButton.click();

  await filter.getByRole('button', { name: 'Week', exact: true }).click();
  await filter.getByRole('button', { name: calendarLabel(dates.previousWeek) }).click();
  await filter.getByRole('button', { name: calendarLabel(dates.today) }).click();
  await expect(filter.getByText('2 weeks selected')).toBeVisible();
  await expect(page.getByText('Filter previous week', { exact: true })).toBeVisible();
  await expect(page.getByText('Filter today', { exact: true })).toBeVisible();
  await filter.getByRole('button', { name: calendarLabel(dates.previousWeek) }).click();
  await expect(filter.getByText('1 weeks selected')).toBeVisible();
  await expect(page.getByText('Filter previous week', { exact: true })).toHaveCount(0);
  await filter.getByRole('button', { name: calendarLabel(dates.previousWeek) }).click();
  const unselectedWeekDay = addDays(dates.today, 8);
  const hoveredWeekButton = filter.getByRole('button', {
    name: calendarLabel(unselectedWeekDay),
  });
  const hoveredWeekRow = hoveredWeekButton.locator('xpath=../..');
  await expect(hoveredWeekRow).toHaveClass(/group\/week/);
  if (test.info().project.name === 'desktop') {
    await hoveredWeekButton.hover();
    await expect
      .poll(() =>
        hoveredWeekRow
          .getByRole('button', { name: calendarLabel(addDays(unselectedWeekDay, 1)) })
          .evaluate(button => getComputedStyle(button).backgroundColor)
      )
      .toBe('rgb(39, 39, 42)');
  }
  await expect(filter.getByRole('button', { name: calendarLabel(dates.today) })).toHaveClass(
    /bg-primary\/25/
  );
  await expect(filter.getByRole('button', { name: calendarLabel(dates.previousWeek) })).toHaveClass(
    /bg-primary\/25/
  );

  await filter.getByRole('button', { name: 'Month', exact: true }).click();
  const currentMonth = dates.today.toLocaleDateString('en-IN', { month: 'long' });
  const otherMonth = dates.otherMonth.toLocaleDateString('en-IN', { month: 'long' });
  const currentMonthButton = filter.getByRole('button', { name: currentMonth, exact: true });
  const otherMonthButton = filter.getByRole('button', { name: otherMonth, exact: true });
  await expect(currentMonthButton.locator('span[aria-hidden="true"]')).toHaveCount(1);
  await expect(otherMonthButton.locator('span[aria-hidden="true"]')).toHaveCount(1);
  await currentMonthButton.click();
  await otherMonthButton.click();
  await expect(page.getByText('Filter today', { exact: true })).toBeVisible();
  await expect(page.getByText('Filter other month', { exact: true })).toBeVisible();
  await expect(page.getByText('Filter outside month', { exact: true })).toHaveCount(0);
  await otherMonthButton.click();
  await expect(page.getByText('Filter other month', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Filter today', { exact: true })).toBeVisible();
  await otherMonthButton.click();

  await filter.getByRole('button', { name: 'Year', exact: true }).click();
  const currentYearButton = filter.getByRole('button', {
    name: String(dates.today.getFullYear()),
    exact: true,
  });
  const otherYearButton = filter.getByRole('button', {
    name: String(dates.otherYear.getFullYear()),
    exact: true,
  });
  await expect(currentYearButton.locator('span[aria-hidden="true"]')).toHaveCount(1);
  await expect(otherYearButton.locator('span[aria-hidden="true"]')).toHaveCount(1);
  await currentYearButton.click();
  await otherYearButton.click();
  await expect(page.getByText('Filter today', { exact: true })).toBeVisible();
  await expect(page.getByText('Filter other year', { exact: true })).toBeVisible();
  await expect(page.getByText('Filter outside year', { exact: true })).toHaveCount(0);
  await otherYearButton.click();
  await expect(page.getByText('Filter other year', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Filter today', { exact: true })).toBeVisible();
  await otherYearButton.click();

  await filter.getByRole('button', { name: 'Clear date filter' }).click();
  await expect(page.getByText('Filter previous week', { exact: true })).toBeVisible();
  await expect(page.getByText('Filter other month', { exact: true })).toBeVisible();
  await expect(page.getByText('Filter outside month', { exact: true })).toBeVisible();

  await filter.getByRole('button', { name: 'Day', exact: true }).click();
  await filter.getByRole('button', { name: calendarLabel(dates.today) }).click();
  await page.getByPlaceholder('Search description...').fill('Filter today');
  await page.getByRole('button', { name: 'Filter by type' }).click();
  const typeFilter = page.getByRole('group', { name: 'Filter by type' });
  await typeFilter.getByRole('checkbox', { name: 'Income', exact: true }).uncheck();
  await typeFilter.getByRole('checkbox', { name: 'Transfer', exact: true }).uncheck();
  await page.getByRole('button', { name: 'Filter by account' }).click();
  const accountFilter = page
    .locator('[data-radix-popper-content-wrapper]')
    .filter({ has: page.getByPlaceholder('Search accounts...') });
  await accountFilter.getByRole('checkbox', { name: 'Fixture Checking', exact: true }).click();
  await expect(page.getByText('Filter today', { exact: true })).toBeVisible();
  await expect(page.getByText('Fixture paycheck', { exact: true })).toHaveCount(0);

  await page.getByPlaceholder('Search description...').fill('');
  await page.getByRole('button', { name: 'Filter by type' }).click();
  await typeFilter.getByRole('checkbox', { name: 'Income', exact: true }).check();
  await typeFilter.getByRole('checkbox', { name: 'Transfer', exact: true }).check();
  await page.getByRole('button', { name: 'Filter by account' }).click();
  await accountFilter.getByRole('button', { name: 'Clear account filter' }).click();
  const combinedFilter = await openDateFilter(page);
  await combinedFilter.getByRole('button', { name: 'Clear date filter' }).click();
  await expect(page.getByText('Fixture paycheck', { exact: true })).toBeVisible();
});

test('LEDGER-03: custom range can be selected in one calendar and accepts reverse endpoints', async ({
  seededDemoPage: page,
}) => {
  test.skip(!desktopAndPhone(), 'Checks custom date selection on desktop and phone layouts');
  const dates = await seedFilterTransactions(page);
  await openLedger(page);
  const filter = await openDateFilter(page);
  await filter.getByRole('button', { name: 'Custom', exact: true }).click();

  await page.getByRole('button', { name: 'Select date' }).first().click();
  let calendar = page.locator('[data-radix-popper-content-wrapper]').last();
  const firstRangeDate = addDays(dates.today, -2);
  await calendar.getByRole('button', { name: calendarLabel(firstRangeDate) }).click();
  await expect(calendar.getByRole('button', { name: calendarLabel(dates.today) })).toBeVisible();
  await calendar.getByRole('button', { name: calendarLabel(dates.today) }).hover();
  await expect(calendar.getByRole('button', { name: calendarLabel(dates.yesterday) })).toHaveClass(
    /bg-primary\/25/
  );
  await calendar.getByRole('button', { name: calendarLabel(dates.today) }).click();

  await expect(page.getByLabel('From date')).toHaveValue(format(firstRangeDate, 'dd/MM/yyyy'));
  await expect(page.getByLabel('To date')).toHaveValue(format(dates.today, 'dd/MM/yyyy'));
  await expect(page.getByText('Filter two days ago', { exact: true })).toBeVisible();
  await expect(page.getByText('Filter today', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Select date' }).nth(1).click();
  calendar = page.locator('[data-radix-popper-content-wrapper]').last();
  await expect(calendar.getByRole('button', { name: calendarLabel(dates.yesterday) })).toHaveClass(
    /bg-primary\/25/
  );
  await calendar.getByRole('button', { name: calendarLabel(dates.today) }).press('Escape');
  await page.getByRole('button', { name: 'Select date' }).first().click();
  calendar = page.locator('[data-radix-popper-content-wrapper]').last();
  await expect(calendar.getByRole('button', { name: calendarLabel(dates.yesterday) })).toHaveClass(
    /bg-primary\/25/
  );

  const [laterDate, earlierDate] =
    dates.today > dates.otherYear ? [dates.today, dates.otherYear] : [dates.otherYear, dates.today];
  await page.getByLabel('From date').fill(format(laterDate, 'dd/MM/yyyy'));
  await page.getByLabel('From date').press('Tab');
  await page.getByLabel('To date').fill(format(earlierDate, 'dd/MM/yyyy'));
  await page.getByLabel('To date').press('Tab');
  await expect(page.getByText('Filter today', { exact: true })).toBeVisible();
  await expect(page.getByText('Filter other year', { exact: true })).toBeVisible();
  await expect(filter.getByText('Choose a valid date range')).toHaveCount(0);
});

test('LEDGER-04: no matching date keeps the Ledger headings visible', async ({
  seededDemoPage: page,
}) => {
  test.skip(!desktopAndPhone(), 'Checks the filtered empty state on desktop and phone layouts');
  const dates = await seedFilterTransactions(page);
  await openLedger(page);
  const filter = await openDateFilter(page);
  const emptyDate = addDays(dates.today, 2);

  await filter.getByRole('button', { name: calendarLabel(emptyDate) }).click();
  await expect(page.getByText('No transactions found matching your filters.')).toBeVisible();
  await expect(page.getByText('Date', { exact: true })).toBeVisible();
  await expect(page.getByText('Description', { exact: true })).toBeVisible();
});
