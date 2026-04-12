import { X, Trash2, Edit2, Calendar, Wallet, Tag, Info } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';
import { useDataStore } from '@/store/dataStore';
import { Button } from '@/components/ui/button';
import type { Transaction } from '@/types';

interface TransactionDetailPanelProps {
  transaction: Transaction | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onEdit: (t: Transaction) => void;
}

export default function TransactionDetailPanel({ 
  transaction, 
  onClose, 
  onDelete, 
  onEdit 
}: TransactionDetailPanelProps) {
  const { sources, categories, settings } = useDataStore();

  if (!transaction) return null;

  const source = sources.find(s => s.id === transaction.sourceId);
  const toSource = transaction.toSourceId ? sources.find(s => s.id === transaction.toSourceId) : null;
  const category = categories.find(c => c.id === transaction.categoryId);

  return (
    <div className={cn(
      "fixed top-[48px] right-0 bottom-0 w-[400px] bg-background border-l border-border z-30 shadow-2xl transition-transform duration-300 ease-in-out flex flex-col",
      transaction ? "translate-x-0" : "translate-x-full"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-accent/10">
        <h2 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Transaction Details</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Amount Hero */}
        <div className="text-center space-y-2">
          <p className={cn(
            "text-4xl font-extrabold tracking-tighter mono",
            transaction.type === 'income' ? 'text-income' : 'text-expense'
          )}>
            {transaction.type === 'income' ? '+' : ''}{formatCurrency(transaction.amount, settings)}
          </p>
          <div className="flex items-center justify-center gap-2">
            <span className={cn(
              "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
              transaction.type === 'income' ? 'bg-income/10 text-income' : 
              transaction.type === 'expense' ? 'bg-expense/10 text-expense' : 'bg-blue-500/10 text-blue-500'
            )}>
              {transaction.type}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              {format(new Date(transaction.date), 'dd MMMM yyyy')}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <DetailRow 
            icon={Calendar} 
            label="Date" 
            value={format(new Date(transaction.date), 'EEEE, do MMMM')} 
          />
          <DetailRow 
            icon={Wallet} 
            label={transaction.type === 'transfer' ? 'From Account' : 'Account'} 
            value={source?.name || 'Unknown'} 
          />
          {transaction.type === 'transfer' && (
            <DetailRow 
              icon={Wallet} 
              label="To Account" 
              value={toSource?.name || 'Unknown'} 
            />
          )}
          {transaction.type !== 'transfer' && (
            <DetailRow 
              icon={Tag} 
              label="Category" 
              value={category ? `${category.head}${category.subHead ? ' · ' + category.subHead : ''}` : 'Uncategorized'} 
            />
          )}
          <DetailRow 
            icon={Info} 
            label="Description" 
            value={transaction.note || 'No description provided'} 
            isNote
          />
        </div>
      </div>

      {/* Actions */}
      <div className="p-6 border-t border-border grid grid-cols-2 gap-3 bg-accent/5">
        <Button variant="outline" className="gap-2 h-10" onClick={() => onEdit(transaction)}>
          <Edit2 className="h-4 w-4" />
          Edit
        </Button>
        <Button variant="destructive" className="gap-2 h-10" onClick={() => onDelete(transaction.id)}>
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, isNote }: { icon: any, label: string, value: string, isNote?: boolean }) {
  return (
    <div className="flex gap-4">
      <div className="mt-1">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="space-y-1 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className={cn(
          "text-sm font-medium",
          isNote ? "text-foreground/80 leading-relaxed italic" : "text-foreground"
        )}>
          {value}
        </p>
      </div>
    </div>
  );
}
