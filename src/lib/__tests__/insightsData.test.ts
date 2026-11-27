import { describe, expect, it } from 'vitest';
import type { Transaction } from '../../types';
import { buildDailyCashflowHeatmapData } from '../insightsData';

const makeTransaction = (
  id: string,
  date: string,
  uiType: Transaction['uiType'],
  amount: number,
  isDeleted = false
): Transaction => ({
  id,
  groupId: id,
  date,
  uiType,
  amount,
  entries: [],
  note: id,
  isDeleted,
  createdAt: 'created',
  updatedAt: 'updated',
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
