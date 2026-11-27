import { expect, test } from './fixtures/demo';

const desktopAndPhone = () => ['desktop', 'iphone-portrait'].includes(test.info().project.name);

test('INSIGHT-02: category bars show subcategories and group overflow within the chart width', async ({
  demoPage: page,
}) => {
  test.skip(!desktopAndPhone(), 'Checks compact category spending on desktop and phone layouts');

  await page.evaluate(() => {
    const app = window as typeof window & {
      useDataStore?: {
        getState: () => {
          addAccount: (
            account: object,
            methodName?: string
          ) => { accountId: string; methodId: string };
          addCategory: (category: object) => { id: string };
          addTransaction: (transaction: object) => void;
        };
      };
    };
    const store = app.useDataStore?.getState();
    if (!store) throw new Error('Demo store is unavailable');
    const account = store.addAccount(
      {
        name: 'Category Chart Account',
        type: 'Asset',
        initialBalance: 0,
        isSavings: false,
        excludeFromNet: false,
        isActive: true,
      },
      'Category Chart Method'
    );
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const addExpense = (head: string, amount: number, subHead?: string) => {
      const category = store.addCategory({ group: 'Needs', head, subHead, isActive: true });
      store.addTransaction({
        date,
        uiType: 'expense',
        amount,
        accountId: account.accountId,
        targetId: category.id,
        methodId: account.methodId,
        note: `${head} expense`,
      });
    };

    addExpense('Food', 300, 'Groceries');
    addExpense('Food', 120, 'Dining');
    for (let index = 1; index <= 14; index++) {
      addExpense(`Category ${index}`, 280 - index * 5);
    }
  });

  await page.getByRole('link', { name: 'Insights', exact: true }).click();
  const chart = page.getByTestId('category-spending-chart');
  await expect(chart).toBeVisible();
  await expect(chart).toHaveAttribute('data-has-other', 'true');
  const firstBar = chart.locator('.recharts-bar-rectangle').first();
  await expect(firstBar).toBeVisible();
  if (test.info().project.name === 'iphone-portrait') await firstBar.tap();
  else await firstBar.hover();
  const tooltip = chart.locator('.recharts-tooltip-wrapper');
  await expect(tooltip.getByText('Groceries', { exact: true })).toBeVisible();
  await expect(tooltip.getByText('Dining', { exact: true })).toBeVisible();
  await expect(tooltip.getByText('$300', { exact: true })).toBeVisible();
  await expect(tooltip.getByText('$120', { exact: true })).toBeVisible();
  await expect(tooltip.getByText('$420', { exact: true })).toBeVisible();
});
