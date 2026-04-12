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
  const { sources, categories, settings } = useDataStore();

  const source   = sources.find((s) => s.id === txn.sourceId);
  const toSource = sources.find((s) => s.id === txn.toSourceId);
  const category = categories.find((c) => c.id === txn.categoryId);

  const typeIcon = {
    income:   <ArrowUpRight className="h-4 w-4" />,
    expense:  <ArrowDownRight className="h-4 w-4" />,
    transfer: <ArrowLeftRight className="h-4 w-4" />,
  }[txn.type];

  const label = txn.type === 'transfer'
    ? `${source?.name || '?'} → ${toSource?.name || '?'}`
    : category
    ? `${category.head}${category.subHead ? ' · ' + category.subHead : ''}`
    : '—';

  const sub = txn.note || source?.name || '';

  return (
    <button 
      className="w-full flex items-center gap-3 p-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border-b last:border-0" 
      onClick={onClick} 
      type="button"
    >
      <div className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
        txn.type === 'income' && "bg-income/10 text-income",
        txn.type === 'expense' && "bg-expense/10 text-expense",
        txn.type === 'transfer' && "bg-muted text-muted-foreground"
      )}>
        {typeIcon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate leading-none mb-1">{label}</p>
        {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
      </div>
      <div className="text-right shrink-0">
        <p className={cn(
          "text-sm font-bold mono leading-none mb-1",
          txn.type === 'income' ? "text-income" : txn.type === 'expense' ? "text-expense" : "text-foreground"
        )}>
          {txn.type === 'income' ? '+' : txn.type === 'expense' ? '-' : ''}
          {formatCurrency(txn.amount, settings)}
        </p>
        <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
          {formatDateShort(txn.date)}
        </p>
      </div>
    </button>
  );
}

