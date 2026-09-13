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
    return c ? (c.subHead ? `${c.head} . ${c.subHead}` : c.head) : '—';
  };

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm text-left border-collapse">
        <thead className="bg-accent/30 text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
          <tr>
            <th className="px-4 py-3 font-bold border-b border-border whitespace-nowrap">Date</th>
            <th className="px-4 py-3 font-bold border-b border-border">Description</th>
            <th className="hidden sm:table-cell px-4 py-3 font-bold border-b border-border">
              Category / Target
            </th>
            <th className="px-4 py-3 font-bold border-b border-border text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {transactions.map(t => (
            <tr key={t.id} className="group hover:bg-accent/20 transition-colors">
              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                {format(new Date(t.date), 'dd MMM')}
              </td>
              <td className="px-4 py-3 max-w-[120px] sm:max-w-xs">
                <div
                  className={cn(
                    'truncate transition-opacity',
                    t.note
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground font-normal opacity-40'
                  )}
                >
                  {t.note || 'No description'}
                </div>
                <div className="sm:hidden text-[10px] text-muted-foreground mt-0.5 truncate">
                  {getCategoryName(t)}
                </div>
              </td>
              <td className="hidden sm:table-cell px-4 py-3 text-muted-foreground">
                <span className="px-2 py-0.5 rounded-md bg-accent/40 text-[11px] truncate inline-block max-w-[150px]">
                  {getCategoryName(t)}
                </span>
              </td>
              <td
                className={cn(
                  'px-4 py-3 font-bold text-right mono whitespace-nowrap',
                  t.uiType === 'income'
                    ? 'text-income'
                    : t.uiType === 'expense'
                      ? 'text-expense'
                      : 'text-blue-500'
                )}
              >
                {t.uiType === 'income' ? '+' : ''}
                {formatCurrency(t.amount, settings)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
