import { expect, test } from './fixtures/demo';

const desktopAndPhone = () => ['desktop', 'iphone-portrait'].includes(test.info().project.name);

test('INSIGHT-05: spending pace shows current, previous, and typical monthly comparisons', async ({
  seededDemoPage: page,
}) => {
  test.skip(!desktopAndPhone(), 'Checks Insights widgets on desktop and phone layouts');

  await page.getByRole('link', { name: 'Insights', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Spending pace' })).toBeVisible();
  await expect(
    page.getByRole('img', {
      name: 'Daily cumulative expenses compared with last month and the recent average',
    })
  ).toBeVisible();
  await expect(page.getByText('This month', { exact: true })).toBeVisible();
  await expect(page.getByText('Last month', { exact: true })).toBeVisible();
  await expect(page.getByText('3-mo average', { exact: true })).toBeVisible();
  await expect(page.getByText('$250', { exact: true })).toBeVisible();
  const spendingPaceCard = page
    .getByRole('heading', { name: 'Spending pace' })
    .locator('xpath=../../..');
  await expect(
    spendingPaceCard.getByText('Last month', { exact: true }).locator('..').locator('span').first()
  ).toHaveCSS('border-top-color', 'rgb(34, 197, 94)');
  await expect(
    spendingPaceCard
      .getByText('3-mo average', { exact: true })
      .locator('..')
      .locator('span')
      .first()
  ).toHaveCSS('border-top-color', 'rgb(161, 161, 170)');
  await spendingPaceCard.getByRole('button', { name: 'Info' }).click();
  await expect(
    page
      .getByRole('dialog')
      .getByText(
        /same elapsed days last month and the average of the previous three completed months/i
      )
  ).toBeVisible();
  await spendingPaceCard.getByRole('button', { name: 'Info' }).click();

  await page.getByRole('button', { name: 'Date range' }).click();
  await page.getByRole('radio', { name: 'All Time' }).check();
  await expect(page.getByText(/\w+ \d{4} · through day \d+/)).toHaveCount(0);
  await expect(page.getByText('Cumulative net contributions · last 12 months')).toHaveCount(0);
});

test('INSIGHT-06: contribution card distinguishes savings from investments and explains its totals', async ({
  seededDemoPage: page,
}) => {
  test.skip(!desktopAndPhone(), 'Checks Insights widgets on desktop and phone layouts');

  await page.getByRole('link', { name: 'Insights', exact: true }).click();
  await expect(
    page.getByText('No savings or investment balance history recorded in the last 12 months.')
  ).toBeVisible();
  const contributionCard = page
    .getByRole('heading', { name: 'Savings and investments' })
    .locator('xpath=../../..');
  await contributionCard.getByRole('button', { name: 'All' }).click();
  await expect(
    page.getByText('No savings or investment balance history recorded in all available history.')
  ).toBeVisible();

  await page.evaluate(() => {
    const app = window as typeof window & {
      useDataStore?: {
        getState: () => {
          accounts: { id: string; name: string }[];
          methods: { id: string; linkedAccountId?: string }[];
          addAccount: (
            account: object,
            methodName?: string
          ) => { accountId: string; methodId: string };
          addCategory: (category: object) => { id: string };
          updateAccount: (id: string, patch: object) => void;
          updateCategory: (id: string, patch: object) => void;
          addTransaction: (transaction: object) => void;
        };
      };
    };
    const store = app.useDataStore?.getState();
    if (!store) throw new Error('Demo store is unavailable');
    const checking = store.accounts.find(account => account.name === 'Fixture Checking');
    const checkingMethod = store.methods.find(method => method.linkedAccountId === checking?.id);
    if (!checking || !checkingMethod) throw new Error('Fixture checking account is unavailable');

    const savings = store.addAccount(
      {
        name: 'Fixture Savings',
        type: 'Asset',
        initialBalance: 5000,
        isSavings: true,
        excludeFromNet: false,
        isActive: true,
      },
      'Fixture Savings Method'
    );
    const now = new Date();
    const openingDate = new Date(now.getFullYear(), now.getMonth() - 24, 1).toISOString();
    store.updateAccount(savings.accountId, { createdAt: openingDate });
    const investment = store.addCategory({
      group: 'Invest',
      head: 'Fixture Fund',
      initialBalance: 1200,
      isActive: true,
    });
    store.updateCategory(investment.id, { createdAt: openingDate });
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    store.addTransaction({
      date,
      uiType: 'transfer',
      amount: 300,
      accountId: checking.id,
      targetId: savings.accountId,
      methodId: checkingMethod.id,
      note: 'Savings contribution',
    });
    store.addTransaction({
      date,
      uiType: 'expense',
      amount: 150,
      accountId: checking.id,
      targetId: investment.id,
      methodId: checkingMethod.id,
      note: 'Investment contribution',
    });
    const olderDate = new Date(now.getFullYear(), now.getMonth() - 18, 1);
    const olderDateValue = `${olderDate.getFullYear()}-${String(olderDate.getMonth() + 1).padStart(2, '0')}-${String(olderDate.getDate()).padStart(2, '0')}`;
    store.addTransaction({
      date: olderDateValue,
      uiType: 'transfer',
      amount: 3000,
      accountId: checking.id,
      targetId: savings.accountId,
      methodId: checkingMethod.id,
      note: 'Older savings contribution',
    });
  });

  const contributionsCard = page
    .getByRole('heading', { name: 'Savings and investments' })
    .locator('xpath=../../..');
  await expect(contributionsCard).toBeVisible();
  const rangeGroup = contributionsCard.getByRole('group', { name: 'Balance chart range' });
  await rangeGroup.getByRole('button', { name: '12M' }).click();
  await expect(rangeGroup.getByRole('button', { name: '12M' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await expect(rangeGroup.getByRole('button', { name: 'All' })).toHaveAttribute(
    'aria-pressed',
    'false'
  );
  await expect(
    contributionsCard.getByRole('img', {
      name: 'Savings and investment balances over the last 12 months',
    })
  ).toBeVisible();
  await expect(contributionsCard.getByTestId('contribution-chart')).toHaveAttribute(
    'data-y-axis-min',
    '1200'
  );
  await expect(
    contributionsCard.getByTestId('contribution-chart').locator('.recharts-line')
  ).toHaveCount(3);
  await expect(contributionsCard.getByText('Savings', { exact: true })).toBeVisible();
  await expect(contributionsCard.getByText('Investments', { exact: true })).toBeVisible();
  await expect(contributionsCard.getByText('Total balance', { exact: true })).toBeVisible();
  await expect(contributionsCard.getByText('$8.3K', { exact: true }).first()).toBeVisible();
  await expect(contributionsCard.getByText('$1.4K', { exact: true }).first()).toBeVisible();
  await expect(contributionsCard.getByText('$9.7K', { exact: true }).first()).toBeVisible();
  await rangeGroup.getByRole('button', { name: 'All' }).click();
  await expect(contributionsCard.getByText('$8.3K', { exact: true }).first()).toBeVisible();
  await expect(contributionsCard.getByTestId('contribution-chart')).toHaveAttribute(
    'data-y-axis-min',
    '1200'
  );
  await expect(
    contributionsCard.getByRole('img', {
      name: 'Savings and investment balances over all available history',
    })
  ).toBeVisible();
  await contributionsCard.getByRole('button', { name: 'Info' }).click();
  await expect(
    page
      .getByRole('dialog')
      .getByText(
        /over all available history.*including opening balances.*does not represent investment returns or market value/i
      )
  ).toBeVisible();
});

test('INSIGHT-05/06: income-only history shows the empty state for both progress widgets', async ({
  demoPage: page,
}) => {
  test.skip(!desktopAndPhone(), 'Checks empty widget states on desktop and phone layouts');

  await page.evaluate(() => {
    const app = window as typeof window & {
      useDataStore?: {
        getState: () => {
          addAccount: (
            account: object,
            methodName?: string
          ) => {
            accountId: string;
            methodId: string;
          };
          addCategory: (category: object) => { id: string };
          addTransaction: (transaction: object) => void;
        };
      };
    };
    const store = app.useDataStore?.getState();
    if (!store) throw new Error('Demo store is unavailable');
    const account = store.addAccount(
      {
        name: 'Income Only Account',
        type: 'Asset',
        initialBalance: 0,
        isSavings: false,
        excludeFromNet: false,
        isActive: true,
      },
      'Income Only Method'
    );
    const salary = store.addCategory({ group: 'Income', head: 'Salary', isActive: true });
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    store.addTransaction({
      date,
      uiType: 'income',
      amount: 1000,
      accountId: account.accountId,
      targetId: salary.id,
      methodId: account.methodId,
      note: 'Income only fixture',
    });
  });

  await page.getByRole('link', { name: 'Insights', exact: true }).click();
  await expect(page.getByText('No spending history to compare yet.')).toBeVisible();
  await expect(
    page.getByText('No savings or investment balance history recorded in the last 12 months.')
  ).toBeVisible();
  await expect(
    page.getByRole('img', {
      name: 'Daily cumulative expenses compared with last month and the recent average',
    })
  ).toHaveCount(0);
  await expect(
    page.getByRole('img', {
      name: 'Savings and investment balances over the last 12 months',
    })
  ).toHaveCount(0);
});
