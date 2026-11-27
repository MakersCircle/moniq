import { format } from 'date-fns';
import { test, expect } from './fixtures/demo';
import { fillLedgerSearch } from './helpers/ledgerSearch';

const inExportProfiles = () => ['desktop', 'iphone-portrait'].includes(test.info().project.name);
const calendarLabel = (date: Date) => format(date, 'EEEE, MMMM do, yyyy');

test('LEDGER-05: custom range uses one calendar with range preview and reverse endpoint support', async ({
  seededDemoPage: page,
}) => {
  test.skip(!inExportProfiles(), 'Checks custom range selection on desktop and phone layouts');
  const desktop = (page.viewportSize()?.width ?? 0) >= 1024;
  const today = new Date();
  const firstDate = new Date(today.getFullYear(), today.getMonth(), 28);
  const secondDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const middleDate = new Date(today.getFullYear(), today.getMonth(), 15);

  await page.getByRole('link', { name: 'Ledger', exact: true }).click();
  await page.getByRole('button', { name: desktop ? 'Export PDF' : 'Export' }).click();
  await page.getByRole('radio', { name: 'Custom range' }).check();
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
  await expect(page.getByText(/transactions will be included\./)).toBeVisible();
});

test('LEDGER-05: full-list PDF uses independent date and account filters', async ({
  seededDemoPage: page,
}) => {
  test.skip(!inExportProfiles(), 'Checks desktop and phone export layouts');
  const desktop = (page.viewportSize()?.width ?? 0) >= 1024;
  await page.getByRole('link', { name: 'Ledger', exact: true }).click();
  await fillLedgerSearch(page, 'deliberately-no-match');

  await page.getByRole('button', { name: desktop ? 'Export PDF' : 'Export' }).click();
  await expect(page.getByRole('heading', { name: 'Export Ledger Report' })).toBeVisible();
  const backdrop = page.locator('.fixed.inset-0.backdrop-blur-sm');
  await expect(backdrop).toBeVisible();
  await expect(backdrop).toHaveCSS('animation-delay', '0s');
  await expect(page.getByRole('radio', { name: 'Current month' })).toBeChecked();
  await expect(page.getByRole('group', { name: 'Report type' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Account' })).toContainText('All Accounts');
  await expect(page.getByLabel('From date')).not.toBeVisible();

  await page.getByRole('radio', { name: 'Custom range' }).check();
  const today = new Date();
  const date = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  await page.getByLabel('From date').fill(date);
  await page.getByLabel('To date').fill(date);
  await page.getByRole('combobox', { name: 'Account' }).click();
  await page.getByRole('option', { name: 'Fixture Checking' }).click();
  await expect(page.getByText('2 transactions will be included.')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(
    /^moniq-ledger-\d{4}-\d{2}-\d{2}-to-\d{4}-\d{2}-\d{2}\.pdf$/
  );
  const stream = await download.createReadStream();
  expect(stream).not.toBeNull();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const pdf = Buffer.concat(chunks);
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  expect(pdf.toString('latin1')).toContain('Inter');
  expect(pdf.toString('latin1')).toContain('https://moniq.donsabu.com');
});

test('LEDGER-05: category-wise PDF includes transfers outside category and income/expense totals', async ({
  seededDemoPage: page,
}) => {
  test.skip(!inExportProfiles(), 'Checks desktop and phone PDF generation');
  const desktop = (page.viewportSize()?.width ?? 0) >= 1024;
  await page.evaluate(() => {
    const app = window as typeof window & {
      useDataStore?: {
        getState: () => {
          addAccount: (
            account: object,
            methodName?: string
          ) => { accountId: string; methodId: string };
          addTransaction: (transaction: object) => void;
        };
      };
    };
    const store = app.useDataStore?.getState();
    if (!store) throw new Error('Demo store is unavailable');
    const from = store.addAccount(
      {
        name: 'Transfer Source',
        type: 'Asset',
        initialBalance: 0,
        isSavings: false,
        excludeFromNet: false,
        isActive: true,
      },
      'Source method'
    );
    const to = store.addAccount(
      {
        name: 'Transfer Destination',
        type: 'Asset',
        initialBalance: 0,
        isSavings: false,
        excludeFromNet: false,
        isActive: true,
      },
      'Destination method'
    );
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    store.addTransaction({
      date,
      uiType: 'transfer',
      amount: 75,
      accountId: from.accountId,
      targetId: to.accountId,
      methodId: from.methodId,
      note: 'Move to savings',
    });
  });
  await page.getByRole('link', { name: 'Ledger', exact: true }).click();

  await page.getByRole('button', { name: desktop ? 'Export PDF' : 'Export' }).click();
  await page.getByRole('radio', { name: 'Category-wise' }).check();
  await page.getByRole('radio', { name: 'Custom range' }).check();
  const today = new Date();
  const date = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  await page.getByLabel('From date').fill(date);
  await page.getByLabel('To date').fill(date);
  await expect(page.getByText('3 transactions will be included.')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  expect(stream).not.toBeNull();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const pdf = Buffer.concat(chunks);
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  expect(pdf.length).toBeGreaterThan(2_000);
});
