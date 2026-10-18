import { describe, expect, it } from 'vitest';
import type { Account, Category, Transaction } from '@/types';
import { buildLedgerReport } from '../ledgerReport';
import { formatLedgerReportDate } from '../ledgerPdf';

const accounts: Account[] = [
  {
    id: 'checking',
    name: 'Checking',
    type: 'Asset',
    initialBalance: 100,
    isSavings: false,
    isActive: true,
    isDeleted: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'savings',
    name: 'Savings',
    type: 'Asset',
    initialBalance: 50,
    isSavings: true,
    isActive: true,
    isDeleted: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'hidden',
    name: 'Excluded',
    type: 'Asset',
    initialBalance: 500,
    isSavings: false,
    isActive: true,
    isDeleted: false,
    excludeFromNet: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
];

const categories: Category[] = [
  {
    id: 'salary',
    group: 'Income',
    head: 'Salary',
    isActive: true,
    isDeleted: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'food',
    group: 'Needs',
    head: 'Food',
    subHead: 'Groceries',
    isActive: true,
    isDeleted: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
];

function transaction(
  id: string,
  date: string,
  uiType: Transaction['uiType'],
  amount: number,
  entries: Transaction['entries'],
  sortOrder = 0,
  note = id
): Transaction {
  return {
    id,
    groupId: id,
    date,
    uiType,
    amount,
    entries,
    note,
    sortOrder,
    isDeleted: false,
    createdAt: `${date}T12:00:00.000Z`,
    updatedAt: `${date}T12:00:00.000Z`,
  };
}

const transactions: Transaction[] = [
  transaction('income-before', '2024-03-01', 'income', 80, [
    { accountId: 'checking', type: 'DEBIT', amount: 80 },
    { accountId: 'salary', type: 'CREDIT', amount: 80 },
  ]),
  transaction('expense', '2024-03-05', 'expense', 20, [
    { accountId: 'food', type: 'DEBIT', amount: 20 },
    { accountId: 'checking', type: 'CREDIT', amount: 20 },
  ]),
  transaction('transfer', '2024-03-06', 'transfer', 10, [
    { accountId: 'savings', type: 'DEBIT', amount: 10 },
    { accountId: 'checking', type: 'CREDIT', amount: 10 },
  ]),
  transaction('income-later', '2024-03-07', 'income', 30, [
    { accountId: 'checking', type: 'DEBIT', amount: 30 },
    { accountId: 'salary', type: 'CREDIT', amount: 30 },
  ]),
  transaction(
    'same-day-later-order',
    '2024-03-05',
    'expense',
    5,
    [
      { accountId: 'food', type: 'DEBIT', amount: 5 },
      { accountId: 'checking', type: 'CREDIT', amount: 5 },
    ],
    2
  ),
  {
    ...transaction('deleted', '2024-03-05', 'expense', 200, [
      { accountId: 'food', type: 'DEBIT', amount: 200 },
      { accountId: 'checking', type: 'CREDIT', amount: 200 },
    ]),
    isDeleted: true,
  },
];

describe('buildLedgerReport', () => {
  it('keeps rows ascending, splits category tables from transfers, and totals each type correctly', () => {
    const report = buildLedgerReport(transactions, accounts, categories, {
      startDate: '2024-03-05',
      endDate: '2024-03-06',
      layout: 'category',
    });

    expect(report.rows.map(row => row.transactionId)).toEqual([
      'expense',
      'same-day-later-order',
      'transfer',
    ]);
    expect(report.categories.map(category => [category.group, category.label])).toEqual([
      ['Needs', 'Food / Groceries'],
    ]);
    expect(report.categories[0].rows.map(row => row.transactionId)).toEqual([
      'expense',
      'same-day-later-order',
    ]);
    expect(report.transfers).toHaveLength(1);
    expect(report.transfers[0]).toMatchObject({
      fromAccount: 'Checking',
      toAccount: 'Savings',
      transfer: 10,
    });
    expect(report.income).toBe(0);
    expect(report.expense).toBe(25);
    expect(report.transferTotal).toBe(10);
    expect(report.netIncome).toBe(-25);
  });

  it('uses account history for period opening and closing balances and dashboard inclusion for NLA', () => {
    const report = buildLedgerReport(transactions, accounts, categories, {
      startDate: '2024-03-05',
      endDate: '2024-03-06',
      layout: 'full',
    });

    expect(
      report.accountBalances.map(balance => [balance.account, balance.opening, balance.closing])
    ).toEqual([
      ['Checking', 180, 145],
      ['Savings', 50, 60],
      ['Excluded', 500, 500],
    ]);
    expect(report.openingNetLiquidAssets).toBe(230);
    expect(report.closingNetLiquidAssets).toBe(205);
    expect(report.rows.find(row => row.transactionId === 'transfer')?.account).toBe(
      'Checking → Savings'
    );
  });

  it('filters report rows and account balances to a selected account without filtering historical balance activity', () => {
    const report = buildLedgerReport(transactions, accounts, categories, {
      startDate: '2024-03-05',
      endDate: '2024-03-06',
      accountId: 'savings',
      layout: 'full',
    });

    expect(report.rows.map(row => row.transactionId)).toEqual(['transfer']);
    expect(report.accountBalances).toHaveLength(1);
    expect(report.accountBalances[0]).toMatchObject({ opening: 50, closing: 60 });
    expect(report.openingNetLiquidAssets).toBe(50);
    expect(report.closingNetLiquidAssets).toBe(60);
    expect(report.transferTotal).toBe(10);
  });
});

describe('formatLedgerReportDate', () => {
  it('uses the standard report date pattern', () => {
    expect(formatLedgerReportDate('2024-03-05')).toBe('05 Mar 2024');
  });
});
