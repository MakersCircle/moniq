import { useMemo } from 'react';
import { useDataStore } from '../store/dataStore';
import { LedgerEngine } from '../lib/ledger';

/**
 * Returns the normal balance for a specific account.
 */
export function useAccountBalance(accountId: string): number {
  const { transactions, accounts, categories } = useDataStore();

  return useMemo(() => {
    return LedgerEngine.getNormalBalance(accountId, transactions, accounts, categories);
  }, [transactions, accounts, categories, accountId]);
}

/**
 * Returns a map of all account IDs to their current balances.
 */
export function useAllBalances(): Record<string, number> {
  const { transactions, accounts, categories } = useDataStore();

  return useMemo(() => {
    const balances: Record<string, number> = {};
    for (const acc of accounts.filter(a => !a.isDeleted)) {
      balances[acc.id] = LedgerEngine.getNormalBalance(acc.id, transactions, accounts, categories);
    }
    return balances;
  }, [transactions, accounts, categories]);
}

/**
 * Returns the summary for a specific month.
 */
export function useMonthSummary(year: number, month: number) {
  const { transactions } = useDataStore();

  return useMemo(() => {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const activeTxns = transactions.filter(
      (t) => !t.isDeleted && t.date.startsWith(monthStr)
    );

    const income = activeTxns
      .filter((t) => t.uiType === 'income')
      .reduce((sum, t) => {
        // In our model, income 'amount' is what's on the entries
        return sum + (t.entries[0]?.amount || 0);
      }, 0);

    const expenses = activeTxns
      .filter((t) => t.uiType === 'expense')
      .reduce((sum, t) => {
        return sum + (t.entries[0]?.amount || 0);
      }, 0);

    return { 
      income, 
      expenses, 
      transfers: activeTxns.filter((t) => t.uiType === 'transfer').length, 
      net: income - expenses 
    };
  }, [transactions, year, month]);
}

export interface TxnFilter {
  month?: string;   // 'YYYY-MM'
  uiType?: string;    // 'income' | 'expense' | 'transfer'
  accountId?: string;
  categoryId?: string;
  search?: string;
}

/**
 * Returns transactions filtered by the given criteria.
 */
export function useFilteredTransactions(filter: TxnFilter) {
  const { transactions } = useDataStore();

  return useMemo(() => {
    return transactions
      .filter((t) => {
        if (t.isDeleted) return false;
        if (filter.month && !t.date.startsWith(filter.month)) return false;
        if (filter.uiType && t.uiType !== filter.uiType) return false;
        
        // Match if any entry in the transaction references the filtered ID
        if (filter.accountId || filter.categoryId) {
          const targetId = filter.accountId || filter.categoryId;
          const hasMatch = t.entries.some(e => e.accountId === targetId);
          if (!hasMatch) return false;
        }
        
        if (filter.search && !t.note.toLowerCase().includes(filter.search.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, filter]);
}

/**
 * Summarizes spending per category for a month.
 */
export function useCategorySpend(year: number, month: number) {
  const { transactions, categories, accounts } = useDataStore();

  return useMemo(() => {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const expenses = transactions.filter(
      (t) => !t.isDeleted && t.uiType === 'expense' && t.date.startsWith(monthStr)
    );

    const map: Record<string, { label: string; amount: number; group: string }> = {};
    for (const t of expenses) {
      // Find the entry that corresponds to the category (usually the DEBIT entry for expenses)
      const categoryEntry = t.entries.find(e => categories.some(c => c.id === e.accountId));
      if (!categoryEntry) continue;
      
      const cat = categories.find((c) => c.id === categoryEntry.accountId);
      if (!cat) continue;
      
      const key = cat.head;
      if (!map[key]) map[key] = { label: key, amount: 0, group: cat.group };
      map[key].amount += categoryEntry.amount;
    }
    return Object.values(map).sort((a, b) => b.amount - a.amount);
  }, [transactions, categories, accounts, year, month]);
}

/**
 * Historical data summary for charts.
 */
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

      const income = monthTxns
        .filter((t) => t.uiType === 'income')
        .reduce((s, t) => s + (t.entries[0]?.amount || 0), 0);
        
      const expenses = monthTxns
        .filter((t) => t.uiType === 'expense')
        .reduce((s, t) => s + (t.entries[0]?.amount || 0), 0);
      
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

/**
 * Budget vs Actual summary for a month.
 */
export function useBudgetSummary(year: number, month: number) {
  const { transactions, categories, budgets, accounts } = useDataStore();

  return useMemo(() => {
    const period = `${year}-${String(month).padStart(2, '0')}`;
    const monthTxns = transactions.filter(
      (t) => !t.isDeleted && t.date.startsWith(period)
    );

    const income = monthTxns
      .filter((t) => t.uiType === 'income')
      .reduce((s, t) => s + (t.entries[0]?.amount || 0), 0);
    
    const groups: Record<string, any[]> = {};
    let totalAllocated = 0;

    for (const cat of categories.filter(c => c.isActive && !c.isDeleted && c.group !== 'Income')) {
      const budget = budgets.find(b => b.categoryId === cat.id && b.period === period && !b.isDeleted);
      
      // Calculate spent amount based on ledger entries for this category
      const spent = monthTxns
        .filter(t => t.uiType === 'expense' && t.entries.some(e => e.accountId === cat.id))
        .reduce((sum, t) => {
          const entry = t.entries.find(e => e.accountId === cat.id);
          return sum + (entry?.amount || 0);
        }, 0);
      
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
  }, [transactions, categories, budgets, accounts, year, month]);
}
