import { useMemo } from 'react';
import { useDataStore } from '../store/dataStore';

// ── Compute current balance for a source ─────────────────────
// balance = initialBalance + sum(income) - sum(expense) +/- transfers
export function useSourceBalance(sourceId: string): number {
  const { transactions, sources } = useDataStore();

  return useMemo(() => {
    const source = sources.find((s) => s.id === sourceId);
    if (!source) return 0;
    const active = transactions.filter((t) => !t.isDeleted);
    let balance = source.initialBalance;

    for (const t of active) {
      if (t.type === 'income' && t.sourceId === sourceId) {
        balance += t.amount;
      } else if (t.type === 'expense' && t.sourceId === sourceId) {
        balance -= t.amount;
      } else if (t.type === 'transfer') {
        if (t.sourceId === sourceId) balance -= t.amount;
        if (t.toSourceId === sourceId) balance += t.amount;
      }
    }
    return balance;
  }, [transactions, sources, sourceId]);
}

// ── All source balances as a map ─────────────────────────────
export function useAllBalances(): Record<string, number> {
  const { transactions, sources } = useDataStore();

  return useMemo(() => {
    const balances: Record<string, number> = {};
    for (const s of sources) {
      balances[s.id] = s.initialBalance;
    }
    for (const t of transactions.filter((t) => !t.isDeleted)) {
      if (t.type === 'income') {
        balances[t.sourceId] = (balances[t.sourceId] || 0) + t.amount;
      } else if (t.type === 'expense') {
        balances[t.sourceId] = (balances[t.sourceId] || 0) - t.amount;
      } else if (t.type === 'transfer') {
        balances[t.sourceId] = (balances[t.sourceId] || 0) - t.amount;
        if (t.toSourceId) {
          balances[t.toSourceId] = (balances[t.toSourceId] || 0) + t.amount;
        }
      }
    }
    return balances;
  }, [transactions, sources]);
}

// ── Monthly summary ──────────────────────────────────────────
export function useMonthSummary(year: number, month: number) {
  const { transactions } = useDataStore();

  return useMemo(() => {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const monthTxns = transactions.filter(
      (t) => !t.isDeleted && t.date.startsWith(monthStr)
    );

    const income   = monthTxns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = monthTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const transfers= monthTxns.filter((t) => t.type === 'transfer').length;

    return { income, expenses, transfers, net: income - expenses };
  }, [transactions, year, month]);
}

// ── Filtered transactions list ───────────────────────────────
export interface TxnFilter {
  month?: string;   // 'YYYY-MM'
  type?: string;    // 'income' | 'expense' | 'transfer'
  sourceId?: string;
  categoryId?: string;
  search?: string;
}

export function useFilteredTransactions(filter: TxnFilter) {
  const { transactions } = useDataStore();

  return useMemo(() => {
    return transactions
      .filter((t) => {
        if (t.isDeleted) return false;
        if (filter.month && !t.date.startsWith(filter.month)) return false;
        if (filter.type && t.type !== filter.type) return false;
        if (filter.sourceId && t.sourceId !== filter.sourceId && t.toSourceId !== filter.sourceId) return false;
        if (filter.categoryId && t.categoryId !== filter.categoryId) return false;
        if (filter.search && !t.note.toLowerCase().includes(filter.search.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, filter]);
}

// ── Category spend summary for a month ──────────────────────
export function useCategorySpend(year: number, month: number) {
  const { transactions, categories } = useDataStore();

  return useMemo(() => {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const expenses = transactions.filter(
      (t) => !t.isDeleted && t.type === 'expense' && t.date.startsWith(monthStr)
    );

    const map: Record<string, { label: string; amount: number; group: string }> = {};
    for (const t of expenses) {
      if (!t.categoryId) continue;
      const cat = categories.find((c) => c.id === t.categoryId);
      if (!cat) continue;
      const key = cat.head;
      if (!map[key]) map[key] = { label: key, amount: 0, group: cat.group };
      map[key].amount += t.amount;
    }
    return Object.values(map).sort((a, b) => b.amount - a.amount);
  }, [transactions, categories, year, month]);
}
// ── Historical monthly data for charts ────────────────────────
export function useHistoricalData(months = 6) {
  const { transactions } = useDataStore();

  return useMemo(() => {
    const data = [];
    for (let i = 0; i < months; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      
      const monthTxns = transactions.filter(
        (t) => !t.isDeleted && t.date.startsWith(monthStr)
      );

      const income   = monthTxns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expenses = monthTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      
      data.push({
        label: d.toLocaleDateString('en-IN', { month: 'short' }),
        month: monthStr,
        income,
        expenses,
        net: income - expenses
      });
    }
    return data.reverse();
  }, [transactions, months]);
}
// ── Budget summary for a month ───────────────────────────────
export function useBudgetSummary(year: number, month: number) {
  const { transactions, categories, budgets } = useDataStore();

  return useMemo(() => {
    const period = `${year}-${String(month).padStart(2, '0')}`;
    const monthTxns = transactions.filter(
      (t) => !t.isDeleted && t.date.startsWith(period)
    );

    const income = monthTxns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    
    // Group categories by their parent group
    const groups: Record<string, any[]> = {};
    
    let totalAllocated = 0;

    for (const cat of categories.filter(c => c.isActive && c.group !== 'Income')) {
      const budget = budgets.find(b => b.categoryId === cat.id && b.period === period);
      const spent = monthTxns.filter(t => t.categoryId === cat.id && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      
      const budgeted = budget?.amount || 0;
      totalAllocated += budgeted;

      if (!groups[cat.group]) groups[cat.group] = [];
      groups[cat.group].push({
        ...cat,
        budgeted,
        spent,
        remaining: budgeted - spent,
        percent: budgeted > 0 ? (spent / budgeted) * 100 : 0
      });
    }

    return {
      income,
      totalAllocated,
      remainingToAllocate: income - totalAllocated,
      categoryGroups: Object.entries(groups).map(([name, categories]) => ({ name, categories }))
    };
  }, [transactions, categories, budgets, year, month]);
}
