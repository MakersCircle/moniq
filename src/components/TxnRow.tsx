import { useMemo } from 'react';
import { ArrowUpRight, ArrowDownRight, ArrowLeftRight } from 'lucide-react';
import type { Transaction } from '../types';
import { useDataStore } from '../store/dataStore';
import { formatCurrency, formatDateShort } from '../utils/format';
import { cn } from '@/lib/utils';

interface TxnRowProps {
  txn: Transaction;
  onClick?: () => void;
}

export default function TxnRow({ txn, onClick }: TxnRowProps) {
  const { accounts, categories, settings } = useDataStore();

  const details = useMemo(() => {
    const isTransfer = txn.uiType === 'transfer';

    // Find account entry
    const accEntry = txn.entries.find(e => accounts.some(a => a.id === e.accountId));
    const acc = accounts.find(a => a.id === accEntry?.accountId);

    // Find target (category or second account)
    const targetEntry = txn.entries.find(e => e.accountId !== accEntry?.accountId);

    let label = '';
    let sub = txn.note || acc?.name || '';

    if (isTransfer) {
      const fromEntry = txn.entries.find(e => e.type === 'CREDIT');
      const toEntry = txn.entries.find(e => e.type === 'DEBIT');
      const fromAcc = accounts.find(a => a.id === fromEntry?.accountId);
      const toAcc = accounts.find(a => a.id === toEntry?.accountId);
      label = `${fromAcc?.name || '?'} → ${toAcc?.name || '?'}`;
    } else {
      const cat = categories.find(c => c.id === targetEntry?.accountId);
      label = cat ? `${cat.head}${cat.subHead ? ' · ' + cat.subHead : ''}` : '—';
      if (!txn.note && acc) sub = acc.name;
    }

    return { label, sub };
  }, [txn, accounts, categories]);

  const typeIcon = {
    income: <ArrowUpRight className="h-4 w-4" />,
    expense: <ArrowDownRight className="h-4 w-4" />,
    transfer: <ArrowLeftRight className="h-4 w-4" />,
  }[txn.uiType];

  return (
    <button
      className="w-full flex items-center gap-3 p-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border-b last:border-0"
      onClick={onClick}
      type="button"
    >
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          txn.uiType === 'income' && 'bg-income/10 text-income',
          txn.uiType === 'expense' && 'bg-expense/10 text-expense',
          txn.uiType === 'transfer' && 'bg-muted text-muted-foreground'
        )}
      >
        {typeIcon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate leading-none mb-1">{details.label}</p>
        {details.sub && <p className="text-xs text-muted-foreground truncate">{details.sub}</p>}
      </div>
      <div className="text-right shrink-0">
        <p
          className={cn(
            'text-sm font-bold mono leading-none mb-1',
            txn.uiType === 'income'
              ? 'text-income'
              : txn.uiType === 'expense'
                ? 'text-expense'
                : 'text-foreground'
          )}
        >
          {txn.uiType === 'income' ? '+' : txn.uiType === 'expense' ? '-' : ''}
          {formatCurrency(txn.amount, settings)}
        </p>
        <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
          {formatDateShort(txn.date)}
        </p>
      </div>
    </button>
  );
}
