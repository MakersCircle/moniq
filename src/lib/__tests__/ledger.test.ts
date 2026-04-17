import { describe, it, expect } from 'vitest';
import { LedgerEngine } from '../ledger';
import type { Account, Category, Transaction, LedgerEntry } from '../../types';

describe('LedgerEngine', () => {
  const mockAccounts: Account[] = [
    { id: 'acc-1', name: 'Savings Account', type: 'Asset', subType: 'Bank', initialBalance: 1000, isSavings: true, excludeFromNet: false, isActive: true, createdAt: '' },
    { id: 'acc-2', name: 'Credit Card', type: 'Liability', subType: 'Credit Card', initialBalance: 0, isSavings: false, excludeFromNet: false, isActive: true, createdAt: '' },
  ];

  const mockCategories: Category[] = [
    { id: 'cat-1', group: 'Needs', head: 'Food', subHead: 'Groceries', isActive: true, createdAt: '' },
    { id: 'cat-2', group: 'Income', head: 'Salary', isActive: true, createdAt: '' },
  ];

  describe('validate()', () => {
    it('should validate balanced entries', () => {
      const entries: LedgerEntry[] = [
        { accountId: 'acc-1', type: 'DEBIT', amount: 100 },
        { accountId: 'cat-1', type: 'CREDIT', amount: 100 },
      ];
      expect(LedgerEngine.validate(entries)).toBe(true);
    });

    it('should fail unbalanced entries', () => {
      const entries: LedgerEntry[] = [
        { accountId: 'acc-1', type: 'DEBIT', amount: 100 },
        { accountId: 'cat-1', type: 'CREDIT', amount: 99.9 },
      ];
      expect(LedgerEngine.validate(entries)).toBe(false);
    });
  });

  describe('createEntries()', () => {
    it('should create correct income entries', () => {
      const entries = LedgerEngine.createEntries({
        type: 'income',
        amount: 5000,
        accountId: 'acc-1',
        targetId: 'cat-2'
      });
      expect(entries).toHaveLength(2);
      expect(entries.find(e => e.accountId === 'acc-1')?.type).toBe('DEBIT');  // Asset increase
      expect(entries.find(e => e.accountId === 'cat-2')?.type).toBe('CREDIT'); // Revenue increase
      expect(LedgerEngine.validate(entries)).toBe(true);
    });

    it('should create correct expense entries', () => {
      const entries = LedgerEngine.createEntries({
        type: 'expense',
        amount: 50,
        accountId: 'acc-1',
        targetId: 'cat-1'
      });
      expect(entries).toHaveLength(2);
      expect(entries.find(e => e.accountId === 'cat-1')?.type).toBe('DEBIT');  // Expense increase
      expect(entries.find(e => e.accountId === 'acc-1')?.type).toBe('CREDIT'); // Asset decrease
      expect(LedgerEngine.validate(entries)).toBe(true);
    });

    it('should create correct transfer entries', () => {
      const entries = LedgerEngine.createEntries({
        type: 'transfer',
        amount: 200,
        accountId: 'acc-1',
        targetId: 'acc-2'
      });
      expect(entries).toHaveLength(2);
      expect(entries.find(e => e.accountId === 'acc-2')?.type).toBe('DEBIT');  // Dest Asset increase / Liab decrease
      expect(entries.find(e => e.accountId === 'acc-1')?.type).toBe('CREDIT'); // Source Asset decrease
      expect(LedgerEngine.validate(entries)).toBe(true);
    });
  });

  describe('getNormalBalance()', () => {
    it('should incorporate initial balance for assets', () => {
      const balance = LedgerEngine.getNormalBalance('acc-1', [], mockAccounts, mockCategories);
      expect(balance).toBe(1000);
    });

    it('should increase asset balance with DEBIT and decrease with CREDIT', () => {
      const txns: Transaction[] = [
        {
          id: 't1', groupId: 'g1', date: '2024-01-01', amount: 100, isDeleted: false, note: '', createdAt: '', updatedAt: '', uiType: 'income',
          entries: [
            { accountId: 'acc-1', type: 'DEBIT', amount: 100 },
            { accountId: 'cat-2', type: 'CREDIT', amount: 100 },
          ]
        },
        {
          id: 't2', groupId: 'g2', date: '2024-01-02', amount: 40, isDeleted: false, note: '', createdAt: '', updatedAt: '', uiType: 'expense',
          entries: [
            { accountId: 'cat-1', type: 'DEBIT', amount: 40 },
            { accountId: 'acc-1', type: 'CREDIT', amount: 40 },
          ]
        }
      ];
      const balance = LedgerEngine.getNormalBalance('acc-1', txns, mockAccounts, mockCategories);
      // 1000 (initial) + 100 (debit) - 40 (credit) = 1060
      expect(balance).toBe(1060);
    });

    it('should increase liability balance with CREDIT and decrease with DEBIT', () => {
      const txns: Transaction[] = [
        {
          id: 't1', groupId: 'g1', date: '2024-01-01', amount: 200, isDeleted: false, note: '', createdAt: '', updatedAt: '', uiType: 'expense',
          entries: [
             { accountId: 'cat-1', type: 'DEBIT', amount: 200 },
             { accountId: 'acc-2', type: 'CREDIT', amount: 200 }, // Liability increased
          ]
        },
        {
          id: 't2', groupId: 'g2', date: '2024-01-02', amount: 50, isDeleted: false, note: '', createdAt: '', updatedAt: '', uiType: 'transfer',
          entries: [
             { accountId: 'acc-2', type: 'DEBIT', amount: 50 },  // Liability decreased (Card payment)
             { accountId: 'acc-1', type: 'CREDIT', amount: 50 },
          ]
        }
      ];
      const balance = LedgerEngine.getNormalBalance('acc-2', txns, mockAccounts, mockCategories);
      // 0 (initial) + 200 (credit) - 50 (debit) = 150
      expect(balance).toBe(150);
    });

    it('should calculate category spending accurately (Expense group)', () => {
      const txns: Transaction[] = [
        {
          id: 't1', groupId: 'g1', date: '2024-01-01', amount: 100, isDeleted: false, note: '', createdAt: '', updatedAt: '', uiType: 'expense',
          entries: [
            { accountId: 'cat-1', type: 'DEBIT', amount: 100 },
            { accountId: 'acc-1', type: 'CREDIT', amount: 100 },
          ]
        }
      ];
      const balance = LedgerEngine.getNormalBalance('cat-1', txns, mockAccounts, mockCategories);
      expect(balance).toBe(100);
    });

    it('should calculate category revenue accurately (Income group)', () => {
      const txns: Transaction[] = [
        {
          id: 't1', groupId: 'g1', date: '2024-01-01', amount: 1000, isDeleted: false, note: '', createdAt: '', updatedAt: '', uiType: 'income',
          entries: [
            { accountId: 'acc-1', type: 'DEBIT', amount: 1000 },
            { accountId: 'cat-2', type: 'CREDIT', amount: 1000 },
          ]
        }
      ];
      const balance = LedgerEngine.getNormalBalance('cat-2', txns, mockAccounts, mockCategories);
      expect(balance).toBe(1000);
    });
  });
});
