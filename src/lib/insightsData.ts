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

export interface DailyCashflowDay {
  date: string;
  day: number;
  income: number;
  spent: number;
  net: number;
}

export interface DailyCashflowWeek {
  index: number;
  days: (DailyCashflowDay | null)[];
}

export interface DailyCashflowMonthLabel {
  label: string;
  weekIndex: number;
}

export interface DailyCashflowCalendar {
  year: number;
  weeks: DailyCashflowWeek[];
  monthLabels: DailyCashflowMonthLabel[];
  days: DailyCashflowDay[];
}

/** Builds a Sunday-first, year-wide heatmap calendar from income and expense activity. */
export function buildDailyCashflowHeatmapData(
  transactions: Transaction[],
  year: number
): DailyCashflowCalendar {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const totals = new Map<string, { income: number; spent: number }>();
  for (const transaction of transactions) {
    if (
      transaction.isDeleted ||
      transaction.date < yearStart ||
      transaction.date > yearEnd ||
      (transaction.uiType !== 'income' && transaction.uiType !== 'expense')
    ) {
      continue;
    }
    const day = totals.get(transaction.date) || { income: 0, spent: 0 };
    if (transaction.uiType === 'income') day.income += transaction.amount;
    else day.spent += transaction.amount;
    totals.set(transaction.date, day);
  }

  const firstWeekday = new Date(year, 0, 1).getDay();
  const dayCount = (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86_400_000;
  const weekCount = Math.ceil((firstWeekday + dayCount) / 7);
  const weeks = Array.from({ length: weekCount }, (_, index) => ({
    index,
    days: Array.from({ length: 7 }, () => null as DailyCashflowDay | null),
  }));
  const monthLabels: DailyCashflowMonthLabel[] = [];
  const days: DailyCashflowDay[] = [];

  for (let dayIndex = 0; dayIndex < dayCount; dayIndex++) {
    const cursor = new Date(year, 0, dayIndex + 1);
    const date = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    const weekIndex = Math.floor((firstWeekday + dayIndex) / 7);
    if (cursor.getDate() === 1) {
      monthLabels.push({
        label: cursor.toLocaleDateString('en-US', { month: 'short' }),
        weekIndex,
      });
    }
    const values = totals.get(date) || { income: 0, spent: 0 };
    const value = {
      date,
      day: cursor.getDate(),
      income: values.income,
      spent: values.spent,
      net: values.income - values.spent,
    };
    weeks[weekIndex].days[cursor.getDay()] = value;
    days.push(value);
  }

  return { year, weeks, monthLabels, days };
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
