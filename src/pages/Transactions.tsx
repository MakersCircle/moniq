import React, { useMemo, useState } from 'react';
import { Download, Search, ChevronRight, List, GripVertical } from 'lucide-react';
import { Reorder } from 'framer-motion';
import { useDataStore } from '../store/dataStore';
import { useFilteredTransactions } from '../hooks/useComputed';
import { exportToCSV, toMonthKey, formatCurrency } from '../utils/format';
import type { TxnFilter } from '../hooks/useComputed';
import type { Transaction, Account, Category, UserSettings } from '../types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { cn } from '@/lib/utils';
import TransactionDetailPanel from '@/components/Transactions/TransactionDetailPanel';

// ── Helpers ────────────────────────────────────────────────────────────────

function getAccountName(txn: Transaction, accounts: Account[]) {
  const isIncome = txn.uiType === 'income';
  const entry = txn.entries.find(
    e =>
      accounts.some(a => a.id === e.accountId) &&
      (isIncome ? e.type === 'DEBIT' : e.type === 'CREDIT')
  );
  return accounts.find(a => a.id === entry?.accountId)?.name || 'Unknown';
}

function getCategoryName(txn: Transaction, accounts: Account[], categories: Category[]) {
  if (txn.uiType === 'transfer') {
    const targetEntry = txn.entries.find(e => e.type === 'DEBIT');
    return accounts.find(a => a.id === targetEntry?.accountId)?.name || 'Transfer';
  }
  const catEntry = txn.entries.find(e => categories.some(c => c.id === e.accountId));
  const c = categories.find(c => c.id === catEntry?.accountId);
  return c ? (c.subHead ? `${c.head} . ${c.subHead}` : c.head) : '—';
}

// ── Row component ──────────────────────────────────────────────────────────

interface TxnRowProps {
  txn: Transaction;
  isSelected: boolean;
  accounts: Account[];
  categories: Category[];
  settings: UserSettings;
  onClick: () => void;
}

