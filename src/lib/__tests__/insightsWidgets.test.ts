import { describe, expect, it } from 'vitest';
import type { Account, Category, Transaction } from '../../types';
import { buildContributionTrendData, buildSpendingPaceData } from '../insightsWidgets';

const transaction = (
  id: string,
  date: string,
  uiType: Transaction['uiType'],
  amount: number,
  entries: Transaction['entries'],
  isDeleted = false
): Transaction => ({
  id,
  groupId: id,
  date,
  uiType,
  amount,
  entries,
  note: id,
  isDeleted,
  createdAt: 'created',
  updatedAt: 'updated',
});

const makeAccount = (id: string, isSavings: boolean, initialBalance = 0): Account => ({
  id,
  name: id,
  type: 'Asset',
  isSavings,
  initialBalance,
  isActive: true,
  isDeleted: false,
  createdAt: 'created',
  updatedAt: 'updated',
});

const makeCategory = (id: string, group: Category['group']): Category => ({
  id,
  group,
  head: id,
  isActive: true,
  isDeleted: false,
  createdAt: 'created',
  updatedAt: 'updated',
});

describe('Insights spending pace data', () => {
  it('compares cumulative current-month expenses with last month and three completed months', () => {
    const data = buildSpendingPaceData(
      [
        transaction('aug', '2026-08-15', 'expense', 40, []),
        transaction('sep', '2026-09-10', 'expense', 20, []),
        transaction('oct-1', '2026-10-01', 'expense', 10, []),
        transaction('oct-15', '2026-10-15', 'expense', 30, []),
        transaction('nov-1', '2026-11-01', 'expense', 5, []),
        transaction('nov-15', '2026-11-15', 'expense', 15, []),
        transaction('future', '2026-11-20', 'expense', 90, []),
        transaction('transfer', '2026-11-10', 'transfer', 200, []),
        transaction('deleted', '2026-11-12', 'expense', 99, [], true),
      ],
      new Date(2026, 10, 15)
    );

    expect(data).toHaveLength(15);
    expect(data[9]).toMatchObject({ day: 10, thisMonth: 5, lastMonth: 10, typicalMonth: 10 });
    expect(data[14]).toMatchObject({ day: 15, thisMonth: 20, lastMonth: 40 });
    expect(data[14].typicalMonth).toBeCloseTo(100 / 3);
  });

  it('holds the previous-month line at the final day for shorter months', () => {
    const data = buildSpendingPaceData(
      [
        transaction('dec', '2025-12-31', 'expense', 40, []),
        transaction('jan', '2026-01-31', 'expense', 30, []),
        transaction('feb', '2026-02-28', 'expense', 50, []),
      ],
      new Date(2026, 2, 31)
    );

    expect(data).toHaveLength(31);
    expect(data[27]).toMatchObject({ day: 28, lastMonth: 50 });
    expect(data[30]).toMatchObject({ day: 31, lastMonth: 50 });
    expect(data[27].typicalMonth).toBeCloseTo(50 / 3);
    expect(data[30].typicalMonth).toBe(40);
  });
});

describe('Insights contribution trend data', () => {
  it('tracks net savings account changes and Invest category balances without double-counting internal transfers', () => {
    const accounts = [
      makeAccount('checking', false),
      makeAccount('savings-a', true, 5000),
      makeAccount('savings-b', true),
    ];
    const categories = [makeCategory('invest', 'Invest'), makeCategory('food', 'Needs')];
    const transactions = [
      transaction('to-savings', '2026-10-05', 'transfer', 100, [
        { accountId: 'savings-a', type: 'DEBIT', amount: 100 },
        { accountId: 'checking', type: 'CREDIT', amount: 100 },
      ]),
      transaction('between-savings', '2026-10-10', 'transfer', 40, [
        { accountId: 'savings-b', type: 'DEBIT', amount: 40 },
        { accountId: 'savings-a', type: 'CREDIT', amount: 40 },
      ]),
      transaction('spend-savings', '2026-10-12', 'expense', 60, [
        { accountId: 'food', type: 'DEBIT', amount: 60 },
        { accountId: 'savings-a', type: 'CREDIT', amount: 60 },
      ]),
      transaction('invest', '2026-10-15', 'expense', 30, [
        { accountId: 'invest', type: 'DEBIT', amount: 30 },
        { accountId: 'checking', type: 'CREDIT', amount: 30 },
      ]),
      transaction('split-invest', '2026-10-20', 'expense', 20, [
        { accountId: 'invest', type: 'DEBIT', amount: 10 },
        { accountId: 'food', type: 'DEBIT', amount: 10 },
        { accountId: 'checking', type: 'CREDIT', amount: 20 },
      ]),
      transaction('invest-return', '2026-10-25', 'income', 5, [
        { accountId: 'checking', type: 'DEBIT', amount: 5 },
        { accountId: 'invest', type: 'CREDIT', amount: 5 },
      ]),
      transaction('nov-savings', '2026-11-01', 'transfer', 25, [
        { accountId: 'savings-a', type: 'DEBIT', amount: 25 },
        { accountId: 'checking', type: 'CREDIT', amount: 25 },
      ]),
      transaction(
        'deleted',
        '2026-11-02',
        'transfer',
        200,
        [{ accountId: 'savings-a', type: 'DEBIT', amount: 200 }],
        true
      ),
    ];

    const data = buildContributionTrendData(
      transactions,
      accounts,
      categories,
      new Date(2026, 10, 15),
      2
    );

    expect(data).toHaveLength(2);
    expect(data[0]).toMatchObject({
      month: '2026-10',
      savingsMonthly: 40,
      investmentMonthly: 35,
      savings: 40,
      investments: 35,
      total: 75,
    });
    expect(data[1]).toMatchObject({
      month: '2026-11',
      savingsMonthly: 25,
      investmentMonthly: 0,
      savings: 65,
      investments: 35,
      total: 100,
    });
  });

  it('fills quiet months with zero contributions and returns a 12-month window by default', () => {
    const data = buildContributionTrendData([], [], [], new Date(2026, 10, 15));

    expect(data).toHaveLength(12);
    expect(data[0].month).toBe('2025-12');
    expect(data[data.length - 1]).toMatchObject({ savings: 0, investments: 0, total: 0 });
  });

  it('extends the contribution chart from its earliest activity in all-time mode', () => {
    const accounts = [makeAccount('savings', true)];
    const transactions = [
      transaction('old', '2025-05-05', 'transfer', 500, [
        { accountId: 'savings', type: 'DEBIT', amount: 500 },
      ]),
      transaction('recent', '2026-11-02', 'transfer', 100, [
        { accountId: 'savings', type: 'DEBIT', amount: 100 },
      ]),
      transaction('future', '2026-12-02', 'transfer', 900, [
        { accountId: 'savings', type: 'DEBIT', amount: 900 },
      ]),
      transaction(
        'deleted',
        '2025-04-01',
        'transfer',
        700,
        [{ accountId: 'savings', type: 'DEBIT', amount: 700 }],
        true
      ),
    ];

    const data = buildContributionTrendData(
      transactions,
      accounts,
      [],
      new Date(2026, 10, 15),
      'all'
    );

    expect(data).toHaveLength(19);
    expect(data[0]).toMatchObject({ month: '2025-05', savings: 500, total: 500 });
    expect(data[data.length - 1]).toMatchObject({
      month: '2026-11',
      savings: 600,
      total: 600,
    });
  });
});
