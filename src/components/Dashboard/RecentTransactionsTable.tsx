import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';
import { useDataStore } from '@/store/dataStore';
import type { Transaction } from '@/types';

interface RecentTransactionsTableProps {
  transactions: Transaction[];
}

export default function RecentTransactionsTable({ transactions }: RecentTransactionsTableProps) {
  const { settings, categories, accounts } = useDataStore();

  const getCategoryName = (txn: Transaction) => {
    if (txn.uiType === 'transfer') {
      const targetEntry = txn.entries.find(e => e.type === 'DEBIT');
      return accounts.find(a => a.id === targetEntry?.accountId)?.name || 'Transfer';
    }
    const catEntry = txn.entries.find(e => categories.some(c => c.id === e.accountId));
    const c = categories.find(c => c.id === catEntry?.accountId);
    return c ? `${c.head}` : '—';
  };

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm text-left border-collapse">
        <thead className="bg-accent/30 text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
          <tr>
            <th className="px-4 py-3 font-bold border-b border-border">Date</th>
            <th className="px-4 py-3 font-bold border-b border-border">Description</th>
            <th className="px-4 py-3 font-bold border-b border-border">Category / Target</th>
            <th className="px-4 py-3 font-bold border-b border-border text-right">Amount</th>
            <th className="px-4 py-3 font-bold border-b border-border text-center">Type</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {transactions.map(t => (
            <tr key={t.id} className="group hover:bg-accent/20 transition-colors">
              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                {format(new Date(t.date), 'dd MMM')}
              </td>
              <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">
                {t.note || 'No description'}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                <span className="px-2 py-0.5 rounded-md bg-accent/40 text-[11px]">
                  {getCategoryName(t)}
                </span>
              </td>
              <td
                className={cn(
                  'px-4 py-3 font-bold text-right mono',
                  t.uiType === 'income' ? 'text-income' : 'text-expense'
                )}
              >
                {t.uiType === 'income' ? '+' : ''}
                {formatCurrency(t.amount, settings)}
              </td>
              <td className="px-4 py-3 text-center">
                <span
                  className={cn(
                    'inline-block w-8 py-0.5 rounded text-[10px] font-bold uppercase',
                    t.uiType === 'income'
                      ? 'bg-income/10 text-income'
                      : t.uiType === 'expense'
                        ? 'bg-expense/10 text-expense'
                        : 'bg-blue-500/10 text-blue-500'
                  )}
                >
                  {t.uiType.substring(0, 3)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
