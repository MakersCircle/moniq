import type { Category, Transaction } from '../types';

export interface InsightsDateRange {
  startDate: string;
  endDate: string;
}

export interface InsightsCategorySpend {
  label: string;
  amount: number;
  group: string;
}

export interface InsightsMonthSummary {
  label: string;
  month: string;
  income: number;
  expenses: number;
  net: number;
}

export function buildInsightsPeriodData(
  transactions: Transaction[],
  categories: Category[],
  range: InsightsDateRange | null
) {
  if (!range || !range.startDate || !range.endDate || range.startDate > range.endDate) {
    return {
      categorySpend: [] as InsightsCategorySpend[],
      historicalData: [] as InsightsMonthSummary[],
    };
  }

  const categoryById = new Map(categories.map(category => [category.id, category]));
  const categoryAmounts = new Map<string, InsightsCategorySpend>();
  const monthAmounts = new Map<string, Omit<InsightsMonthSummary, 'label' | 'month' | 'net'>>();
  const startMonth = range.startDate.slice(0, 7);
  const endMonth = range.endDate.slice(0, 7);

  for (const transaction of transactions) {
    if (
      transaction.isDeleted ||
      transaction.date < range.startDate ||
      transaction.date > range.endDate ||
      (transaction.uiType !== 'income' && transaction.uiType !== 'expense')
    ) {
      continue;
    }

    const month = transaction.date.slice(0, 7);
    const summary = monthAmounts.get(month) || { income: 0, expenses: 0 };
    if (transaction.uiType === 'income') summary.income += transaction.amount;
    else summary.expenses += transaction.amount;
    monthAmounts.set(month, summary);

    if (transaction.uiType !== 'expense') continue;

    for (const entry of transaction.entries) {
      if (entry.type !== 'DEBIT' || entry.amount <= 0) continue;
      const category = categoryById.get(entry.accountId);
      if (!category) continue;

      const key = `${category.group}:${category.head}`;
      const current = categoryAmounts.get(key);
      if (current) current.amount += entry.amount;
      else {
        categoryAmounts.set(key, {
          label: category.head,
          amount: entry.amount,
          group: category.group,
        });
      }
    }
  }

  const startParts = startMonth.split('-').map(Number);
  const endParts = endMonth.split('-').map(Number);
  const cursor = new Date(startParts[0], startParts[1] - 1, 1);
  const lastMonth = new Date(endParts[0], endParts[1] - 1, 1);
  const spansYears = startParts[0] !== endParts[0];
  const historicalData: InsightsMonthSummary[] = [];

  while (cursor <= lastMonth) {
    const month = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
    const values = monthAmounts.get(month) || { income: 0, expenses: 0 };
    historicalData.push({
      label: cursor.toLocaleDateString('en-IN', {
        month: 'short',
        ...(spansYears ? { year: '2-digit' } : {}),
      }),
      month,
      income: values.income,
      expenses: values.expenses,
      net: values.income - values.expenses,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return {
    categorySpend: Array.from(categoryAmounts.values()).sort((a, b) => b.amount - a.amount),
    historicalData,
  };
}
