import { test, expect } from './fixtures/demo';
import type { DataState } from '../src/store/types';

const sameDay = '2024-03-15';

async function seedLedger(page: import('@playwright/test').Page, count = 3) {
  await page.evaluate(
    ({ count, sameDay }) => {
      const app = window as typeof window & { useDataStore?: { getState: () => DataState } };
      const store = app.useDataStore?.getState();
      if (!store) throw new Error('Demo store is unavailable');
      const { accountId, methodId } = store.addAccount(
        {
          name: 'Ledger Reorder Account',
          type: 'Asset',
          initialBalance: 0,
          isSavings: false,
          excludeFromNet: false,
          isActive: true,
        },
        'Ledger Reorder Method'
      );
      const categoryId = store.addCategory({
        group: 'Needs',
        head: 'Ledger Reorder Category',
        isActive: true,
      }).id;

      if (count > 3) {
        for (let index = 0; index < 5; index++) {
          store.addTransaction({
            date: '2024-03-16',
            uiType: 'expense',
            amount: 1,
            accountId,
            targetId: categoryId,
            methodId,
            note: `Newer ${index}`,
          });
        }
      }

      for (let index = 0; index < count; index++) {
        store.addTransaction({
          date: sameDay,
          uiType: 'expense',
          amount: index + 1,
          accountId,
          targetId: categoryId,
          methodId,
          note: `Ledger ${String.fromCharCode(65 + index)}`,
        });
      }

      if (count === 3) {
        store.addTransaction({
          date: '2024-03-14',
          uiType: 'expense',
          amount: 4,
          accountId,
          targetId: categoryId,
          methodId,
          note: 'Other Day',
        });
      } else {
        store.addTransaction({
          date: '2024-03-14',
          uiType: 'expense',
          amount: 1,
          accountId,
          targetId: categoryId,
          methodId,
          note: 'Older Day',
        });
      }
    },
    { count, sameDay }
  );
}

async function seedBalanceLedger(page: import('@playwright/test').Page) {
  await page.evaluate(sameDay => {
    const app = window as typeof window & {
      useDataStore?: {
        getState: () => DataState;
        setState: (updater: (state: DataState) => Partial<DataState>) => void;
      };
    };
    const ledgerStore = app.useDataStore;
    const store = ledgerStore?.getState();
    if (!store) throw new Error('Demo store is unavailable');
    const { accountId, methodId } = store.addAccount(
      {
        name: 'Ledger Test Account',
        type: 'Asset',
        initialBalance: 1000,
        isSavings: false,
        excludeFromNet: false,
        isActive: true,
      },
      'Ledger Test Method'
    );
    const otherAccount = store.addAccount(
      {
        name: 'Unrelated Ledger Account',
        type: 'Asset',
        initialBalance: 0,
        isSavings: false,
        excludeFromNet: false,
        isActive: true,
      },
      'Unrelated Ledger Method'
    );
    const categoryId = store.addCategory({
      group: 'Needs',
      head: 'Ledger Test Category',
      isActive: true,
    }).id;

    for (const [note, amount, uiType] of [
      ['Balance A', 100, 'income'],
      ['Balance B', 51, 'expense'],
      ['Balance C', 50, 'expense'],
    ] as const) {
      store.addTransaction({
        date: sameDay,
        uiType,
        amount,
        accountId,
        targetId: categoryId,
        methodId,
        note,
      });
    }
    store.addTransaction({
      date: sameDay,
      uiType: 'transfer',
      amount: 500,
      accountId,
      targetId: otherAccount.accountId,
      methodId,
      note: 'Balance D',
    });
    store.addTransaction({
      date: sameDay,
      uiType: 'expense',
      amount: 500,
      accountId: otherAccount.accountId,
      targetId: categoryId,
      methodId: otherAccount.methodId,
      note: 'Unrelated account legacy row',
    });

    // Model a legacy row between explicitly reordered records. The whole date
    // group should use creation order until every row has a saved sort order.
    ledgerStore?.setState(state => ({
      transactions: state.transactions.map(transaction => {
        if (transaction.note === 'Balance A') {
          return {
            ...transaction,
            sortOrder: 2,
            createdAt: `${sameDay}T08:00:00.000Z`,
          };
        }
        if (transaction.note === 'Balance B') {
          return {
            ...transaction,
            sortOrder: undefined,
            createdAt: `${sameDay}T09:00:00.000Z`,
          };
        }
        if (transaction.note === 'Balance C') {
          return {
            ...transaction,
            sortOrder: 0,
            createdAt: `${sameDay}T10:00:00.000Z`,
          };
        }
        if (transaction.note === 'Balance D') {
          return { ...transaction, createdAt: `${sameDay}T11:00:00.000Z` };
        }
        if (transaction.note === 'Unrelated account legacy row') {
          return { ...transaction, sortOrder: undefined };
        }
        return transaction;
      }),
    }));
  }, sameDay);
}

