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
 * Builds a rolling monthly view of net money set aside. Savings follows the
 * ledger balance changes of savings-tagged accounts; investments follow the
 * normal balance changes of Invest categories. Opening balances are excluded.
 */
export function buildContributionTrendData(
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[],
  currentDate = new Date(),
  monthCount: number | 'all' = 12
): ContributionMonthPoint[] {
  const savingsAccounts = new Set(accounts.filter(account => account.isSavings).map(a => a.id));
  const investmentCategories = new Set(
    categories.filter(category => category.group === 'Invest').map(category => category.id)
  );
  const firstActivity =
    monthCount === 'all'
      ? transactions
          .filter(
            transaction =>
              !transaction.isDeleted &&
              transaction.date <= toISODate(currentDate) &&
              transaction.entries.some(
                entry =>
                  entry.amount > 0 &&
                  (savingsAccounts.has(entry.accountId) ||
                    investmentCategories.has(entry.accountId))
              )
          )
          .reduce(
            (first, transaction) =>
              first === null || transaction.date < first ? transaction.date : first,
            null as string | null
          )
      : null;
  const count =
    monthCount === 'all'
      ? firstActivity
        ? (currentDate.getFullYear() - Number(firstActivity.slice(0, 4))) * 12 +
          currentDate.getMonth() -
          (Number(firstActivity.slice(5, 7)) - 1) +
          1
        : 12
      : Math.max(1, Math.floor(monthCount));
  const firstMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - count + 1, 1);
  const monthKeys = Array.from({ length: count }, (_, index) =>
    toMonthKey(new Date(firstMonth.getFullYear(), firstMonth.getMonth() + index, 1))
  );
  const startDate = `${monthKeys[0]}-01`;
  const endDate = toISODate(currentDate);
  const totals = new Map(monthKeys.map(month => [month, { savings: 0, investments: 0 }]));

  for (const transaction of transactions) {
    if (transaction.isDeleted || transaction.date < startDate || transaction.date > endDate) {
      continue;
    }

    const monthTotal = totals.get(transaction.date.slice(0, 7));
    if (!monthTotal) continue;

    for (const entry of transaction.entries) {
      if (entry.amount <= 0) continue;
      const sign = entry.type === 'DEBIT' ? 1 : -1;
      if (savingsAccounts.has(entry.accountId)) monthTotal.savings += sign * entry.amount;
      if (investmentCategories.has(entry.accountId)) monthTotal.investments += sign * entry.amount;
    }
  }

  let savings = 0;
  let investments = 0;
  return monthKeys.map(month => {
    const value = totals.get(month) || { savings: 0, investments: 0 };
    savings += value.savings;
    investments += value.investments;
    const [year, monthNumber] = month.split('-').map(Number);
    const date = new Date(year, monthNumber - 1, 1);
    return {
      month,
      label: `${date.toLocaleDateString('en-IN', { month: 'short' })}${monthNumber === 1 ? ` '${String(year).slice(-2)}` : ''}`,
      savingsMonthly: value.savings,
      investmentMonthly: value.investments,
      savings,
      investments,
      total: savings + investments,
    };
  });
}
