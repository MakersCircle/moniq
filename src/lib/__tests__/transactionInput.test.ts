import { describe, expect, it } from 'vitest';
import type { Account, Category, Transaction } from '../../types';
import { LedgerEngine } from '../ledger';
import {
  computeExpectedBalance,
  computeSplitAllocation,
  getPreviewBalances,
  isValidTransactionInput,
  type TransactionInput,
} from '../transactionInput';

const validInput: TransactionInput = {
  amount: 100,
  date: '2026-10-16',
  type: 'expense',
  methodId: 'method-1',
  targetId: 'category-1',
  fromMethodId: '',
  toMethodId: '',
  isSplit: false,
  splits: [],
};

describe('transaction input', () => {
  it('requires a positive amount, parseable date, method, and category for a single entry', () => {
    expect(isValidTransactionInput(validInput)).toBe(true);
    expect(isValidTransactionInput({ ...validInput, amount: 0 })).toBe(false);
    expect(isValidTransactionInput({ ...validInput, amount: -1 })).toBe(false);
    expect(isValidTransactionInput({ ...validInput, date: '' })).toBe(false);
    expect(isValidTransactionInput({ ...validInput, date: 'invalid' })).toBe(false);
    expect(isValidTransactionInput({ ...validInput, methodId: '' })).toBe(false);
    expect(isValidTransactionInput({ ...validInput, targetId: '' })).toBe(false);
    expect(isValidTransactionInput({ ...validInput, type: 'income' })).toBe(true);
  });

  it('requires both transfer methods and does not require a category', () => {
    const transfer = {
      ...validInput,
      type: 'transfer' as const,
      methodId: '',
      targetId: '',
      fromMethodId: 'method-1',
      toMethodId: 'method-2',
    };
    expect(isValidTransactionInput(transfer)).toBe(true);
    expect(isValidTransactionInput({ ...transfer, fromMethodId: '' })).toBe(false);
    expect(isValidTransactionInput({ ...transfer, toMethodId: '' })).toBe(false);
  });

  it('gates a split on its total and every line having a positive amount and category', () => {
    const splits = [
      { categoryId: 'category-1', amount: '40.25' },
      { categoryId: 'category-2', amount: '59.75' },
    ];
    const splitInput = { ...validInput, targetId: '', isSplit: true, splits };
    expect(computeSplitAllocation(100, splits)).toMatchObject({
      allocated: 100,
      remaining: 0,
      isFullyAllocated: true,
    });
    expect(isValidTransactionInput(splitInput)).toBe(true);
    expect(isValidTransactionInput({ ...splitInput, splits: [splits[0]] })).toBe(false);
    expect(isValidTransactionInput({ ...splitInput, splits: [...splits, splits[0]] })).toBe(false);
    expect(
      isValidTransactionInput({
        ...splitInput,
        splits: [{ categoryId: '', amount: '40.25' }, splits[1]],
      })
    ).toBe(false);
    expect(
      isValidTransactionInput({
        ...splitInput,
        splits: [...splits, { categoryId: 'category-3', amount: '0' }],
      })
    ).toBe(false);
  });

  it('uses the existing strict one-cent tolerance for split allocation', () => {
    expect(
      computeSplitAllocation(100, [{ categoryId: 'a', amount: '99.995' }]).isFullyAllocated
    ).toBe(true);
    expect(
      computeSplitAllocation(100, [{ categoryId: 'a', amount: '99.98' }]).isFullyAllocated
    ).toBe(false);
  });
});

describe('balance preview', () => {
  const accounts: Account[] = [
    {
      id: 'checking',
      name: 'Checking',
      type: 'Asset',
      initialBalance: 1000,
      isSavings: false,
      isActive: true,
      isDeleted: false,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'savings',
      name: 'Savings',
      type: 'Asset',
      initialBalance: 200,
      isSavings: true,
      isActive: true,
      isDeleted: false,
      createdAt: '',
      updatedAt: '',
    },
  ];
  const categories: Category[] = [
    {
      id: 'food',
      group: 'Needs',
      head: 'Food',
      isActive: true,
      isDeleted: false,
      createdAt: '',
      updatedAt: '',
    },
  ];
  const expense: Transaction = {
    id: 'expense',
    groupId: 'expense',
    date: '2026-10-15',
    amount: 100,
    entries: LedgerEngine.createEntries({
      type: 'expense',
      amount: 100,
      accountId: 'checking',
      targetId: 'food',
    }),
    uiType: 'expense',
    note: '',
    isDeleted: false,
    createdAt: '',
    updatedAt: '',
  };
  const transfer: Transaction = {
    ...expense,
    id: 'transfer',
    groupId: 'transfer',
    uiType: 'transfer',
    amount: 50,
    entries: LedgerEngine.createEntries({
      type: 'transfer',
      amount: 50,
      accountId: 'checking',
      targetId: 'savings',
    }),
  };

  it('includes opening balances and active transactions while ignoring deleted ones', () => {
    const deleted = { ...expense, id: 'deleted', isDeleted: true };
    const balances = getPreviewBalances(
      ['checking', 'savings', 'checking', ''],
      [expense, transfer, deleted],
      accounts,
      categories
    );
    expect([...balances.entries()]).toEqual([
      ['checking', 850],
      ['savings', 250],
    ]);
  });

  it('excludes the original transaction for edit but includes it for duplicate', () => {
    const transactions = [expense, transfer];
    const edited = getPreviewBalances(
      ['checking', 'savings'],
      transactions,
      accounts,
      categories,
      'expense'
    );
    const duplicated = getPreviewBalances(
      ['checking', 'savings'],
      transactions,
      accounts,
      categories
    );
    expect(edited.get('checking')).toBe(950);
    expect(duplicated.get('checking')).toBe(850);
    expect(edited.get('savings')).toBe(250);
  });

  it('applies income and destination increases and expense and source decreases', () => {
    expect(computeExpectedBalance(950, 75, 'decrease')).toBe(875);
    expect(computeExpectedBalance(950, 75, 'increase')).toBe(1025);
    expect(computeExpectedBalance(250, 75, 'increase')).toBe(325);
  });
});
