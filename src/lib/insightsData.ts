import type { Category, Transaction } from '../types';

export interface InsightsDateRange {
  startDate: string;
  endDate: string;
}

export interface InsightsCategorySpend {
  label: string;
  amount: number;
  group: string;
  subcategories: { label: string; amount: number }[];
}

export interface InsightsCategoryBarSeries {
  key: string;
  label: string;
  color: string;
}

export interface InsightsCategoryBarRow {
  label: string;
  group: string;
  amount: number;
  isOther: boolean;
  details: { label: string; amount: number }[];
  [key: string]: string | number | boolean | { label: string; amount: number }[];
}

export interface InsightsCategoryBarData {
  rows: InsightsCategoryBarRow[];
  series: InsightsCategoryBarSeries[];
}

export interface InsightsMonthSummary {
  [key: string]: string | number;
  label: string;
  month: string;
  income: number;
  expenses: number;
  net: number;
}

/** Builds inclusive monthly income/expense totals, retaining months with no activity. */
export function buildInsightsMonthlyTrendData(
  transactions: Transaction[],
  range: InsightsDateRange | null
): InsightsMonthSummary[] {
  if (!range || !range.startDate || !range.endDate || range.startDate > range.endDate) return [];

  const totals = new Map<string, { income: number; expenses: number }>();
  for (const transaction of transactions) {
    if (
      transaction.isDeleted ||
      transaction.date < range.startDate ||
      transaction.date > range.endDate ||
      (transaction.uiType !== 'income' && transaction.uiType !== 'expense')
    )
      continue;
    const month = transaction.date.slice(0, 7);
    const value = totals.get(month) || { income: 0, expenses: 0 };
    if (transaction.uiType === 'income') value.income += transaction.amount;
    else value.expenses += transaction.amount;
    totals.set(month, value);
  }

  const start = new Date(
    Number(range.startDate.slice(0, 4)),
    Number(range.startDate.slice(5, 7)) - 1,
    1
  );
  const end = new Date(Number(range.endDate.slice(0, 4)), Number(range.endDate.slice(5, 7)) - 1, 1);
  const spansYears = start.getFullYear() !== end.getFullYear();
  const result: InsightsMonthSummary[] = [];
  while (start <= end) {
    const month = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
    const value = totals.get(month) || { income: 0, expenses: 0 };
    result.push({
      label: start.toLocaleDateString('en-IN', {
        month: 'short',
        ...(spansYears ? { year: '2-digit' } : {}),
      }),
      month,
      income: value.income,
      expenses: value.expenses,
      net: value.income - value.expenses,
    });
    start.setMonth(start.getMonth() + 1);
  }
  return result;
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
    };
  }

  const categoryById = new Map(categories.map(category => [category.id, category]));
  const categoryAmounts = new Map<string, InsightsCategorySpend>();
  const subcategoryAmounts = new Map<string, Map<string, number>>();

  for (const transaction of transactions) {
    if (
      transaction.isDeleted ||
      transaction.date < range.startDate ||
      transaction.date > range.endDate ||
      (transaction.uiType !== 'income' && transaction.uiType !== 'expense')
    ) {
      continue;
    }

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
          subcategories: [],
        });
      }
      if (category.subHead) {
        const bySubcategory = subcategoryAmounts.get(key) || new Map<string, number>();
        bySubcategory.set(
          category.subHead,
          (bySubcategory.get(category.subHead) || 0) + entry.amount
        );
        subcategoryAmounts.set(key, bySubcategory);
      }
    }
  }

  const categorySpend = Array.from(categoryAmounts.entries())
    .map(([key, category]) => ({
      ...category,
      subcategories: Array.from(subcategoryAmounts.get(key) || [])
        .map(([label, amount]) => ({ label, amount }))
        .sort((a, b) => b.amount - a.amount),
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    categorySpend,
  };
}

/** Builds width-limited stacked category bars, preserving overflow details in an Other bar. */
export function buildInsightsCategoryBarData(
  categorySpend: InsightsCategorySpend[],
  maxBars: number
): InsightsCategoryBarData {
  const capacity = Math.max(1, Math.floor(maxBars));
  const sorted = [...categorySpend].sort((a, b) => b.amount - a.amount);
  const hasOther = sorted.length > capacity;
  const visible = hasOther ? sorted.slice(0, capacity - 1) : sorted;
  const overflow = hasOther ? sorted.slice(capacity - 1) : [];
  const series: InsightsCategoryBarSeries[] = [];
  const rows: InsightsCategoryBarRow[] = [];
  const colors = [
    '#a78bfa',
    '#22d3ee',
    '#f59e0b',
    '#fb7185',
    '#34d399',
    '#60a5fa',
    '#f472b6',
    '#facc15',
  ];

  const addRow = (
    label: string,
    group: string,
    amount: number,
    details: { label: string; amount: number }[],
    isOther: boolean
  ) => {
    const rowIndex = rows.length;
    const row: InsightsCategoryBarRow = { label, group, amount, isOther, details };
    details.forEach((detail, detailIndex) => {
      const key = `segment-${series.length}`;
      row[key] = detail.amount;
      series.push({
        key,
        label: detail.label,
        color: colors[(rowIndex + detailIndex) % colors.length],
      });
    });
    rows.push(row);
  };

  for (const category of visible) {
    const subcategoryTotal = category.subcategories.reduce((sum, item) => sum + item.amount, 0);
    const details = [...category.subcategories];
    const unassigned = Math.max(0, category.amount - subcategoryTotal);
    if (unassigned > 0) details.push({ label: category.label, amount: unassigned });
    if (details.length === 0) details.push({ label: category.label, amount: category.amount });
    addRow(category.label, category.group, category.amount, details, false);
  }

  if (overflow.length > 0) {
    addRow(
      'Other',
      '',
      overflow.reduce((sum, category) => sum + category.amount, 0),
      overflow.map(category => ({
        label: `${category.label} · ${category.group}`,
        amount: category.amount,
      })),
      true
    );
  }

  return { rows, series };
}