async function openLedger(page: import('@playwright/test').Page) {
  await page.getByRole('link', { name: 'Ledger', exact: true }).click();
  await expect(page).toHaveURL(/\/transactions$/);
}

function dayGroup(page: import('@playwright/test').Page, date = sameDay) {
  return page.locator(`[data-ledger-date-group="${date}"]`);
}

async function transactionNames(group: import('@playwright/test').Locator) {
  return group
    .locator('button[aria-label^="Reorder "]')
    .evaluateAll(handles =>
      handles.map(
        handle =>
          handle.getAttribute('aria-label')?.match(/^Reorder (.*?) within this date\./)?.[1] || ''
      )
    );
}

test('LEDGER-09: the handle reorders transactions only within their date and saves on drop', async ({
  demoPage: page,
}) => {
  await seedLedger(page);
  await openLedger(page);

  const group = dayGroup(page);
  const rows = group.locator('.cursor-pointer');
  await expect(group.locator('button[aria-label^="Reorder "]')).toHaveCount(3);
  await expect.poll(() => transactionNames(group)).toEqual(['Ledger C', 'Ledger B', 'Ledger A']);
  await expect
    .poll(() =>
      page
        .locator('[data-ledger-date-group]')
        .evaluateAll(groups => groups.map(group => group.getAttribute('data-ledger-date-group')))
    )
    .toEqual(['2024-03-15', '2024-03-14']);
  const alpha = rows.filter({ hasText: 'Ledger A' });
  const charlie = rows.filter({ hasText: 'Ledger C' });
  const originalOrder = await transactionNames(group);
  const rowBox = await alpha.boundingBox();
  const targetBox = await charlie.boundingBox();
  expect(rowBox).not.toBeNull();
  expect(targetBox).not.toBeNull();

  await page.mouse.move(rowBox!.x + 100, rowBox!.y + rowBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox!.x + 100, targetBox!.y + targetBox!.height / 2, { steps: 10 });
  await page.mouse.up();
  expect(await transactionNames(group)).toEqual(originalOrder);

  await page.reload();
  await expect(page).toHaveURL(/\/transactions$/);
  const reloadedGroup = dayGroup(page);
  const reloadedAlpha = reloadedGroup.locator('.cursor-pointer').filter({ hasText: 'Ledger A' });
  const reloadedBravo = reloadedGroup.locator('.cursor-pointer').filter({ hasText: 'Ledger B' });
  const handle = reloadedAlpha.getByRole('button', {
    name: 'Reorder Ledger A within this date. Drag or use arrow keys.',
  });
  await handle.evaluate(element => element.scrollIntoView({ block: 'center' }));
  const handleBox = await handle.boundingBox();
  const targetAfterReload = await reloadedBravo.boundingBox();
  const groupBox = await reloadedGroup.boundingBox();
  expect(handleBox).not.toBeNull();
  expect(targetAfterReload).not.toBeNull();
  expect(groupBox).not.toBeNull();

  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    targetAfterReload!.x + 100,
    targetAfterReload!.y + targetAfterReload!.height / 2,
    { steps: 12 }
  );
  await expect.poll(() => transactionNames(reloadedGroup)).not.toEqual(originalOrder);
  const previewOrder = await transactionNames(reloadedGroup);

  const draggedRow = await reloadedAlpha.boundingBox();
  expect(draggedRow).not.toBeNull();
  expect(draggedRow!.y + draggedRow!.height).toBeLessThanOrEqual(
    groupBox!.y + groupBox!.height + 2
  );
  await page.mouse.up();

  await expect
    .poll(() =>
      page.evaluate(
        date =>
          new Promise<string[]>((resolve, reject) => {
            const request = indexedDB.open('moniq-db');
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              const db = request.result;
              const records = db
                .transaction('transactions', 'readonly')
                .objectStore('transactions')
                .getAll();
              records.onerror = () => reject(records.error);
              records.onsuccess = () => {
                db.close();
                resolve(
                  (records.result as DataState['transactions'])
                    .filter(transaction => transaction.date === date && !transaction.isDeleted)
                    .sort((a, b) => (b.sortOrder || 0) - (a.sortOrder || 0))
                    .map(transaction => transaction.note)
                );
              };
            };
          }),
        sameDay
      )
    )
    .toEqual(previewOrder);

  await page.reload();
  await expect.poll(() => transactionNames(dayGroup(page))).toEqual(previewOrder);
  await expect(transactionNames(dayGroup(page, '2024-03-14'))).resolves.toEqual(['Other Day']);
});

