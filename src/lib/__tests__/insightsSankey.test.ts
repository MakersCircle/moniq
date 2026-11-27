import { describe, expect, it } from 'vitest';
import type { Category, Transaction } from '../../types';
import { buildInsightsSankeyChartData, buildInsightsSankeyData } from '../insightsSankey';

const categories: Category[] = [
  {
    id: 'salary',
    group: 'Income',
    head: 'Salary',
    subHead: 'Base pay',
    isActive: true,
    isDeleted: false,
    createdAt: 'created',
    updatedAt: 'updated',
  },
  {
    id: 'food',
    group: 'Needs',
    head: 'Food',
    subHead: 'Groceries',
    isActive: true,
    isDeleted: false,
    createdAt: 'created',
    updatedAt: 'updated',
  },
];

const transaction = (
  id: string,
  uiType: Transaction['uiType'],
  date: string,
  amount: number,
  accountId: string,
  entryType: 'CREDIT' | 'DEBIT',
  isDeleted = false
): Transaction => ({
  id,
  groupId: id,
  date,
  amount,
  entries: [{ accountId, type: entryType, amount }],
  uiType,
  note: id,
  isDeleted,
  createdAt: 'created',
  updatedAt: 'updated',
});

const range = { startDate: '2026-11-01', endDate: '2026-11-30' };

describe('Insights Sankey data', () => {
  it('builds category flows, excludes transfers and deleted or out-of-range transactions, and balances unspent income', () => {
    const data = buildInsightsSankeyData(
      [
        transaction('income', 'income', '2026-11-01', 1000, 'salary', 'CREDIT'),
        transaction('expense', 'expense', '2026-11-12', 600, 'food', 'DEBIT'),
        transaction('transfer', 'transfer', '2026-11-13', 200, 'food', 'DEBIT'),
        transaction('deleted', 'expense', '2026-11-14', 300, 'food', 'DEBIT', true),
        transaction('outside', 'expense', '2026-12-01', 400, 'food', 'DEBIT'),
      ],
      categories,
      range
    );

    expect(data.nodes.map(node => node.label)).toContain('Base pay');
    expect(data.nodes.map(node => node.label)).toContain('Groceries');
    expect(data.nodes.find(node => node.label === 'Total income')?.flowValue).toBe(1000);
    expect(data.nodes.find(node => node.label === 'Total expenses')?.flowValue).toBe(600);
    expect(data.nodes.find(node => node.label === 'Unspent income')?.flowValue).toBe(400);
    expect(data.links.reduce((sum, link) => sum + link.value, 0)).toBe(4800);
  });

  it('collapses only subcategory nodes on mobile and remaps links without changing their values', () => {
    const data = buildInsightsSankeyData(
      [
        transaction('income', 'income', '2026-11-01', 1000, 'salary', 'CREDIT'),
        transaction('expense', 'expense', '2026-11-12', 600, 'food', 'DEBIT'),
      ],
      categories,
      range
    );
    const desktop = buildInsightsSankeyChartData(data);
    const mobile = buildInsightsSankeyChartData(data, true);
    const visibleMobileNodes = new Set(mobile.nodes.map(node => node.name));
    const labelsForLinks = mobile.links.map(link => [
      data.nodes.find(node => node.name === mobile.nodes[link.source].name)?.label,
      data.nodes.find(node => node.name === mobile.nodes[link.target].name)?.label,
    ]);

    expect(desktop.nodes).toHaveLength(data.nodes.length);
    expect(mobile.nodes.length).toBeLessThan(desktop.nodes.length);
    expect(
      data.nodes
        .filter(node => node.stage === 0 || node.stage === 6)
        .every(node => !visibleMobileNodes.has(node.name))
    ).toBe(true);
    expect(labelsForLinks).toContainEqual(['Salary', 'Total income']);
    expect(labelsForLinks).toContainEqual(['Needs', 'Food']);
    expect(mobile.links.reduce((sum, link) => sum + link.value, 0)).toBe(
      desktop.links.reduce((sum, link) => sum + link.value, 0) - 1600
    );
  });
});
