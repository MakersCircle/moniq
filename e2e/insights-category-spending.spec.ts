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
    addExpense('Rent', 415);
    for (let index = 1; index <= 14; index++) {
      addExpense(`Category ${index}`, 280 - index * 5);
    }
  });

  await page.getByRole('link', { name: 'Insights', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Expense Trend' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Income vs Expenses' })).toBeVisible();
  const trend = page.getByTestId('income-expense-trend-chart');
  await expect(trend).toBeVisible();
  await expect(trend).toHaveAttribute('data-month-count', '12');
  await expect(trend.getByText('Income', { exact: true })).toBeVisible();
  await expect(trend.getByText('Expenses', { exact: true })).toBeVisible();
  const headings = [
    'Spending by Category',
    'Spending pace',
    'Money flow',
    'Income vs Expenses',
    'Savings and investments',
    'Daily cash flow',
  ];
  const boxes = await Promise.all(
    headings.map(async name => {
      const heading = page.getByRole('heading', { name, exact: true });
      await expect(heading).toBeVisible();
      return (await heading.boundingBox())!;
    })
  );
  const [category, pace, flow, incomeExpenses, savings, cashflow] = boxes;
  if (test.info().project.name === 'iphone-portrait') {
    for (let index = 1; index < boxes.length; index++) {
      expect(boxes[index].y).toBeGreaterThan(boxes[index - 1].y);
    }
  } else {
    expect(category.x).toBeLessThan(pace.x);
    expect(Math.abs(category.y - pace.y)).toBeLessThan(8);
    expect(incomeExpenses.x).toBeLessThan(savings.x);
    expect(Math.abs(incomeExpenses.y - savings.y)).toBeLessThan(8);
    expect(flow.y).toBeGreaterThan(pace.y);
    expect(incomeExpenses.y).toBeGreaterThan(flow.y);
    expect(cashflow.y).toBeGreaterThan(savings.y);
  }
  const chart = page.getByTestId('category-spending-chart');
  await expect(chart).toBeVisible();
  await expect(chart).toHaveAttribute('data-has-other', 'true');
  const canvas = chart.locator('canvas').first();
  await expect(canvas).toBeVisible();
  const canvasBox = await canvas.boundingBox();
  expect(canvasBox!.height).toBeGreaterThan(200);
  const categoryCount = Number(await chart.getAttribute('data-visible-category-count'));
  const firstCategoryX = 52 + (canvasBox!.width - 64) / (categoryCount * 2);
  // Food has two segments and Rent has one. Both should contain bar paint
  // immediately above zero, at the center of their respective columns.
  await expect
    .poll(() =>
      canvas.evaluate((element, count) => {
        const { width, height } = element.getBoundingClientRect();
        const scaleX = element.width / width;
        const scaleY = element.height / height;
        const pitch = (width - 64) / count;
        const baseline = height - (count > 4 ? 58 : 40);
        const context = element.getContext('2d')!;
        return [0, 1].map(index => {
          const x = Math.floor((52 + pitch * (index + 0.5)) * scaleX);
          const y = Math.floor((baseline - 1.5) * scaleY);
          return Array.from(context.getImageData(x, y, 1, 1).data);
        });
      }, categoryCount)
    )
    .toEqual([
      [167, 139, 250, 255],
      [34, 211, 238, 255],
    ]);
  const plotY = canvasBox!.height / 2;
  if (test.info().project.name === 'iphone-portrait') {
    await canvas.tap({ position: { x: firstCategoryX, y: plotY } });
  } else {
    await canvas.hover({ position: { x: firstCategoryX, y: plotY } });
  }
  await expect(page.getByText('Groceries', { exact: true })).toBeVisible();
  await expect(page.getByText('Dining', { exact: true })).toBeVisible();
  await expect(page.getByText('$300', { exact: true })).toBeVisible();
  await expect(page.getByText('$120', { exact: true })).toBeVisible();
  await expect(page.getByText('$420', { exact: true })).toBeVisible();
});
