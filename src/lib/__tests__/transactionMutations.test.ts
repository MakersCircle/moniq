import { describe, expect, it } from 'vitest';
import type { Transaction } from '../../types';
import { LedgerEngine } from '../ledger';
import { patchTransaction, softDeleteTransaction } from '../transactionMutations';

const expense: Transaction = {
  id: 'expense',
  groupId: 'group-expense',
  date: '2026-10-15',
  amount: 250,
  entries: LedgerEngine.createEntries({
    type: 'expense',
    amount: 250,
    accountId: 'checking',
    targetId: 'food',
  }),
  uiType: 'expense',
  methodId: 'debit-card',
  note: 'Groceries',
  isDeleted: false,
  createdAt: 'created',
  updatedAt: 'old',
};

const income: Transaction = {
  ...expense,
  id: 'income',
  groupId: 'group-income',
  amount: 2000,
  entries: LedgerEngine.createEntries({
    type: 'income',
    amount: 2000,
    accountId: 'checking',
    targetId: 'salary',
  }),
  uiType: 'income',
  note: 'Paycheck',
};

describe('transaction mutations', () => {
  it('replaces the edited amount, note, and ledger entries without changing another record', () => {
    const newEntries = LedgerEngine.createEntries({
      type: 'expense',
      amount: 350,
      accountId: 'checking',
      targetId: 'rent',
    });
    const result = patchTransaction(
      [expense, income],
      'expense',
      { amount: 350, entries: newEntries, note: 'Rent' },
      'edited'
    );

    expect(result.updated).toMatchObject({
      id: 'expense',
      groupId: 'group-expense',
      amount: 350,
      entries: newEntries,
      note: 'Rent',
      updatedAt: 'edited',
      isDeleted: false,
    });
    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0]).toBe(result.updated);
    expect(result.transactions[1]).toBe(income);
    expect(expense.amount).toBe(250);
    expect(expense.updatedAt).toBe('old');
  });

  it('soft-deletes only the selected transaction and retains its data for recovery', () => {
    const result = softDeleteTransaction([expense, income], 'expense', 'deleted');

    expect(result.updated).toMatchObject({
      id: 'expense',
      amount: 250,
      note: 'Groceries',
      entries: expense.entries,
      isDeleted: true,
      updatedAt: 'deleted',
    });
    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[1]).toBe(income);
    expect(expense.isDeleted).toBe(false);
  });

  it('leaves records untouched when the id does not exist', () => {
    const result = patchTransaction([expense, income], 'missing', { amount: 1 }, 'edited');
    expect(result.updated).toBeUndefined();
    expect(result.transactions).toEqual([expense, income]);
    expect(result.transactions[0]).toBe(expense);
    expect(result.transactions[1]).toBe(income);
  });
});
