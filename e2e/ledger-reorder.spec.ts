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
                    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
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

  const firstRow = group.locator('.cursor-pointer').first();
  const handle = firstRow.getByRole('button', {
    name: 'Reorder Ledger A within this date. Drag or use arrow keys.',
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
