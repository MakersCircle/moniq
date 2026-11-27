import { format } from 'date-fns';
import { expect, test } from './fixtures/demo';

const desktopAndPhone = () => ['desktop', 'iphone-portrait'].includes(test.info().project.name);
const calendarLabel = (date: Date) => format(date, 'EEEE, MMMM do, yyyy');

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
