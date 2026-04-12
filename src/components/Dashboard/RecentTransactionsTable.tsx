import { useMemo } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';
import { useDataStore } from '@/store/dataStore';
import type { Transaction } from '@/types';

interface RecentTransactionsTableProps {
  transactions: Transaction[];
}

export default function RecentTransactionsTable({ transactions }: RecentTransactionsTableProps) {
  const { settings, categories } = useDataStore();

  const getCategoryLabel = (catId?: string) => {
    if (!catId) return '—';
    const cat = categories.find(c => c.id === catId);
    return cat ? `${cat.head}` : '—';
  };

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm text-left border-collapse">
        <thead className="bg-accent/30 text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
          <tr>
            <th className="px-4 py-3 font-bold border-b border-border">Date</th>
            <th className="px-4 py-3 font-bold border-b border-border">Description</th>
            <th className="px-4 py-3 font-bold border-b border-border">Category</th>
            <th className="px-4 py-3 font-bold border-b border-border text-right">Amount</th>
            <th className="px-4 py-3 font-bold border-b border-border text-center">Type</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {transactions.map((t) => (
            <tr key={t.id} className="group hover:bg-accent/20 transition-colors">
              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                {format(new Date(t.date), 'dd MMM')}
              </td>
              <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">
                {t.note || 'No description'}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                <span className="px-2 py-0.5 rounded-md bg-accent/40 text-[11px]">
                  {getCategoryLabel(t.categoryId)}
                </span>
              </td>
              <td className={cn(
                "px-4 py-3 font-bold text-right mono",
                t.type === 'income' ? 'text-income' : 'text-expense'
              )}>
                {t.type === 'income' ? '+' : ''}{formatCurrency(t.amount, settings)}
              </td>
              <td className="px-4 py-3 text-center">
                <span className={cn(
                  "inline-block w-8 py-0.5 rounded text-[10px] font-bold uppercase",
                  t.type === 'income' ? 'bg-income/10 text-income' : 
                  t.type === 'expense' ? 'bg-expense/10 text-expense' : 
                  'bg-blue-500/10 text-blue-500'
                )}>
                  {t.type.substring(0, 3)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
