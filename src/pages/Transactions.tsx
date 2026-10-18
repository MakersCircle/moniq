import React, { useCallback, useMemo, useState } from 'react';
import { Download, Search, ChevronRight, List, GripVertical } from 'lucide-react';
import { Reorder, useDragControls } from 'framer-motion';
import { useDataStore } from '../store/dataStore';
import { useFilteredTransactions } from '../hooks/useComputed';
import { toMonthKey, formatCurrency } from '../utils/format';
import type { TxnFilter } from '../hooks/useComputed';
import type { Transaction, Account, Category, UserSettings } from '../types';
import { useTranslation } from '@/hooks/useTranslation';

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
import { LedgerEngine } from '@/lib/ledger';
import TransactionDetailPanel from '@/components/Transactions/TransactionDetailPanel';
import { useIsMobile } from '@/hooks/useIsMobile';
import { boundDragScroll } from '@/lib/boundedDragScroll';
import { LedgerExportDialog } from '@/components/Transactions/LedgerExportDialog';

// ── Helpers ────────────────────────────────────────────────────────────────

function getAccountName(txn: Transaction, accounts: Account[], t: (key: string) => string) {
  const entry = LedgerEngine.getPrimaryAccountEntry(txn, accounts);
  return accounts.find(a => a.id === entry?.accountId)?.name || t('common.unknown');
}

function getCategoryName(
  txn: Transaction,
  accounts: Account[],
  categories: Category[],
  t: (key: string) => string
) {
  if (txn.uiType === 'transfer') {
    const targetEntry = LedgerEngine.getTransferDestinationEntry(txn, accounts);
    return accounts.find(a => a.id === targetEntry?.accountId)?.name || t('common.transfer');
  }
  const catEntry = LedgerEngine.getCategoryEntry(txn, categories);
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
  t: (key: string, vars?: Record<string, string | number>) => string;
  onSelect: (id: string) => void;
  onHandlePointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  isDragging: boolean;
  isDragged: boolean;
}