function TxnGridRow({ txn, isSelected, accounts, categories, settings, onClick }: TxnRowProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative flex items-center cursor-pointer transition-colors border-b border-border text-sm',
        isSelected ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-accent/20'
      )}
    >
      {/* Drag handle column */}
      <div className="w-5 md:w-6 shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-50 transition-opacity text-muted-foreground cursor-grab active:cursor-grabbing touch-none select-none">
        <GripVertical className="h-3.5 w-3.5" />
      </div>

      {/* Date — exactly absorbs original left-padding for the drag handle */}
      <div className="pr-3 md:pr-5 py-3 whitespace-nowrap text-muted-foreground shrink-0 w-[60px] md:w-[96px]">
        {/* Desktop */}
        <span className="hidden md:block text-xs">
          {new Date(txn.date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </span>
        {/* Mobile */}
        <div className="md:hidden flex flex-col text-xs">
          <span>
            {new Date(txn.date).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
            })}
          </span>
          <span className="text-[10px] opacity-70">
            {new Date(txn.date).toLocaleDateString('en-IN', { year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Description — flex-1 so it takes remaining space; min-w-0 allows truncation */}
      <div className="px-3 md:px-5 py-3 flex-1 min-w-0">
        <div className="flex flex-col w-full min-w-0">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span
              className={cn(
                'truncate min-w-0 flex-1 transition-opacity',
                txn.note
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground font-normal opacity-40'
              )}
            >
              {txn.note || 'No description'}
            </span>
            {isSelected && <ChevronRight className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
          </div>
          {/* Mobile: category + account beneath description */}
          <div className="md:hidden flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground min-w-0">
            <span className="truncate max-w-[70px]">
              {getCategoryName(txn, accounts, categories)}
            </span>
            <span className="shrink-0 opacity-50">•</span>
            <span className="truncate max-w-[70px]">{getAccountName(txn, accounts)}</span>
          </div>
        </div>
      </div>

      {/* Category — desktop only, fixed width */}
      <div className="hidden md:flex px-3 md:px-5 py-3 items-center gap-1.5 shrink-0 w-[160px]">
        <div
          className={cn(
            'h-1.5 w-1.5 rounded-full shrink-0',
            txn.uiType === 'income'
              ? 'bg-income'
              : txn.uiType === 'expense'
                ? 'bg-expense'
                : 'bg-blue-500'
          )}
        />
        <span className="text-muted-foreground text-xs truncate">
          {getCategoryName(txn, accounts, categories)}
        </span>
      </div>

      {/* Account — desktop only, fixed width */}
      <div className="hidden md:block px-3 md:px-5 py-3 text-muted-foreground text-xs truncate shrink-0 w-[140px]">
        {getAccountName(txn, accounts)}
      </div>

      {/* Amount — fixed width, right-aligned */}
      <div
        className={cn(
          'px-3 md:px-5 py-3 font-bold text-right mono whitespace-nowrap shrink-0 w-[110px] md:w-[140px]',
          txn.uiType === 'income'
            ? 'text-income'
            : txn.uiType === 'expense'
              ? 'text-expense'
              : 'text-blue-500'
        )}
      >
        {txn.uiType === 'income' ? '+' : ''}
        {formatCurrency(txn.amount, settings)}
      </div>
    </div>
  );
}

// ── Date Group Component (Handles local drag state for 60fps smoothness) ───

function DateGroup({
  items,
  selectedTxnId,
  accounts,
  categories,
  settings,
  onSelect,
  onCommitOrder,
}: {
  items: Transaction[];
  selectedTxnId: string | null;
  accounts: Account[];
  categories: Category[];
  settings: UserSettings;
  onSelect: (id: string | null) => void;
  onCommitOrder: (ids: string[]) => void;
}) {
  const [localIds, setLocalIds] = useState(() => items.map(t => t.id));
  const isDraggingRef = React.useRef(false);
  const lastStoreIdsRef = React.useRef(items.map(t => t.id).join(','));

  // Sync if external store changes, but ONLY if the store's data actually changed from what we last saw.
  // This completely insulates the local drag state from React re-render cycles.
  React.useEffect(() => {
    const incomingIds = items.map(t => t.id).join(',');
    if (incomingIds !== lastStoreIdsRef.current) {
      setLocalIds(items.map(t => t.id));
      lastStoreIdsRef.current = incomingIds;
    }
  }, [items]);

  const handleDragEnd = () => {
    // Clear flag after a short delay so the click event (which fires right after mouseup) is suppressed
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);

    const original = items.map(i => i.id).join(',');
    const current = localIds.join(',');
    if (original !== current) {
      onCommitOrder(localIds);
    }
  };

  return (
    <Reorder.Group
      axis="y"
      values={localIds}
      onReorder={setLocalIds}
      as="div"
      style={{ listStyle: 'none', padding: 0, margin: 0 }}
    >
      {localIds.map(id => {
        const txn = items.find(t => t.id === id);
        if (!txn) return null;

        return (
          <Reorder.Item
            key={txn.id}
            value={txn.id}
            as="div"
            onDragStart={() => {
              isDraggingRef.current = true;
            }}
            onDragEnd={handleDragEnd}
            whileDrag={{
              boxShadow: '0 20px 50px -12px rgba(0,0,0,0.5)',
              zIndex: 50,
            }}
            style={{ position: 'relative' }}
          >
            <TxnGridRow
              txn={txn}
              isSelected={selectedTxnId === txn.id}
              accounts={accounts}
              categories={categories}
              settings={settings}
              onClick={() => {
                if (isDraggingRef.current) return;
                onSelect(txn.id === selectedTxnId ? null : txn.id);
              }}
            />
          </Reorder.Item>
        );
      })}
    </Reorder.Group>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function Transactions() {
  const {
    accounts,
    categories,
    methods,
    settings,
    transactions,
    deleteTransaction,
    reorderTransactions,
  } = useDataStore();

  const [filter, setFilter] = useState<TxnFilter>({});
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);

  const txns = useFilteredTransactions(filter);

  const selectedTxn = transactions.find(t => t.id === selectedTxnId) || null;

  const updateFilter = (patch: Partial<TxnFilter>) => setFilter(f => ({ ...f, ...patch }));

  const handleExport = () => {
    exportToCSV(txns, accounts, categories, methods, `moniq-${filter.month || 'all'}.csv`);
  };

  // Group txns by date (already sorted date-desc → sortOrder-asc)
  const groupedByDate = useMemo(() => {
    const groups: { date: string; items: Transaction[] }[] = [];
    for (const txn of txns) {
      const last = groups[groups.length - 1];
      if (last && last.date === txn.date) {
        last.items.push(txn);
      } else {
        groups.push({ date: txn.date, items: [txn] });
      }
    }
    return groups;
  }, [txns]);

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50dvh] lg:h-[70vh] py-12 text-center px-4">
        <div className="h-16 w-16 lg:h-24 lg:w-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <List className="h-8 w-8 lg:h-12 lg:w-12 text-primary opacity-80" />
        </div>
        <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-3">Nothing here yet</h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-8 text-sm lg:text-base">
          Your ledger is empty. Add a transaction to start seeing your history.
        </p>
      </div>
    );
  }

  const currentNet = txns.reduce((sum, t) => {
    if (t.uiType === 'income') return sum + t.amount;
    if (t.uiType === 'expense') return sum - t.amount;
    return sum;
  }, 0);

  return (
    <div className="absolute inset-0 flex flex-col pb-safe overflow-hidden">
      {/* Main Table Area */}
      <div
        className={cn(
          'flex-1 flex flex-col transition-all duration-300 max-w-[1248px] w-full mx-auto min-h-0',
          selectedTxnId ? 'md:pr-[400px]' : ''
        )}
      >
        {/* Sticky Header with Filters */}
        <div className="sticky top-0 bg-background/80 backdrop-blur-md z-20 border-b border-border p-8 pb-4 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Ledger</h1>
              <p className="text-sm text-muted-foreground">
                {txns.length} transactions · Net:
                <span
                  className={cn(
                    'ml-1 font-bold mono',
                    currentNet >= 0 ? 'text-income' : 'text-expense'
                  )}
                >
                  {currentNet >= 0 ? '+' : ''}
                  {formatCurrency(currentNet, settings)}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2 self-start md:self-auto">
              <Button variant="outline" size="sm" onClick={handleExport} className="h-9 gap-2">
                <Download className="h-4 w-4" />
                <span className="hidden md:inline">Export CSV</span>
                <span className="md:hidden">Export</span>
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search description..."
                className="pl-9 h-9 text-xs"
                value={filter.search || ''}
                onChange={e => updateFilter({ search: e.target.value || undefined })}
              />
            </div>

            <Select
              value={filter.month || 'all'}
              onValueChange={val => updateFilter({ month: val === 'all' ? undefined : val })}
            >
              <SelectTrigger className="h-9 w-[160px] text-xs">
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                {Array.from({ length: 12 }).map((_, i) => {
                  const d = new Date();
                  d.setMonth(d.getMonth() - i);
                  const key = toMonthKey(d);
                  return (
                    <SelectItem key={key} value={key}>
                      {d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Select
              value={filter.uiType || 'all'}
              onValueChange={val =>
                updateFilter({ uiType: val === 'all' ? undefined : (val as Transaction['uiType']) })
              }
            >
              <SelectTrigger className="h-9 w-[120px] text-xs">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filter.accountId || 'all'}
              onValueChange={val => updateFilter({ accountId: val === 'all' ? undefined : val })}
            >
              <SelectTrigger className="h-9 w-[150px] text-xs">
                <SelectValue placeholder="All Accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts
                  .filter(a => !a.isDeleted)
                  .map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 flex flex-col pt-4 min-h-0 px-4 md:px-8 pb-4 md:pb-8">
          {txns.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-border rounded-2xl bg-accent/5">
              <p className="text-muted-foreground font-medium">
                No transactions found matching your filters.
              </p>
            </div>
          ) : (
            <div className="flex-1 rounded-xl border border-border bg-card shadow-sm w-full overflow-hidden flex flex-col min-h-0 relative">
              <div className="w-full h-full overflow-x-auto flex flex-col custom-scrollbar">
                <div className="w-full md:min-w-[800px] flex flex-col h-full">
                  {/* ── Sticky Column Header ── */}
                  <div
                    className="w-full overflow-y-scroll custom-scrollbar bg-accent/50 backdrop-blur-md shadow-sm border-b border-border z-10 sticky top-0"
                    style={{ scrollbarGutter: 'stable' }}
                  >
                    <div className="pl-[6px] flex items-center text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                      <div className="w-5 md:w-6 shrink-0" />
                      {/* Drag handle spacer */}
                      <div className="pr-3 md:pr-5 py-3 shrink-0 w-[60px] md:w-[96px]">Date</div>
                      <div className="px-3 md:px-5 py-3 flex-1 min-w-0">Description</div>
                      <div className="hidden md:block px-3 md:px-5 py-3 shrink-0 w-[160px]">
                        Category
                      </div>
                      <div className="hidden md:block px-3 md:px-5 py-3 shrink-0 w-[140px]">
                        Account
                      </div>
                      <div className="px-3 md:px-5 py-3 text-right shrink-0 w-[110px] md:w-[140px]">
                        Amount
                      </div>
                    </div>
                  </div>

                  {/* ── Scrollable Body ── */}
                  <div className="flex-1 overflow-y-scroll custom-scrollbar pl-[6px]">
                    {groupedByDate.map(({ date, items }) => (
                      <DateGroup
                        key={date}
                        items={items}
                        selectedTxnId={selectedTxnId}
                        accounts={accounts}
                        categories={categories}
                        settings={settings}
                        onSelect={setSelectedTxnId}
                        onCommitOrder={reorderTransactions}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Slide-in Detail Panel */}
      <TransactionDetailPanel
        transaction={selectedTxn}
        onClose={() => setSelectedTxnId(null)}
        onDelete={id => {
          deleteTransaction(id);
          setSelectedTxnId(null);
        }}
      />
    </div>
  );
}
