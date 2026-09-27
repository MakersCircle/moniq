import { expect, test as base, type Page } from '@playwright/test';
import type { DataState } from '../../src/store/types';

type DemoFixtures = {
  demoPage: Page;
  seededDemoPage: Page;
};

/** Enter through the public UI so routing and demo setup run as they do for a user. */
export async function enterDemoMode(page: Page) {
  await page.goto('/');
  await page.getByTestId('try-demo').click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator('#main-scroll-container > div').first()).toContainText('Demo Mode');
}

/**
 * Seed ordinary store actions after entering demo mode. This is setup data, not
 * evidence that the account or transaction forms work. Wait for IndexedDB so a
 * test can reload immediately without racing the asynchronous store writes.
 */
export async function seedDemoData(page: Page) {
  await page.evaluate(() => {
    const app = window as typeof window & { useDataStore?: { getState: () => DataState } };
    if (!app.useDataStore) throw new Error('Demo seeding requires the Vite dev store');

    const store = app.useDataStore.getState();
    if (!store.isDemoMode) throw new Error('Enter demo mode before seeding');

    const { accountId, methodId } = store.addAccount(
      {
        name: 'Fixture Checking',
        type: 'Asset',
        initialBalance: 1000,
        isSavings: false,
        excludeFromNet: false,
        isActive: true,
      },
      'Fixture Debit Card'
    );
    const incomeId = store.addCategory({ group: 'Income', head: 'Fixture Salary', isActive: true }).id;
    const expenseId = store.addCategory({ group: 'Needs', head: 'Fixture Food', isActive: true }).id;
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    store.addTransaction({
      date,
      uiType: 'income',
      amount: 2000,
      accountId,
      targetId: incomeId,
      methodId,
      note: 'Fixture paycheck',
    });
    store.addTransaction({
      date,
      uiType: 'expense',
      amount: 250,
      accountId,
      targetId: expenseId,
      methodId,
      note: 'Fixture groceries',
    });
  });

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<number>((resolve, reject) => {
            const request = indexedDB.open('moniq-db');
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              const db = request.result;
              const count = db.transaction('transactions', 'readonly').objectStore('transactions').count();
              count.onerror = () => reject(count.error);
              count.onsuccess = () => {
                db.close();
                resolve(count.result);
              };
            };
          })
      )
    )
    .toBe(2);
}

export const test = base.extend<DemoFixtures>({
  demoPage: async ({ page }, use) => {
    await enterDemoMode(page);
    await use(page);
  },
  seededDemoPage: async ({ demoPage }, use) => {
    await seedDemoData(demoPage);
    await use(demoPage);
  },
});

export { expect } from '@playwright/test';
