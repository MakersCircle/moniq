import { format } from 'date-fns';
import { test, expect } from './fixtures/demo';
import type { DataState } from '../src/store/types';
import { formatCurrency } from '../src/utils/format';

async function seedAmountFilterData(page: import('@playwright/test').Page) {
  const today = format(new Date(), 'yyyy-MM-dd');
  await page.evaluate(today => {
    const app = window as typeof window & { useDataStore?: { getState: () => DataState } };
    const store = app.useDataStore?.getState();
    if (!store) throw new Error('Demo store is unavailable');

    const account = store.accounts.find(item => item.name === 'Fixture Checking');
    const method = store.methods.find(item => item.name === 'Fixture Debit Card');
    const category = store.categories.find(item => item.head === 'Fixture Food' && !item.subHead);
    if (!account || !method || !category) throw new Error('Seeded Ledger dependencies are missing');

    [
      { amount: 10, note: 'Boundary low' },
      { amount: 50, note: 'Amount low' },
      { amount: 125, note: 'Amount middle' },
      { amount: 900, note: 'Amount high' },
    ].forEach(({ amount, note }) => {
      store.addTransaction({
        date: today,
        uiType: 'expense',
        amount,
        accountId: account.id,
        targetId: category.id,
        methodId: method.id,
        note,
      });
    });
  }, today);
}

