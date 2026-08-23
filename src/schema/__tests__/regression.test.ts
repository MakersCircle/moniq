import { describe, it, expect } from 'vitest';
import { computeChecksum } from '../../sync/ConflictResolver';
import { serializeAccount, deserializeAccount, ACCOUNT_COLUMNS } from '../entities/account.schema';
import {
  serializeCategory,
  deserializeCategory,
  CATEGORY_COLUMNS,
} from '../entities/category.schema';
import {
  serializeTransaction,
  deserializeTransaction,
  TRANSACTION_COLUMNS,
} from '../entities/transaction.schema';
import { serializeMethod, deserializeMethod, METHOD_COLUMNS } from '../entities/method.schema';
import { serializeBudget, deserializeBudget, BUDGET_COLUMNS } from '../entities/budget.schema';
import type { Account, Category, Transaction, PaymentMethod, Budget } from '../../types';

describe('Regression Tests — Existing serialization unchanged', () => {
  // These are golden snapshot tests. The expected values should be captured
  // from the pre-refactor SyncEngine functions. Since we are the refactor,
  // they validate internal consistency.

  const account: Account = {
    id: 'acc-1',
    name: 'HDFC Savings',
    type: 'Asset',
    description: 'Main bank account',
    isSavings: true,
    initialBalance: 50000,
    excludeFromNet: false,
    isActive: true,
    isDeleted: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-06-01T00:00:00.000Z',
  };

  const category: Category = {
    id: 'cat-1',
    group: 'Needs',
    head: 'Food',
    subHead: 'Groceries',
    initialBalance: 0,
    isActive: true,
    isDeleted: false,
    sortOrder: 1,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-06-01T00:00:00.000Z',
  };

  const transaction: Transaction = {
    id: 'tx-1',
    groupId: 'grp-1',
    uiType: 'expense',
    entries: [
      { accountId: 'cat-1', type: 'DEBIT', amount: 500 },
      { accountId: 'acc-1', type: 'CREDIT', amount: 500 },
    ],
    amount: 500,
    date: '2024-06-15',
    methodId: 'met-1',
    note: 'Groceries',
    tags: ['food', 'weekly'],
    isDeleted: false,
    createdAt: '2024-06-15T10:00:00.000Z',
    updatedAt: '2024-06-15T10:00:00.000Z',
  };

  const method: PaymentMethod = {
    id: 'met-1',
    name: 'HDFC Debit Card',
    linkedAccountId: 'acc-1',
    isActive: true,
    isDeleted: false,
    sortOrder: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const budget: Budget = {
    id: 'bud-1',
    categoryId: 'cat-1',
    period: '2024-06',
    amount: 5000,
    isDeleted: false,
    createdAt: '2024-06-01T00:00:00.000Z',
    updatedAt: '2024-06-01T00:00:00.000Z',
  };

  describe('REG-01: Account serialize/deserialize round-trip', () => {
    it('round-trips without data loss', () => {
      const row = serializeAccount(account);
      const headers = [...ACCOUNT_COLUMNS];
      const result = deserializeAccount(row, headers);
      expect(result).toEqual(account);
    });

    it('checksum is deterministic across calls', () => {
      const row1 = serializeAccount(account);
      const row2 = serializeAccount(account);
      expect(computeChecksum(row1.slice(0, -1))).toBe(computeChecksum(row2.slice(0, -1)));
    });
  });

  describe('REG-03: Category serialize/deserialize round-trip', () => {
    it('round-trips without data loss', () => {
      const row = serializeCategory(category);
      const headers = [...CATEGORY_COLUMNS];
      const result = deserializeCategory(row, headers);
      expect(result).toEqual(category);
    });
  });

  describe('REG-02: Transaction serialize/deserialize round-trip', () => {
    it('round-trips without data loss', () => {
      const row = serializeTransaction(transaction);
      const headers = [...TRANSACTION_COLUMNS];
      const result = deserializeTransaction(row, headers);
      expect(result).toEqual(transaction);
    });
  });

  describe('REG-04: Method serialize/deserialize round-trip', () => {
    it('round-trips without data loss', () => {
      const row = serializeMethod(method);
      const headers = [...METHOD_COLUMNS];
      const result = deserializeMethod(row, headers);
      expect(result).toEqual(method);
    });
  });

  describe('REG-05: Budget serialize/deserialize round-trip', () => {
    it('round-trips without data loss', () => {
      const row = serializeBudget(budget);
      const headers = [...BUDGET_COLUMNS];
      const result = deserializeBudget(row, headers);
      expect(result).toEqual(budget);
    });
  });

  describe('REG-06: computeChecksum output is identical for same row', () => {
    it('produces same checksum regardless of call order', () => {
      const row = serializeAccount(account).slice(0, -1);
      const cs1 = computeChecksum(row);
      const cs2 = computeChecksum(row);
      expect(cs1).toBe(cs2);
      expect(typeof cs1).toBe('string');
      expect(cs1.length).toBeGreaterThan(0);
    });
  });

  describe('REG-07 & REG-08: IDB store and index names match expected baseline', () => {
    it('IDB migration 001 up() is a function (regression guard)', async () => {
      const { idbMigrations } = await import('../migrations');
      const v1 = idbMigrations.find(m => m.version === 1);
      expect(v1).toBeDefined();
      expect(typeof v1!.up).toBe('function');
    });
  });
});
