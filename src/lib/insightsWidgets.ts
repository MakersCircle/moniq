import type { Account, Category, Transaction } from '../types';

export interface SpendingPacePoint {
  day: number;
  date: string;
  thisMonth: number;
  lastMonth: number;
  typicalMonth: number;
}

export interface ContributionMonthPoint {
  month: string;
  label: string;
  openingSavings: number;
  openingInvestments: number;
  openingTotal: number;
  savingsMonthly: number;
  investmentMonthly: number;
  savings: number;
  investments: number;
  total: number;
}

const toISODate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const toMonthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const monthLength = (year: number, monthIndex: number) =>
  new Date(year, monthIndex + 1, 0).getDate();

function expensesByDay(transactions: Transaction[], monthKey: string) {
  const totals = new Map<number, number>();
  for (const transaction of transactions) {
    if (
      transaction.isDeleted ||
      transaction.uiType !== 'expense' ||
      !transaction.date.startsWith(`${monthKey}-`)
    ) {
      continue;
    }
    const day = Number(transaction.date.slice(8, 10));
    totals.set(day, (totals.get(day) || 0) + Math.max(0, transaction.amount));
  }
  return totals;
}

/** Builds daily cumulative expenses for this month, last month, and three completed months. */
export function buildSpendingPaceData(
  transactions: Transaction[],
  currentDate = new Date()
): SpendingPacePoint[] {
  const year = currentDate.getFullYear();
  const monthIndex = currentDate.getMonth();
  const today = currentDate.getDate();
  const currentMonth = toMonthKey(new Date(year, monthIndex, 1));
  const previousMonthDate = new Date(year, monthIndex - 1, 1);
  const previousMonth = toMonthKey(previousMonthDate);
  const currentByDay = expensesByDay(transactions, currentMonth);
  const previousByDay = expensesByDay(transactions, previousMonth);
  const typicalMonths = [1, 2, 3].map(offset => {
    const date = new Date(year, monthIndex - offset, 1);
    return {
      year: date.getFullYear(),
      monthIndex: date.getMonth(),
      byDay: expensesByDay(transactions, toMonthKey(date)),
    };
  });

  let currentTotal = 0;
  let previousTotal = 0;
  const typicalTotals = [0, 0, 0];
  const points: SpendingPacePoint[] = [];

  for (let day = 1; day <= today; day++) {
    currentTotal += currentByDay.get(day) || 0;
    const previousDay = monthLength(previousMonthDate.getFullYear(), previousMonthDate.getMonth());
    if (day <= previousDay) previousTotal += previousByDay.get(day) || 0;

    for (const [index, month] of typicalMonths.entries()) {
      const cappedDay = Math.min(day, monthLength(month.year, month.monthIndex));
      if (day <= cappedDay) typicalTotals[index] += month.byDay.get(day) || 0;
    }

    points.push({
      day,
      date: toISODate(new Date(year, monthIndex, day)),
      thisMonth: currentTotal,
      lastMonth: previousTotal,
      typicalMonth: typicalTotals.reduce((sum, total) => sum + total, 0) / typicalMonths.length,
    });
  }

  return points;
}

/**
 * Builds a rolling monthly view of savings and investment balances. Opening
 * balances enter in the month each account/category was created, and earlier
 * activity seeds the first visible point in the 12-month view.
 */