test('LEDGER-13: amount range filter combines slider and precise values', async ({
  seededDemoPage: page,
}) => {
  test.skip(test.info().project.name !== 'desktop', 'The Amount filter coverage is desktop-only');
  await seedAmountFilterData(page);
  const settings = await page.evaluate(() => {
    const app = window as typeof window & { useDataStore?: { getState: () => DataState } };
    return app.useDataStore?.getState().settings;
  });
  if (!settings) throw new Error('Seeded Ledger settings are missing');
  await page.getByRole('link', { name: 'Ledger', exact: true }).first().click();

  await expect(page.getByText('Net', { exact: true })).toHaveCount(0);
  const ledgerToolbar = page.getByRole('button', { name: 'Export PDF' }).locator('xpath=..');
  await expect(ledgerToolbar.getByPlaceholder('Search description...')).toBeVisible();
  await expect(ledgerToolbar.getByRole('button', { name: 'Filter by type' })).toBeVisible();

  await page.getByRole('button', { name: 'Filter by amount' }).click();
  const filter = page
    .locator('[data-radix-popper-content-wrapper]')
    .filter({ has: page.getByRole('slider', { name: 'Minimum amount' }) });
  const minSlider = filter.getByRole('slider', { name: 'Minimum amount' });
  const maxSlider = filter.getByRole('slider', { name: 'Maximum amount' });
  const minInput = filter.getByRole('spinbutton', { name: 'Minimum amount' });
  const maxInput = filter.getByRole('spinbutton', { name: 'Maximum amount' });

  await expect(minSlider).toHaveAttribute('min', '10');
  await expect(maxSlider).toHaveAttribute('max', '2000');
  await expect(minInput).toHaveAttribute('placeholder', formatCurrency(10, settings));
  await expect(maxInput).toHaveAttribute('placeholder', formatCurrency(2000, settings));
  await expect(minSlider).toHaveValue('10');
  await expect(maxSlider).toHaveValue('2000');

  await page.getByPlaceholder('Search description...').fill('Amount');
  await page.getByRole('button', { name: 'Filter by amount' }).click();
  await expect(minSlider).toHaveValue('50');
  await expect(maxSlider).toHaveValue('900');
  await expect(minSlider).toHaveAttribute('aria-valuemin', '50');
  await expect(minSlider).toHaveAttribute('aria-valuemax', '900');
  await expect(maxSlider).toHaveAttribute('aria-valuemin', '50');
  await expect(maxSlider).toHaveAttribute('aria-valuemax', '900');
  await expect(minInput).toHaveAttribute('placeholder', formatCurrency(50, settings));
  await expect(maxInput).toHaveAttribute('placeholder', formatCurrency(900, settings));
  await minSlider.focus();
  await minSlider.press('ArrowLeft');
  await expect(minSlider).toHaveValue('50');
  await maxSlider.focus();
  await maxSlider.press('ArrowLeft');
  await expect(maxSlider).not.toHaveValue('900');
  await expect(page.getByText('Amount high', { exact: true })).toHaveCount(0);

  const sliderBox = await maxSlider.boundingBox();
  if (!sliderBox) throw new Error('Maximum amount slider is not visible');
  const sliderY = sliderBox.y + sliderBox.height / 2;
  const currentMax = Number(await maxSlider.inputValue());
  const scaleMin = Number(await maxSlider.getAttribute('min'));
  const scaleMax = Number(await maxSlider.getAttribute('max'));
  const thumbX = (value: number) =>
    sliderBox.x + 7 + ((value - scaleMin) / (scaleMax - scaleMin)) * (sliderBox.width - 14);
  await page.mouse.move(thumbX(currentMax), sliderY);
  await page.mouse.down();
  await page.mouse.move(thumbX(400), sliderY, { steps: 6 });
  await page.mouse.up();
  await expect.poll(async () => Number(await maxSlider.inputValue())).toBeLessThan(500);

  await minInput.fill('100');
  await maxInput.fill('200');
  await expect(page.getByText('Amount low', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Amount middle', { exact: true })).toBeVisible();
  await expect(page.getByText('Amount high', { exact: true })).toHaveCount(0);
  await page.getByPlaceholder('Search description...').fill('low');
  await expect(page.getByText('No transactions found matching your filters.')).toBeVisible();
  await page.getByPlaceholder('Search description...').fill('');

  await page.getByRole('button', { name: 'Filter by amount' }).click();
  await filter.getByRole('button', { name: 'Clear amount filter' }).click();
  await expect(page.getByText('Boundary low', { exact: true })).toBeVisible();
  await expect(page.getByText('Fixture paycheck', { exact: true })).toBeVisible();
});

test('LEDGER-14: ledger toolbar adapts type filter to desktop and mobile', async ({
  seededDemoPage: page,
}) => {
  await seedAmountFilterData(page);
  await page.getByRole('link', { name: 'Ledger', exact: true }).first().click();

  const width = page.viewportSize()?.width ?? 0;
  const searchIcon = page.getByRole('button', { name: 'Search description...' });
  const searchInput = page.locator('input[placeholder="Search description..."]:visible');
  const typeFilter = page.getByRole('button', { name: 'Filter by type' });
  const exportButton = page.getByRole('button', { name: 'Export PDF' });
  const ledgerHeading = page.getByRole('heading', { name: 'Ledger' });

  await expect(typeFilter).toBeVisible();
  await expect(exportButton).toBeVisible();
  const closedSearchBox = width < 768 ? await searchIcon.boundingBox() : null;
  await typeFilter.click();
  const typeOptions = page.getByRole('group', { name: 'Filter by type' });
  const incomeOption = typeOptions.getByRole('checkbox', { name: 'Income', exact: true });
  const expensesOption = typeOptions.getByRole('checkbox', { name: 'Expenses', exact: true });
  const transferOption = typeOptions.getByRole('checkbox', { name: 'Transfer', exact: true });
  await expect(incomeOption).toBeChecked();
  await expect(expensesOption).toBeChecked();
  await expect(transferOption).toBeChecked();
  if (width >= 768) await expect(typeOptions.getByText('All Types', { exact: true })).toBeVisible();
  await expect(typeOptions.getByRole('checkbox', { name: 'All Types' })).toHaveCount(0);
  await expect(typeFilter).toHaveCSS('opacity', '0');
  const filterButtonBox = await typeFilter.boundingBox();
  const menuBox = await typeOptions.boundingBox();
  if (!filterButtonBox || !menuBox) throw new Error('Type filter options are not positioned');
  expect(menuBox.y).toBeGreaterThanOrEqual(filterButtonBox.y);
  if (width < 768) {
    await expect(typeFilter).toHaveJSProperty('clientWidth', 144);
    const expandedSearchBox = await searchIcon.boundingBox();
    if (!closedSearchBox || !expandedSearchBox) throw new Error('Search icon is not positioned');
    expect(expandedSearchBox.x).toBeLessThan(closedSearchBox.x);
  }
  await transferOption.uncheck();
  await expect(expensesOption).toBeChecked();
  await expect(incomeOption).toBeChecked();
  await expect(page.getByText('Fixture groceries', { exact: true })).toBeVisible();
  await expect(page.getByText('Fixture paycheck', { exact: true })).toBeVisible();
  if (width >= 768) await expect(typeOptions.getByText('2 types', { exact: true })).toBeVisible();
  await expensesOption.uncheck();
  await expect(page.getByText('Fixture groceries', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Fixture paycheck', { exact: true })).toBeVisible();
  await expensesOption.check();
  await incomeOption.uncheck();
  await expensesOption.uncheck();
  await expect(page.getByText('No transactions found matching your filters.')).toBeVisible();
  await incomeOption.check();
  await expensesOption.check();
  await transferOption.check();
  await expect(page.getByText('Fixture paycheck', { exact: true })).toBeVisible();
  await expect(page.getByText('Boundary low', { exact: true })).toBeVisible();
  await page.getByRole('heading', { name: 'Ledger' }).click();

  if (width < 768) {
    await expect(searchIcon).toBeVisible();
    await expect(searchInput).toHaveCount(0);
    await expect(typeFilter).toHaveJSProperty('clientWidth', 40);
    await expect(searchIcon).toHaveJSProperty('clientWidth', 40);
    await expect(exportButton).toHaveJSProperty('clientWidth', 40);
    await expect(typeFilter).toHaveText('');
    await expect(exportButton).toHaveText('');
    const searchGlyph = await searchIcon.locator('svg').boundingBox();
    const typeGlyph = await typeFilter.locator('svg').first().boundingBox();
    const exportGlyph = await exportButton.locator('svg').boundingBox();
    if (!searchGlyph || !typeGlyph || !exportGlyph)
      throw new Error('Toolbar icons are not visible');
    expect(typeGlyph.x - searchGlyph.x - searchGlyph.width).toBeLessThanOrEqual(22);
    expect(exportGlyph.x - typeGlyph.x - typeGlyph.width).toBeLessThanOrEqual(22);
    const headingBox = await ledgerHeading.boundingBox();
    const searchBox = await searchIcon.boundingBox();
    if (!headingBox || !searchBox)
      throw new Error('Mobile Ledger toolbar controls are not visible');
    expect(
      Math.abs(headingBox.y + headingBox.height / 2 - (searchBox.y + searchBox.height / 2))
    ).toBeLessThan(16);
    for (const control of [searchIcon, typeFilter, exportButton]) {
      await expect
        .poll(() => control.evaluate(element => getComputedStyle(element).borderTopWidth))
        .toBe('0px');
    }
    await searchIcon.click();
    await expect(searchInput).toBeVisible();
    await expect(searchInput).not.toBeFocused();
  } else {
    await expect(searchIcon).toBeHidden();
    await expect(searchInput).toBeVisible();
    await expect(typeFilter).toHaveJSProperty('clientWidth', 120);
    await expect(typeFilter).toHaveText('2 types');
    await expect(exportButton).toHaveText('Export PDF');
  }
});