function TxnGridRow({
  txn,
  isSelected,
  accounts,
  categories,
  settings,
  t,
  onSelect,
  onHandlePointerDown,
  onMove,
  isDragging,
  isDragged,
}: TxnRowProps) {
  return (
    <div
      onClick={() => onSelect(txn.id)}
      className={cn(
        'group relative flex items-center cursor-pointer transition-colors border-b border-border text-sm',
        isSelected ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-accent/20'
      )}
    >
      {/* Drag handle column */}
      <button
        type="button"
        aria-label={t('ledger.reorderHandle', {
          name: txn.note || t('common.noDescriptionProvided'),
        })}
        aria-keyshortcuts="ArrowUp ArrowDown"
        onClick={event => event.stopPropagation()}
        onPointerDown={onHandlePointerDown}
        onKeyDown={event => {
          if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
          event.preventDefault();
          event.stopPropagation();
          onMove(txn.id, event.key === 'ArrowUp' ? -1 : 1);
        }}
        className={cn(
          'w-5 md:w-6 self-stretch shrink-0 flex items-center justify-center text-muted-foreground cursor-grab active:cursor-grabbing touch-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isDragging
            ? isDragged
              ? 'opacity-70'
              : 'opacity-70 md:opacity-0'
            : 'opacity-50 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-50 [@media(hover:hover)]:focus-visible:opacity-100 transition-opacity'
        )}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

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
              {txn.note || t('common.noDescriptionProvided')}
            </span>
            {isSelected && <ChevronRight className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
          </div>
          {/* Mobile: category + account beneath description */}
          <div className="md:hidden flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground min-w-0">
            <span className="truncate max-w-[70px]">
              {getCategoryName(txn, accounts, categories, t)}
            </span>
            <span className="shrink-0 opacity-50">•</span>
            <span className="truncate max-w-[70px]">{getAccountName(txn, accounts, t)}</span>
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
          {getCategoryName(txn, accounts, categories, t)}
        </span>
      </div>

      {/* Account — desktop only, fixed width */}
      <div className="hidden md:block px-3 md:px-5 py-3 text-muted-foreground text-xs truncate shrink-0 w-[140px]">
        {getAccountName(txn, accounts, t)}
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

const MemoTxnGridRow = React.memo(TxnGridRow);

// ── Date Group Component ──────────────────────────────────────────────────

function DateGroup({
  items,
  selectedTxnId,
  accounts,
  categories,
  settings,
  t,
  onSelect,
  onCommitOrder,
}: {
  items: Transaction[];
  selectedTxnId: string | null;
  accounts: Account[];
  categories: Category[];
  settings: UserSettings;
  t: (key: string) => string;
  onSelect: (id: string | null) => void;
  onCommitOrder: (ids: string[]) => void;
}) {
  const [localIds, setLocalIds] = useState(() => items.map(t => t.id));
  const isDraggingRef = React.useRef(false);
  const lastStoreIdsRef = React.useRef(items.map(t => t.id).join(','));
  const localIdsRef = React.useRef(localIds);
  const groupRef = React.useRef<HTMLDivElement>(null);
  const scrollCleanup = React.useRef<(() => void) | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const transactionsById = useMemo(() => new Map(items.map(item => [item.id, item])), [items]);

  React.useEffect(() => () => scrollCleanup.current?.(), []);

  // Sync if external store changes, but ONLY if the store's data actually changed from what we last saw.
  // This completely insulates the local drag state from React re-render cycles.
  React.useEffect(() => {
    const incomingIds = items.map(t => t.id).join(',');
    if (incomingIds !== lastStoreIdsRef.current) {
      setLocalIds(items.map(t => t.id));
      localIdsRef.current = items.map(t => t.id);
      lastStoreIdsRef.current = incomingIds;
    }
  }, [items]);

  const startDrag = (id: string) => {
    isDraggingRef.current = true;
    setDraggedId(id);
    scrollCleanup.current?.();
    const group = groupRef.current;
    const scroller = group?.closest<HTMLElement>('[data-ledger-scroll-body]');
    if (isMobile && group && scroller) scrollCleanup.current = boundDragScroll(group, scroller);
  };

  const handleDragEnd = () => {
    scrollCleanup.current?.();
    scrollCleanup.current = null;
    setDraggedId(null);
    // Clear flag after a short delay so the click event (which fires right after mouseup) is suppressed
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);

    const original = items.map(i => i.id).join(',');
    const current = localIdsRef.current.join(',');
    if (original !== current) {
      onCommitOrder(localIdsRef.current);
    }
  };

  const handleSelect = useCallback(
    (id: string) => {
      if (isDraggingRef.current) return;
      onSelect(id === selectedTxnId ? null : id);
    },
    [onSelect, selectedTxnId]
  );

  const moveTransaction = useCallback(
    (id: string, direction: -1 | 1) => {
      const index = localIdsRef.current.indexOf(id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= localIdsRef.current.length) return;
      const next = [...localIdsRef.current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      onCommitOrder(next);
    },
    [onCommitOrder]
  );

  return (
    <Reorder.Group
      ref={groupRef}
      data-ledger-date-group={items[0]?.date}
      axis="y"
      values={localIds}
      onReorder={ids => {
        if (ids.every((id, index) => id === localIdsRef.current[index])) return;
        localIdsRef.current = ids;
        setLocalIds(ids);
      }}
      as="div"
      style={{ listStyle: 'none', padding: 0, margin: 0 }}
    >
      {localIds.map(id => {
        const txn = transactionsById.get(id);
        if (!txn) return null;

        return (
          <LedgerReorderRow
            key={txn.id}
            txn={txn}
            groupRef={groupRef}
            isDragging={draggedId !== null}
            isDragged={draggedId === txn.id}
            isSelected={selectedTxnId === txn.id}
            accounts={accounts}
            categories={categories}
            settings={settings}
            t={t}
            onDragStart={() => startDrag(txn.id)}
            onDragEnd={handleDragEnd}
            onMove={moveTransaction}
            onSelect={handleSelect}
          />
        );
      })}
    </Reorder.Group>
  );
}

function LedgerReorderRow({
  txn,
  groupRef,
  isDragging,
  isDragged,
  isSelected,
  accounts,
  categories,
  settings,
  t,
  onDragStart,
  onDragEnd,
  onMove,
  onSelect,
}: Omit<TxnRowProps, 'onHandlePointerDown'> & {
  groupRef: React.RefObject<HTMLDivElement | null>;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const controls = useDragControls();
  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.pointerType !== 'mouse' || event.button === 0) controls.start(event);
    },
    [controls]
  );

  return (
    <Reorder.Item
      value={txn.id}
      as="div"
      dragListener={false}
      dragControls={controls}
      dragConstraints={groupRef}
      dragElastic={0}
      dragMomentum={false}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      whileDrag={{ zIndex: 50 }}
      style={{ position: 'relative' }}
    >
      <MemoTxnGridRow
        txn={txn}
        isSelected={isSelected}
        accounts={accounts}
        categories={categories}
        settings={settings}
        t={t}
        onSelect={onSelect}
        onMove={onMove}
        isDragging={isDragging}
        isDragged={isDragged}
        onHandlePointerDown={handlePointerDown}
      />
    </Reorder.Item>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function Transactions() {
  const { accounts, categories, settings, transactions, deleteTransaction, reorderTransactions } =
    useDataStore();
  const { t } = useTranslation();

  const [filter, setFilter] = useState<TxnFilter>({});
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const txns = useFilteredTransactions(filter);

  const selectedTxn = transactions.find(t => t.id === selectedTxnId) || null;

  const updateFilter = (patch: Partial<TxnFilter>) => setFilter(f => ({ ...f, ...patch }));

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
        <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-3">
          {t('ledger.noTransactions')}
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-8 text-sm lg:text-base">
          {t('ledger.noTransactionsDesc')}
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
        <div className="sticky top-0 bg-background/80 backdrop-blur-md z-20 border-b border-border p-8 pb-4 space-y-6 [@media(max-height:500px)]:p-3 [@media(max-height:500px)]:pb-2 [@media(max-height:500px)]:space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{t('ledger.title')}</h1>
              <p className="text-sm text-muted-foreground">
                {txns.length} {t('ledger.transactions')} · {t('ledger.net')}
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExportDialogOpen(true)}
                className="h-9 gap-2"
              >
                <Download className="h-4 w-4" />
                <span className="hidden md:inline">{t('ledger.exportPdf')}</span>
                <span className="md:hidden">{t('ledger.export')}</span>
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('ledger.searchDescription')}
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
                <SelectValue placeholder={t('ledger.allTime')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('ledger.allTime')}</SelectItem>
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
                <SelectValue placeholder={t('ledger.allTypes')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('ledger.allTypes')}</SelectItem>
                <SelectItem value="income">{t('common.income')}</SelectItem>
                <SelectItem value="expense">{t('common.expenses')}</SelectItem>
                <SelectItem value="transfer">{t('common.transfer')}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filter.accountId || 'all'}
              onValueChange={val => updateFilter({ accountId: val === 'all' ? undefined : val })}
            >
              <SelectTrigger className="h-9 w-[150px] text-xs">
                <SelectValue placeholder={t('ledger.allAccounts')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('ledger.allAccounts')}</SelectItem>
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
        <div className="flex-1 flex flex-col pt-4 min-h-0 px-4 md:px-8 pb-4 md:pb-8 [@media(max-height:500px)]:pt-2 [@media(max-height:500px)]:pb-2">
          {txns.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-border rounded-2xl bg-accent/5">
              <p className="text-muted-foreground font-medium">
                {t('ledger.noFilteredTransactions')}
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
                      <div className="pr-3 md:pr-5 py-3 shrink-0 w-[60px] md:w-[96px]">
                        {t('common.date')}
                      </div>
                      <div className="px-3 md:px-5 py-3 flex-1 min-w-0">
                        {t('common.description')}
                      </div>
                      <div className="hidden md:block px-3 md:px-5 py-3 shrink-0 w-[160px]">
                        {t('common.categories')}
                      </div>
                      <div className="hidden md:block px-3 md:px-5 py-3 shrink-0 w-[140px]">
                        {t('common.accounts')}
                      </div>
                      <div className="px-3 md:px-5 py-3 text-right shrink-0 w-[110px] md:w-[140px]">
                        {t('common.amount')}
                      </div>
                    </div>
                  </div>

                  {/* ── Scrollable Body ── */}
                  <div
                    data-ledger-scroll-body
                    className="flex-1 overflow-y-scroll custom-scrollbar pl-[6px]"
                  >
                    {groupedByDate.map(({ date, items }) => (
                      <DateGroup
                        key={date}
                        items={items}
                        selectedTxnId={selectedTxnId}
                        accounts={accounts}
                        categories={categories}
                        settings={settings}
                        t={t}
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
      <LedgerExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        transactions={transactions}
        accounts={accounts}
        categories={categories}
        settings={settings}
      />
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
