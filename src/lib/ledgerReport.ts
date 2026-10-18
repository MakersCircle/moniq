import type { Account, Category, Transaction } from '@/types';
import { LedgerEngine } from './ledger';

export interface LedgerReportOptions {
  startDate: string;
  endDate: string;
  accountId?: string;
  layout: 'full' | 'category';
}

export interface LedgerReportRow {
  transactionId: string;
  date: string;
  account: string;
  note: string;
  income: number;
  expense: number;
  transfer: number;
}

export interface LedgerReportCategory {
  id: string;
  label: string;
  group: string;
  rows: LedgerReportRow[];
  income: number;
  expense: number;
}

export interface LedgerReportTransfer extends LedgerReportRow {
  fromAccount: string;
  toAccount: string;
}

export interface LedgerReportAccountBalance {
  accountId: string;
  account: string;
  opening: number;
  closing: number;
}

export interface LedgerReport {
  startDate: string;
  endDate: string;
  layout: LedgerReportOptions['layout'];
  rows: LedgerReportRow[];
  categories: LedgerReportCategory[];
  transfers: LedgerReportTransfer[];
  accountBalances: LedgerReportAccountBalance[];
  openingNetLiquidAssets: number;
  closingNetLiquidAssets: number;
  income: number;
  expense: number;
  transferTotal: number;
  netIncome: number;
}

const accountName = (accountId: string | undefined, accounts: Account[]) =>
  accounts.find(account => account.id === accountId)?.name || 'Unknown';

function compareTransactionsAscending(a: Transaction, b: Transaction) {
  const dateComparison = a.date.localeCompare(b.date);
  if (dateComparison !== 0) return dateComparison;
  const aOrder = a.sortOrder ?? Infinity;
  const bOrder = b.sortOrder ?? Infinity;
  return aOrder === bOrder ? a.createdAt.localeCompare(b.createdAt) : aOrder - bOrder;
}

function transactionMatchesAccount(txn: Transaction, accountId?: string) {
  return !accountId || txn.entries.some(entry => entry.accountId === accountId);
}

function accountBalanceAt(account: Account, transactions: Transaction[], asOfDate: string): number {
  const createdAt = new Date(account.createdAt);
  const createdDate = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}-${String(createdAt.getDate()).padStart(2, '0')}`;
  let balance = createdDate <= asOfDate ? account.initialBalance : 0;

  for (const transaction of transactions) {
    if (transaction.isDeleted || transaction.date > asOfDate) continue;
    for (const entry of transaction.entries) {
      if (entry.accountId !== account.id) continue;
      const isDebit = entry.type === 'DEBIT';
      balance +=
        account.type === 'Liability'
          ? isDebit
            ? -entry.amount
            : entry.amount
          : isDebit
            ? entry.amount
            : -entry.amount;
    }
  }

  return balance;
}

function netLiquidAssetsAt(
  accounts: Account[],
  transactions: Transaction[],
  asOfDate: string,
  selectedAccountId?: string
) {
  return accounts
    .filter(
      account =>
        account.isActive &&
        !account.isDeleted &&
        !account.excludeFromNet &&
        (!selectedAccountId || account.id === selectedAccountId)
    )
    .reduce((total, account) => {
      const balance = accountBalanceAt(account, transactions, asOfDate);
      return total + (account.type === 'Liability' ? -balance : balance);
    }, 0);
}

function formatCategory(category?: Category) {
  if (!category) return { id: 'uncategorized', group: '', label: 'Uncategorized' };
  return {
    id: category.id,
    group: category.group,
    label: category.subHead ? `${category.head} / ${category.subHead}` : category.head,
  };
}

/** Builds a filtered, ascending ledger report without mutating stored transactions. */
export function buildLedgerReport(
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[],
  options: LedgerReportOptions
): LedgerReport {
  const selectedAccounts = accounts.filter(
    account => !account.isDeleted && (!options.accountId || account.id === options.accountId)
  );
  const activeTransactions = transactions.filter(transaction => !transaction.isDeleted);
  const rowsTransactions = activeTransactions
    .filter(
      transaction =>
        transaction.date >= options.startDate &&
        transaction.date <= options.endDate &&
        transactionMatchesAccount(transaction, options.accountId)
    )
    .sort(compareTransactionsAscending);

  const categoryMap = new Map<string, LedgerReportCategory>();
  const rows: LedgerReportRow[] = [];
  const transfers: LedgerReportTransfer[] = [];
  let income = 0;
  let expense = 0;
  let transferTotal = 0;

  for (const transaction of rowsTransactions) {
    const isTransfer = transaction.uiType === 'transfer';
    const primaryEntry = LedgerEngine.getPrimaryAccountEntry(transaction, accounts);
    const transferDestination = isTransfer
      ? LedgerEngine.getTransferDestinationEntry(transaction, accounts)
      : undefined;
    const sourceName = accountName(primaryEntry?.accountId, accounts);
    const baseRow: LedgerReportRow = {
      transactionId: transaction.id,
      date: transaction.date,
      account: isTransfer
        ? `${sourceName} → ${accountName(transferDestination?.accountId, accounts)}`
        : sourceName,
      note: transaction.note || 'No description provided',
      income: transaction.uiType === 'income' ? transaction.amount : 0,
      expense: transaction.uiType === 'expense' ? transaction.amount : 0,
      transfer: isTransfer ? transaction.amount : 0,
    };
    rows.push(baseRow);

    if (transaction.uiType === 'income') income += transaction.amount;
    if (transaction.uiType === 'expense') expense += transaction.amount;

    if (isTransfer) {
      transferTotal += transaction.amount;
      transfers.push({
        ...baseRow,
        fromAccount: sourceName,
        toAccount: accountName(transferDestination?.accountId, accounts),
      });
      continue;
    }

    const categoryEntry = LedgerEngine.getCategoryEntry(transaction, categories);
    const category = formatCategory(categories.find(item => item.id === categoryEntry?.accountId));
    let table = categoryMap.get(category.id);
    if (!table) {
      table = {
        id: category.id,
        label: category.label,
        group: category.group,
        rows: [],
        income: 0,
        expense: 0,
      };
      categoryMap.set(category.id, table);
    }
    table.rows.push(baseRow);
    table.income += baseRow.income;
    table.expense += baseRow.expense;
  }

  const startBoundary = new Date(`${options.startDate}T00:00:00`);
  startBoundary.setDate(startBoundary.getDate() - 1);
  const openingDate = `${startBoundary.getFullYear()}-${String(startBoundary.getMonth() + 1).padStart(2, '0')}-${String(startBoundary.getDate()).padStart(2, '0')}`;
  const accountBalances = selectedAccounts.map(account => ({
    accountId: account.id,
    account: account.name,
    opening: accountBalanceAt(account, activeTransactions, openingDate),
    closing: accountBalanceAt(account, activeTransactions, options.endDate),
  }));

  return {
    startDate: options.startDate,
    endDate: options.endDate,
    layout: options.layout,
    rows,
    categories: [...categoryMap.values()].sort((a, b) =>
      `${a.group} ${a.label}`.localeCompare(`${b.group} ${b.label}`)
    ),
    transfers,
    accountBalances,
    openingNetLiquidAssets: netLiquidAssetsAt(
      accounts,
      activeTransactions,
      openingDate,
      options.accountId
    ),
    closingNetLiquidAssets: netLiquidAssetsAt(
      accounts,
      activeTransactions,
      options.endDate,
      options.accountId
    ),
    income,
    expense,
    transferTotal,
    netIncome: income - expense,
  };
}