export function buildContributionTrendData(
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[],
  currentDate = new Date(),
  monthCount: number | 'all' = 12
): ContributionMonthPoint[] {
  const savingsAccounts = new Map(
    accounts.filter(account => account.isSavings).map(account => [account.id, account])
  );
  const investmentCategories = new Map(
    categories
      .filter(category => category.group === 'Invest')
      .map(category => [category.id, category])
  );
  const endDate = toISODate(currentDate);
  const openingBalances = new Map<string, { savings: number; investments: number }>();
  const monthlyChanges = new Map<string, { savings: number; investments: number }>();
  let firstActivity: string | null = null;
  const monthlyValues = (
    source: Map<string, { savings: number; investments: number }>,
    month: string
  ) => {
    let total = source.get(month);
    if (!total) {
      total = { savings: 0, investments: 0 };
      source.set(month, total);
    }
    return total;
  };
  const recordActivityDate = (date: string) => {
    if (firstActivity === null || date < firstActivity) firstActivity = date;
  };
  const creationDate = (createdAt: string) => {
    const parsed = new Date(createdAt);
    return Number.isNaN(parsed.getTime()) ? endDate : toISODate(parsed);
  };

  for (const account of savingsAccounts.values()) {
    if (account.initialBalance === 0) continue;
    const date = creationDate(account.createdAt);
    if (date > endDate) continue;
    monthlyValues(openingBalances, date.slice(0, 7)).savings += account.initialBalance;
    recordActivityDate(date);
  }
  for (const category of investmentCategories.values()) {
    const initialBalance = category.initialBalance || 0;
    if (initialBalance === 0) continue;
    const date = creationDate(category.createdAt);
    if (date > endDate) continue;
    monthlyValues(openingBalances, date.slice(0, 7)).investments += initialBalance;
    recordActivityDate(date);
  }

  for (const transaction of transactions) {
    if (
      transaction.isDeleted ||
      transaction.date > endDate ||
      !/^\d{4}-\d{2}-\d{2}$/.test(transaction.date)
    ) {
      continue;
    }

    const relevantEntries = transaction.entries.filter(
      entry =>
        entry.amount > 0 &&
        (savingsAccounts.has(entry.accountId) || investmentCategories.has(entry.accountId))
    );
    if (!relevantEntries.length) continue;
    recordActivityDate(transaction.date);
    const monthTotal = monthlyValues(monthlyChanges, transaction.date.slice(0, 7));

    for (const entry of relevantEntries) {
      const account = savingsAccounts.get(entry.accountId);
      if (account) {
        const debitSign = account.type === 'Liability' ? -1 : 1;
        monthTotal.savings += (entry.type === 'DEBIT' ? debitSign : -debitSign) * entry.amount;
      }
      if (investmentCategories.has(entry.accountId)) {
        monthTotal.investments += (entry.type === 'DEBIT' ? 1 : -1) * entry.amount;
      }
    }
  }

  const earliestActivity = firstActivity as string | null;
  const count =
    monthCount === 'all'
      ? earliestActivity
        ? (currentDate.getFullYear() - Number(earliestActivity.slice(0, 4))) * 12 +
          currentDate.getMonth() -
          (Number(earliestActivity.slice(5, 7)) - 1) +
          1
        : 12
      : Math.max(1, Math.floor(monthCount));
  const firstMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - count + 1, 1);
  const monthKeys = Array.from({ length: count }, (_, index) =>
    toMonthKey(new Date(firstMonth.getFullYear(), firstMonth.getMonth() + index, 1))
  );
  const firstVisibleMonth = monthKeys[0];
  let savings = 0;
  let investments = 0;
  for (const [month, value] of openingBalances) {
    if (month < firstVisibleMonth) {
      savings += value.savings;
      investments += value.investments;
    }
  }
  for (const [month, value] of monthlyChanges) {
    if (month < firstVisibleMonth) {
      savings += value.savings;
      investments += value.investments;
    }
  }
  const firstMonthOpening = openingBalances.get(firstVisibleMonth) || {
    savings: 0,
    investments: 0,
  };
  savings += firstMonthOpening.savings;
  investments += firstMonthOpening.investments;
  const openingSavings = savings;
  const openingInvestments = investments;
  const openingTotal = openingSavings + openingInvestments;

  return monthKeys.map(month => {
    const monthOpening =
      month === firstVisibleMonth
        ? { savings: 0, investments: 0 }
        : openingBalances.get(month) || { savings: 0, investments: 0 };
    const monthChange = monthlyChanges.get(month) || { savings: 0, investments: 0 };
    const savingsChange = monthOpening.savings + monthChange.savings;
    const investmentChange = monthOpening.investments + monthChange.investments;
    savings += savingsChange;
    investments += investmentChange;
    const [year, monthNumber] = month.split('-').map(Number);
    const date = new Date(year, monthNumber - 1, 1);
    return {
      month,
      label: `${date.toLocaleDateString('en-IN', { month: 'short' })}${monthNumber === 1 ? ` '${String(year).slice(-2)}` : ''}`,
      openingSavings,
      openingInvestments,
      openingTotal,
      savingsMonthly: savingsChange,
      investmentMonthly: investmentChange,
      savings,
      investments,
      total: savings + investments,
    };
  });
}
