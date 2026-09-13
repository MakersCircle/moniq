import * as React from 'react';
import { useMemo } from 'react';
import { X, Trash2, Edit2, Calendar, Wallet, Tag, Info } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';
import { useDataStore } from '@/store/dataStore';
import { Button } from '@/components/ui/button';
import type { Transaction } from '@/types';
import TransactionForm from './TransactionForm';

interface TransactionDetailPanelProps {
  transaction: Transaction | null;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export default function TransactionDetailPanel({
  transaction,
  onClose,
  onDelete,
}: TransactionDetailPanelProps) {
  const { accounts, categories, settings } = useDataStore();
  const [isEditing, setIsEditing] = React.useState(false);

  const [prevTxnId, setPrevTxnId] = React.useState(transaction?.id);

  if (transaction?.id !== prevTxnId) {
    setPrevTxnId(transaction?.id);
    setIsEditing(false);
  }

  const details = useMemo(() => {
    if (!transaction) return null;

    const isTransfer = transaction.uiType === 'transfer';

    let account;
    let toAccount = null;
    let category = null;

    if (isTransfer) {
      const fromEntry = transaction.entries.find(e => e.type === 'CREDIT');
      const toEntry = transaction.entries.find(e => e.type === 'DEBIT');
      account = accounts.find(a => a.id === fromEntry?.accountId) || null;
      toAccount = accounts.find(a => a.id === toEntry?.accountId) || null;
    } else {
      const accEntry = transaction.entries.find(e => accounts.some(a => a.id === e.accountId));
      account = accounts.find(a => a.id === accEntry?.accountId) || null;

      const catEntry = transaction.entries.find(e => categories.some(c => c.id === e.accountId));
      category = categories.find(c => c.id === catEntry?.accountId) || null;
    }

    return { account, toAccount, category, isTransfer };
  }, [transaction, accounts, categories]);

  if (!transaction || !details) return null;

  return (
    <div
      className={cn(
        'fixed bg-background border-border z-50 shadow-2xl transition-transform duration-300 ease-in-out flex flex-col overflow-hidden',
        // Mobile (Bottom Drawer)
        'bottom-0 left-0 right-0 top-auto w-full h-auto max-h-[calc(100dvh-4rem)] rounded-t-3xl border-t pb-safe',
        transaction ? 'translate-y-0 translate-x-0' : 'translate-y-full translate-x-0',
        // Desktop (Right Panel)
        'md:top-16 md:bottom-0 md:left-auto md:right-0 md:w-[400px] md:h-auto md:max-h-none md:rounded-none md:border-t-0 md:border-l md:pb-0',
        transaction ? 'md:translate-x-0 md:translate-y-0' : 'md:translate-x-full md:translate-y-0'
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-accent/10">
        <h2 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">
          {isEditing ? 'Edit Transaction' : 'Transaction Details'}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => (isEditing ? setIsEditing(false) : onClose())}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {isEditing ? (
        <TransactionForm initialData={transaction} onClose={() => setIsEditing(false)} hideTitle />
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Amount Hero */}
            <div className="text-center space-y-2">
              <p
                className={cn(
                  'text-4xl font-extrabold tracking-tighter mono',
                  transaction.uiType === 'income' ? 'text-income' : 'text-expense'
                )}
              >
                {transaction.uiType === 'income' ? '+' : ''}
                {formatCurrency(transaction.amount, settings)}
              </p>
              <div className="flex items-center justify-center gap-2">
                <span
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                    transaction.uiType === 'income'
                      ? 'bg-income/10 text-income'
                      : transaction.uiType === 'expense'
                        ? 'bg-expense/10 text-expense'
                        : 'bg-blue-500/10 text-blue-500'
                  )}
                >
                  {transaction.uiType}
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
                label={details.isTransfer ? 'From Account' : 'Account'}
                value={details.account?.name || 'Unknown'}
              />
              {details.isTransfer && (
                <DetailRow
                  icon={Wallet}
                  label="To Account"
                  value={details.toAccount?.name || 'Unknown'}
                />
              )}
              {!details.isTransfer && (
                <DetailRow
                  icon={Tag}
                  label="Category"
                  value={
                    details.category
                      ? `${details.category.head}${details.category.subHead ? ' · ' + details.category.subHead : ''}`
                      : 'Uncategorized'
                  }
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
            <Button variant="outline" className="gap-2 h-10" onClick={() => setIsEditing(true)}>
              <Edit2 className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="destructive"
              className="gap-2 h-10"
              onClick={() => onDelete(transaction.id)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  isNote,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  isNote?: boolean;
}) {
  return (
    <div className="flex gap-4">
      <div className="mt-1">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="space-y-1 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            'text-sm font-medium',
            isNote ? 'text-foreground/80 leading-relaxed italic' : 'text-foreground'
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
