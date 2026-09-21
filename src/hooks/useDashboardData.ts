import { useMemo } from 'react';
import { useDataStore } from '../store/dataStore';
import {
  useAllBalances,
  useMonthSummary,
  useCategorySpend,
  useNetWorthSummary,
  useFiscalYearSummary,
} from './useComputed';

export function useDashboardData() {
  const { accounts, transactions, settings } = useDataStore();
  const balances = useAllBalances();

  const now = useMemo(() => new Date(), []);
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthLabel = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const { income, expenses } = useMonthSummary(year, month);
  const categorySpend = useCategorySpend(year, month);
  const fySummary = useFiscalYearSummary(now);

  const { netWorth, liquidity, totalSavings } = useNetWorthSummary();
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

  const recentTxns = useMemo(() => {
    return transactions
      .filter(t => !t.isDeleted)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  }, [transactions]);

  const topAccounts = useMemo(() => {
    const activeAccounts = accounts.filter(s => s.isActive && !s.isDeleted);

    const lastUsedMap = new Map<string, string>();
    transactions.forEach(t => {
      if (t.isDeleted) return;
      t.entries.forEach(e => {
        const current = lastUsedMap.get(e.accountId) || '';
        if (t.date > current) {
          lastUsedMap.set(e.accountId, t.date);
        }
      });
    });

    return activeAccounts
      .sort((a, b) => {
        const aDate = lastUsedMap.get(a.id) || '';
        const bDate = lastUsedMap.get(b.id) || '';
        if (aDate === bDate) return 0;
        return aDate > bDate ? -1 : 1;
      })
      .slice(0, 5);
  }, [accounts, transactions]);

  const { totalReceivable, totalPayable } = useMemo(() => {
    let receivable = 0;
    let payable = 0;

    accounts
      .filter(s => s.description?.toLowerCase() === 'receivable' && s.isActive && !s.isDeleted)
      .forEach(s => {
        receivable += balances[s.id] || 0;
      });

    accounts
      .filter(s => s.description?.toLowerCase() === 'payable' && s.isActive && !s.isDeleted)
      .forEach(s => {
        payable += balances[s.id] || 0;
      });

    const { categories } = useDataStore.getState();
    for (const cat of categories.filter(c => c.isActive && !c.isDeleted)) {
      const bal = balances[cat.id] || 0;
      if (['Lend', 'Invest'].includes(cat.group)) {
        receivable += bal;
      } else if (cat.group === 'Borrow') {
        payable += bal;
      }
    }

    return {
      totalReceivable: Math.abs(receivable),
      totalPayable: Math.abs(payable),
    };
  }, [accounts, balances]);

  return {
    accounts,
    transactions,
    settings,
    balances,
    monthLabel,
    income,
    expenses,
    categorySpend,
    fySummary,
    netWorth,
    liquidity,
    totalSavings,
    savingsRate,
    recentTxns,
    topAccounts,
    totalReceivable,
    totalPayable,
    isEmpty: transactions.length === 0,
  };
}
