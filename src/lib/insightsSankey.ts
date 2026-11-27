import type { Category, Transaction } from '../types';
import type { InsightsDateRange } from './insightsData';

export interface InsightsSankeyNode {
  name: string;
  label: string;
  fill: string;
  kind: 'income' | 'expense' | 'total' | 'residual';
  labelSide: 'left' | 'right';
  stage: number;
  flowValue: number;
}

export interface InsightsSankeyData {
  nodes: InsightsSankeyNode[];
  links: { source: number; target: number; value: number }[];
}

export interface InsightsSankeyChartData {
  nodes: { name: string }[];
  links: { source: number; target: number; value: number }[];
}

/** Removes the subcategory stages for the compact phone Sankey. */
export function buildInsightsSankeyChartData(
  data: InsightsSankeyData,
  collapseSubcategories = false
): InsightsSankeyChartData {
  const visibleIndexes = data.nodes.flatMap((node, index) =>
    collapseSubcategories && (node.stage === 0 || node.stage === 6) ? [] : [index]
  );
  const oldToNew = new Map(visibleIndexes.map((oldIndex, newIndex) => [oldIndex, newIndex]));
  const nodes = visibleIndexes.map(index => ({ name: data.nodes[index].name }));
  const links = data.links.flatMap(link => {
    const source = oldToNew.get(link.source);
    const target = oldToNew.get(link.target);
    return source === undefined || target === undefined
      ? []
      : [{ source, target, value: link.value }];
  });

  return { nodes, links };
}

const INCOME_COLOR = '#22c55e';
const EXPENSE_COLOR = '#f43f5e';
const TOTAL_COLOR = '#863bff';
const RESIDUAL_COLOR = '#a1a1aa';

const GROUP_COLORS: Record<string, string> = {
  Needs: '#3b82f6',
  Wants: '#f59e0b',
  Invest: '#863bff',
  Lend: '#06b6d4',
  Borrow: '#8b5cf6',
};

/**
 * Builds a balanced, date-range income-to-spending flow. Split expenses are
 * already stored as individual categorized transactions, so their ledger
 * entries naturally contribute to their own category branches.
 */
export function buildInsightsSankeyData(
  transactions: Transaction[],
  categories: Category[],
  range: InsightsDateRange | null
): InsightsSankeyData {
  const categoryById = new Map(categories.map(category => [category.id, category]));
  const nodes: InsightsSankeyNode[] = [];
  const nodeIds = new Map<string, number>();
  const linksByPair = new Map<string, { source: number; target: number; value: number }>();

  const addNode = (
    id: string,
    name: string,
    fill: string,
    kind: InsightsSankeyNode['kind'],
    labelSide: InsightsSankeyNode['labelSide'],
    stage: number
  ) => {
    const existing = nodeIds.get(id);
    if (existing !== undefined) return existing;
    const index = nodes.length;
    nodes.push({ name: `node-${index}`, label: name, fill, kind, labelSide, stage, flowValue: 0 });
    nodeIds.set(id, index);
    return index;
  };

  const addLink = (source: number, target: number, value: number) => {
    if (!(value > 0)) return;
    const key = `${source}:${target}`;
    const existing = linksByPair.get(key);
    if (existing) existing.value += value;
    else linksByPair.set(key, { source, target, value });
  };

  let incomeTotal = 0;
  let expenseTotal = 0;
  const periodTransactions = range
    ? transactions.filter(
        transaction =>
          !transaction.isDeleted &&
          transaction.date >= range.startDate &&
          transaction.date <= range.endDate &&
          (transaction.uiType === 'income' || transaction.uiType === 'expense')
      )
    : [];

  for (const transaction of periodTransactions) {
    const isIncome = transaction.uiType === 'income';
    const entryType = isIncome ? 'CREDIT' : 'DEBIT';
    const matchingEntries = transaction.entries.filter(
      entry => entry.type === entryType && categoryById.has(entry.accountId) && entry.amount > 0
    );

    const categoryAmounts = new Map<string, number>();
    for (const entry of matchingEntries) {
      categoryAmounts.set(
        entry.accountId,
        (categoryAmounts.get(entry.accountId) || 0) + entry.amount
      );
    }

    // Keep malformed or legacy uncategorized activity visible in the totals.
    if (categoryAmounts.size === 0 && transaction.amount > 0) {
      categoryAmounts.set('__uncategorized__', transaction.amount);
    }

    for (const [categoryId, amount] of categoryAmounts) {
      const category = categoryById.get(categoryId);
      const group = category?.group || 'Uncategorized';
      const head = category?.head || 'Uncategorized';
      const groupColor = GROUP_COLORS[group] || EXPENSE_COLOR;

      if (isIncome) {
        const headId = `income-category:${group}:${head}`;
        const categoryNode = addNode(headId, head, INCOME_COLOR, 'income', 'left', 1);
        const total = addNode('total-income', 'Total income', TOTAL_COLOR, 'total', 'left', 2);
        if (category?.subHead) {
          const leaf = addNode(
            `income-subcategory:${categoryId}`,
            category.subHead,
            INCOME_COLOR,
            'income',
            'left',
            0
          );
          addLink(leaf, categoryNode, amount);
        }
        addLink(categoryNode, total, amount);
        incomeTotal += amount;
      } else {
        const groupId = `expense-group:${group}`;
        const headId = `expense-category:${group}:${head}`;
        const total = addNode('total-expenses', 'Total expenses', TOTAL_COLOR, 'total', 'right', 3);
        const groupNode = addNode(groupId, group, groupColor, 'expense', 'right', 4);
        const categoryNode = addNode(headId, head, groupColor, 'expense', 'right', 5);
        addLink(total, groupNode, amount);
        addLink(groupNode, categoryNode, amount);
        if (category?.subHead) {
          const leaf = addNode(
            `expense-subcategory:${categoryId}`,
            category.subHead,
            groupColor,
            'expense',
            'right',
            6
          );
          addLink(categoryNode, leaf, amount);
        }
        expenseTotal += amount;
      }
    }
  }

  const matchedAmount = Math.min(incomeTotal, expenseTotal);
  if (matchedAmount > 0) {
    addLink(nodeIds.get('total-income')!, nodeIds.get('total-expenses')!, matchedAmount);
  }

  if (incomeTotal > expenseTotal) {
    const unspent = addNode(
      'unspent-income',
      'Unspent income',
      RESIDUAL_COLOR,
      'residual',
      'right',
      3
    );
    addLink(nodeIds.get('total-income')!, unspent, incomeTotal - expenseTotal);
  } else if (expenseTotal > incomeTotal) {
    const existingFunds = addNode(
      'existing-funds',
      'Existing funds',
      RESIDUAL_COLOR,
      'residual',
      'left',
      2
    );
    addLink(existingFunds, nodeIds.get('total-expenses')!, expenseTotal - incomeTotal);
  }

  const links = Array.from(linksByPair.values());
  const inflows = nodes.map(() => 0);
  const outflows = nodes.map(() => 0);
  for (const link of links) {
    outflows[link.source] += link.value;
    inflows[link.target] += link.value;
  }

  return {
    nodes: nodes.map((node, index) => ({
      ...node,
      flowValue: Math.max(inflows[index], outflows[index]),
    })),
    links,
  };
}