test('LEDGER-20: account balances match descending rows and update after reorder', async ({
  demoPage: page,
}) => {
  test.skip(test.info().project.name !== 'iphone-portrait', 'Checks the optional Balance column');
  await seedBalanceLedger(page);
  await openLedger(page);

  const filterMenu = page.getByRole('button', { name: 'Filters' });
  await filterMenu.click();
  const filters = page.getByRole('dialog', { name: 'Filters' });
  await filters.getByRole('button', { name: 'Account' }).click();
  await filters.getByRole('checkbox', { name: 'Ledger Test Account' }).check();
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Columns' }).click();
  const columns = page.getByRole('dialog', { name: 'Columns' });
  await columns.getByRole('checkbox', { name: 'Balance' }).check();
  await page.keyboard.press('Escape');

  const group = dayGroup(page);
  await expect
    .poll(() => transactionNames(group))
    .toEqual(['Balance D', 'Balance C', 'Balance B', 'Balance A']);
  const row = (note: string) => group.locator('[data-ledger-row]').filter({ hasText: note });
  const balance = (note: string) => row(note).locator('div.mono.text-xs.truncate');
  await expect(balance('Balance D')).toContainText('499');
  await expect(balance('Balance C')).toContainText('999');
  await expect(balance('Balance B')).toContainText('1,049');
  await expect(balance('Balance A')).toContainText('1,100');

  const balanceAHandle = row('Balance A').getByRole('button', {
    name: 'Reorder Balance A within this date. Drag or use arrow keys.',
  });
  await balanceAHandle.press('ArrowUp');
  await balanceAHandle.press('ArrowUp');
  await balanceAHandle.press('ArrowUp');

  await expect
    .poll(() => transactionNames(group))
    .toEqual(['Balance A', 'Balance D', 'Balance C', 'Balance B']);
  await expect(balance('Balance A')).toContainText('499');
  await expect(balance('Balance D')).toContainText('399');
  await expect(balance('Balance C')).toContainText('899');
  await expect(balance('Balance B')).toContainText('949');
});

test('LEDGER-09: phone scrolling stays within the dragged date group', async ({
  demoPage: page,
}) => {
  test.skip(test.info().project.name !== 'iphone-portrait', 'Checks phone Ledger scrolling');
  await seedLedger(page, 20);
  await openLedger(page);

  const group = dayGroup(page);
  const scroller = page.locator('[data-ledger-scroll-body]');
  await group.evaluate(element => element.scrollIntoView({ block: 'start' }));
  const startScroll = await scroller.evaluate(element => element.scrollTop);
  expect(startScroll).toBeGreaterThan(0);

  const firstNote = (await transactionNames(group))[0];
  if (!firstNote) throw new Error('The Ledger date group has no transactions');
  const firstRow = group.locator('.cursor-pointer').filter({ hasText: firstNote });
  const handle = firstRow.getByRole('button', {
    name: `Reorder ${firstNote} within this date. Drag or use arrow keys.`,
  });
  const handleBox = await handle.boundingBox();
  expect(handleBox).not.toBeNull();
  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    handleBox!.x + handleBox!.width / 2,
    handleBox!.y + handleBox!.height / 2 + 12,
    {
      steps: 4,
    }
  );

  await scroller.evaluate(element => {
    element.scrollTop = 0;
  });
  await expect
    .poll(() => scroller.evaluate(element => element.scrollTop))
    .toBeGreaterThanOrEqual(startScroll - 1);

  await scroller.evaluate(element => {
    element.scrollTop = element.scrollHeight;
  });
  await expect
    .poll(async () => {
      const groupBounds = await group.boundingBox();
      const viewportBounds = await scroller.boundingBox();
      return groupBounds && viewportBounds
        ? groupBounds.y + groupBounds.height - (viewportBounds.y + viewportBounds.height)
        : Infinity;
    })
    .toBeLessThanOrEqual(2);
  await page.mouse.up();
});

test('LEDGER-18: phone Ledger scrolling is vertical without horizontal panning', async ({
  demoPage: page,
}) => {
  test.skip(test.info().project.name !== 'iphone-portrait', 'Checks phone Ledger scrolling');
  await seedLedger(page, 20);
  await openLedger(page);

  const frame = page.locator('[data-ledger-scroll-frame]');
  const rows = page.locator('[data-ledger-scroll-body]');
  await expect(frame).toHaveCSS('overflow-x', 'clip');
  await expect(frame).toHaveCSS('touch-action', 'pan-y');
  await expect(rows).toHaveCSS('overflow-y', 'scroll');
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
      )
    )
    .toBe(true);
});

