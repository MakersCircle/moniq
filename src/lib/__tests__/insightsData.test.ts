import { describe, expect, it } from 'vitest';
import type { Category, Transaction } from '../../types';
import {
  buildDailyCashflowHeatmapData,
  buildInsightsCategoryBarData,
  buildInsightsMonthlyTrendData,
  buildInsightsPeriodData,
} from '../insightsData';

const makeTransaction = (
  id: string,
  date: string,
  uiType: Transaction['uiType'],
  amount: number,
  isDeleted = false,
  entries: Transaction['entries'] = []
): Transaction => ({
  id,
  groupId: id,
  date,
  uiType,
  amount,
  entries,
  note: id,
  isDeleted,
  createdAt: 'created',
  updatedAt: 'updated',
});

const makeCategory = (id: string, head: string, subHead?: string): Category => ({
  id,
  group: 'Needs',
  head,
  subHead,
  isActive: true,
  isDeleted: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('Insights category spending data', () => {
  it('groups expense amounts by category and subcategory inside the selected range', () => {
    const categories = [
      makeCategory('food-grocery', 'Food', 'Groceries'),
      makeCategory('food-dining', 'Food', 'Dining'),
      makeCategory('food-other', 'Food'),
      makeCategory('rent', 'Rent'),
    ];
    const data = buildInsightsPeriodData(
      [
        makeTransaction('grocery', '2026-11-02', 'expense', 80, false, [
          { accountId: 'food-grocery', type: 'DEBIT', amount: 80 },
        ]),
        makeTransaction('dining', '2026-11-03', 'expense', 20, false, [
          { accountId: 'food-dining', type: 'DEBIT', amount: 20 },
        ]),
        makeTransaction('direct-food', '2026-11-04', 'expense', 10, false, [
          { accountId: 'food-other', type: 'DEBIT', amount: 10 },
        ]),
        makeTransaction('rent', '2026-11-05', 'expense', 50, false, [
          { accountId: 'rent', type: 'DEBIT', amount: 50 },
        ]),
        makeTransaction('transfer', '2026-11-06', 'transfer', 500, false, [
          { accountId: 'food-grocery', type: 'DEBIT', amount: 500 },
        ]),
        makeTransaction('deleted', '2026-11-07', 'expense', 700, true, [
          { accountId: 'food-dining', type: 'DEBIT', amount: 700 },
        ]),
      ],
      categories,
      { startDate: '2026-11-01', endDate: '2026-11-30' }
    );

    expect(data.categorySpend).toEqual([
      {
        label: 'Food',
        group: 'Needs',
        amount: 110,
        subcategories: [
          { label: 'Groceries', amount: 80 },
          { label: 'Dining', amount: 20 },
        ],
      },
      { label: 'Rent', group: 'Needs', amount: 50, subcategories: [] },
    ]);
  });

  it('limits category bars to width capacity and groups overflow by category in Other', () => {
    const categorySpend = Array.from({ length: 5 }, (_, index) => ({
      label: `Category ${index + 1}`,
      group: 'Needs',
      amount: 100 - index * 10,
      subcategories: [],
    }));
    const chart = buildInsightsCategoryBarData(categorySpend, 3);

    expect(chart.rows.map(row => row.label)).toEqual(['Category 1', 'Category 2', 'Other']);
    expect(chart.rows[0].details).toEqual([{ label: 'Category 1', amount: 100 }]);
    expect(chart.rows[2].details).toEqual([
      { label: 'Category 3 · Needs', amount: 80 },
      { label: 'Category 4 · Needs', amount: 70 },
      { label: 'Category 5 · Needs', amount: 60 },
    ]);
    expect(chart.rows[2].amount).toBe(210);
    expect(new Set(chart.series.map(series => series.color)).size).toBeGreaterThan(2);
    for (const row of chart.rows) {
      const activeSegments = chart.series.filter(series => Number(row[series.key]) > 0);
      expect(activeSegments.length).toBeGreaterThan(0);
      expect(activeSegments.reduce((sum, series) => sum + Number(row[series.key]), 0)).toBe(
        row.amount
      );
    }
  });
});

describe('Insights monthly income and expense trend', () => {
  it('returns twelve chronological months, fills quiet months with zero, and excludes transfers, deleted, and out-of-range records', () => {
    const data = buildInsightsMonthlyTrendData(
      [
        makeTransaction('income', '2025-12-05', 'income', 1200),
        makeTransaction('expense', '2026-11-02', 'expense', 450),
        makeTransaction('transfer', '2026-11-03', 'transfer', 900),
        makeTransaction('deleted', '2026-11-04', 'income', 700, true),
        makeTransaction('outside', '2025-11-30', 'income', 800),
      ],
      { startDate: '2025-12-01', endDate: '2026-11-30' }
    );

    expect(data).toHaveLength(12);
    expect(data[0]).toMatchObject({ month: '2025-12', income: 1200, expenses: 0 });
    expect(data[10]).toMatchObject({ month: '2026-10', income: 0, expenses: 0 });
    expect(data[11]).toMatchObject({ month: '2026-11', income: 0, expenses: 450, net: -450 });
  });
});

describe('buildDailyCashflowHeatmapData', () => {
  it('aggregates the selected calendar year and excludes transfers and deleted transactions', () => {
    const calendar = buildDailyCashflowHeatmapData(
      [
        makeTransaction('income-a', '2026-01-01', 'income', 800),
        makeTransaction('income-b', '2026-01-01', 'income', 200),
        makeTransaction('expense', '2026-01-01', 'expense', 300),
        makeTransaction('balanced-income', '2026-01-02', 'income', 400),
        makeTransaction('balanced-expense', '2026-01-02', 'expense', 400),
        makeTransaction('transfer', '2026-01-02', 'transfer', 900),
        makeTransaction('deleted', '2026-01-03', 'expense', 500, true),
        makeTransaction('previous-year', '2025-12-31', 'income', 2000),
        makeTransaction('next-year', '2027-01-01', 'income', 2000),
      ],
      2026
    );

    expect(calendar.year).toBe(2026);
    expect(calendar.days).toHaveLength(365);
    expect(calendar.weeks).toHaveLength(53);
    expect(calendar.monthLabels).toHaveLength(12);
    expect(calendar.monthLabels[0]).toMatchObject({ label: 'Jan', weekIndex: 0 });
    expect(calendar.monthLabels[calendar.monthLabels.length - 1]?.label).toBe('Dec');
    expect(calendar.days[0]).toMatchObject({
      date: '2026-01-01',
      income: 1000,
      spent: 300,
      net: 700,
    });
    expect(calendar.days[1]).toMatchObject({ date: '2026-01-02', income: 400, spent: 400, net: 0 });
    expect(calendar.days[2]).toMatchObject({ date: '2026-01-03', income: 0, spent: 0, net: 0 });
    expect(calendar.weeks[0].days[0]).toBeNull();
    expect(calendar.weeks[0].days[4]?.date).toBe('2026-01-01');
  });

  it('creates a leap-year grid and places month labels at their first week', () => {
    const calendar = buildDailyCashflowHeatmapData([], 2024);

    expect(calendar.days).toHaveLength(366);
    expect(calendar.days[calendar.days.length - 1]?.date).toBe('2024-12-31');
    expect(calendar.monthLabels.map(month => month.label)).toEqual([
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]);
    expect(calendar.weeks.flatMap(week => week.days).filter(Boolean)).toHaveLength(366);
  });
});
