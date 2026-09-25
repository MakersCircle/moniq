import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';
import { useDataStore } from '@/store/dataStore';
import type { Transaction } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';

interface RecentTransactionsTableProps {
  transactions: Transaction[];
}

export default function RecentTransactionsTable({ transactions }: RecentTransactionsTableProps) {
  const { t } = useTranslation();
  const { settings, categories, accounts } = useDataStore();

  const getCategoryName = (txn: Transaction) => {
    if (txn.uiType === 'transfer') {
      const targetEntry = txn.entries.find(e => e.type === 'DEBIT');
      return accounts.find(a => a.id === targetEntry?.accountId)?.name || t('common.transfer');
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
            <th className="px-4 py-3 font-bold border-b border-border whitespace-nowrap">
              {t('common.date')}
            </th>
            <th className="px-4 py-3 font-bold border-b border-border">
              {t('common.description')}
            </th>
            <th className="hidden sm:table-cell px-4 py-3 font-bold border-b border-border">
              {t('dashboard.tableCategory')}
            </th>
            <th className="px-4 py-3 font-bold border-b border-border text-right">
              {t('common.amount')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {transactions.map(txn => (
            <tr key={txn.id} className="group hover:bg-accent/20 transition-colors">
              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                {format(new Date(txn.date), 'dd MMM')}
              </td>
              <td className="px-4 py-3 max-w-[120px] sm:max-w-xs">
                <div
                  className={cn(
                    'truncate transition-opacity',
                    txn.note
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground font-normal opacity-40'
                  )}
                >
                  {txn.note || t('common.description')}
                </div>
                <div className="sm:hidden text-[10px] text-muted-foreground mt-0.5 truncate">
                  {getCategoryName(txn)}
                </div>
              </td>
              <td className="hidden sm:table-cell px-4 py-3 text-muted-foreground">
                <span className="px-2 py-0.5 rounded-md bg-accent/40 text-[11px] truncate inline-block max-w-[150px]">
                  {getCategoryName(txn)}
                </span>
              </td>
              <td
                className={cn(
                  'px-4 py-3 font-bold text-right mono whitespace-nowrap',
                  txn.uiType === 'income'
                    ? 'text-income'
                    : txn.uiType === 'expense'
                      ? 'text-expense'
                      : 'text-blue-500'
                )}
              >
                {txn.uiType === 'income' ? '+' : ''}
                {formatCurrency(txn.amount, settings)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