test('LEDGER-19: phone Ledger rows stay separated after scroll and list updates', async ({
  demoPage: page,
}) => {
  test.skip(test.info().project.name !== 'iphone-portrait', 'Checks phone Ledger row layout');
  await seedLedger(page, 20);
  await openLedger(page);

  const scroller = page.locator('[data-ledger-scroll-body]');
  const group = dayGroup(page);
  const rows = group.locator('[data-ledger-row]');
  await expect(rows).toHaveCount(20);

  const addTransaction = async () => {
    await page.evaluate(() => {
      const app = window as typeof window & { useDataStore?: { getState: () => DataState } };
      const store = app.useDataStore?.getState();
      if (!store) throw new Error('Demo store is unavailable');
      const accountId = store.accounts.find(
        account => account.name === 'Ledger Reorder Account'
      )?.id;
      const methodId = store.methods.find(method => method.name === 'Ledger Reorder Method')?.id;
      const targetId = store.categories.find(
        category => category.head === 'Ledger Reorder Category'
      )?.id;
      if (!accountId || !methodId || !targetId) throw new Error('Ledger fixture is incomplete');
      store.addTransaction({
        date: '2024-03-15',
        uiType: 'expense',
        amount: 7,
        accountId,
        methodId,
        targetId,
        note: 'Layout update row',
      });
    });
  };

  const expectRowsSeparated = async () => {
    await expect
      .poll(() =>
        group.evaluate(element => {
          const rowRects = Array.from(
            element.querySelectorAll<HTMLElement>('[data-ledger-row]')
          ).map(row => row.getBoundingClientRect());
          return Math.max(
            0,
            ...rowRects.slice(1).map((row, index) => Math.abs(row.top - rowRects[index].bottom))
          );
        })
      )
      .toBeLessThanOrEqual(1);
  };

  await expectRowsSeparated();
  await scroller.evaluate(element => {
    element.scrollTop = element.scrollHeight;
  });
  await expectRowsSeparated();
  await scroller.evaluate(element => {
    element.scrollTop = 0;
  });
  await addTransaction();
  await expect(rows).toHaveCount(21);
  await expectRowsSeparated();
});

test('LEDGER-21: mobile Columns lists fixed and optional Ledger columns', async ({
  seededDemoPage: page,
}) => {
  test.skip((page.viewportSize()?.width ?? 0) >= 768, 'Checks the phone Columns sheet');
  await openLedger(page);

  await page.getByRole('button', { name: 'Columns' }).click();
  const sheet = page.getByRole('dialog', { name: 'Columns' });
  await expect(sheet).toBeVisible();

  for (const column of ['Date', 'Description', 'Amount']) {
    const checkbox = sheet.getByRole('checkbox', { name: column, exact: true });
    await expect(checkbox).toBeChecked();
    await expect(checkbox).toBeDisabled();
  }

  for (const column of ['Category', 'Account']) {
    const checkbox = sheet.getByRole('checkbox', { name: column, exact: true });
    await expect(checkbox).toBeEnabled();
    await expect(checkbox).not.toBeChecked();
  }

  const row = page.locator('[data-ledger-row]').first();
  const description = row.locator('[data-ledger-description-cell]');
  const initialDescriptionWidth = (await description.boundingBox())?.width;
  expect(initialDescriptionWidth).toBeDefined();

  await sheet.getByRole('checkbox', { name: 'Category', exact: true }).click();
  await sheet.getByRole('checkbox', { name: 'Account', exact: true }).click();
  const expandedDescriptionWidth = (await description.boundingBox())?.width;
  expect(expandedDescriptionWidth).toBeDefined();
  expect(Math.abs(expandedDescriptionWidth! - initialDescriptionWidth!)).toBeLessThanOrEqual(1);
  const scrollFrame = page.locator('[data-ledger-scroll-frame]');
  const frameClientWidth = await scrollFrame.evaluate(element => element.clientWidth);
  await expect
    .poll(() => scrollFrame.evaluate(element => element.scrollWidth))
    .toBeGreaterThan(frameClientWidth);

  const balanceCheckbox = sheet.getByRole('checkbox', { name: /^Balance/ });
  await expect(balanceCheckbox).not.toBeChecked();
  await expect(balanceCheckbox).toBeDisabled();
});
