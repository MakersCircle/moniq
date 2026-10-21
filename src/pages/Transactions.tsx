import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addDays, format, startOfWeek } from 'date-fns';
import {
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  List,
  GripVertical,
  ListFilter,
  X,
} from 'lucide-react';
import { motion, Reorder, useDragControls } from 'framer-motion';
import { useDataStore } from '../store/dataStore';
import { useFilteredTransactions } from '../hooks/useComputed';
import { formatCurrency } from '../utils/format';
import type { TxnFilter } from '../hooks/useComputed';
import type { Transaction, Account, Category, UserSettings } from '../types';
import { useTranslation } from '@/hooks/useTranslation';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DatePicker } from '@/components/Transactions/DatePicker';
import { CategoryFilterPopover } from '@/components/Transactions/CategoryFilterPopover';
import { AccountFilterPopover } from '@/components/Transactions/AccountFilterPopover';
import { AmountFilterPopover } from '@/components/Transactions/AmountFilterPopover';
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
  const [datePeriod, setDatePeriod] = useState<'day' | 'week' | 'month' | 'year' | 'custom'>('day');
  const [dateCalendarMonth, setDateCalendarMonth] = useState(new Date());
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [typeFilterOpen, setTypeFilterOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const mobileSearchContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (mobileSearchOpen) mobileSearchRef.current?.focus();
  }, [mobileSearchOpen]);
  useEffect(() => {
    if (!mobileSearchOpen || filter.search) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!mobileSearchContainerRef.current?.contains(event.target as Node)) {
        setMobileSearchOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [filter.search, mobileSearchOpen]);
  const typeFilterOptions = [
    { value: 'income', label: t('common.income') },
    { value: 'expense', label: t('common.expenses') },
    { value: 'transfer', label: t('common.transfer') },
  ] as const;
  const selectedTypes = filter.uiTypes ?? typeFilterOptions.map(option => option.value);
  const typeFilterSummary =
    selectedTypes.length === typeFilterOptions.length
      ? t('ledger.allTypes')
      : selectedTypes.length === 0
        ? t('ledger.noTypesSelected')
        : selectedTypes.length === 1
          ? typeFilterOptions.find(option => option.value === selectedTypes[0])?.label ||
            t('ledger.noTypesSelected')
          : t('ledger.selectedTypeCount', { count: selectedTypes.length });

  const toggleType = (value: (typeof typeFilterOptions)[number]['value'], checked: boolean) => {
    const next = new Set(selectedTypes);
    if (checked) next.add(value);
    else next.delete(value);
    updateFilter({ uiTypes: [...next] });
  };

  const txns = useFilteredTransactions(filter);
  const filterWithoutAmount = useMemo(
    () => ({ ...filter, minAmount: undefined, maxAmount: undefined }),
    [filter]
  );
  const amountContextTransactions = useFilteredTransactions(filterWithoutAmount);
  const amountBounds = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    transactions.forEach(transaction => {
      if (transaction.isDeleted) return;
      min = Math.min(min, transaction.amount);
      max = Math.max(max, transaction.amount);
    });
    return Number.isFinite(min) ? { min, max } : { min: 0, max: 0 };
  }, [transactions]);
  const amountContextBounds = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    amountContextTransactions.forEach(transaction => {
      min = Math.min(min, transaction.amount);
      max = Math.max(max, transaction.amount);
    });
    return Number.isFinite(min) ? { min, max } : amountBounds;
  }, [amountBounds, amountContextTransactions]);

  const selectedTxn = transactions.find(t => t.id === selectedTxnId) || null;

  const updateFilter = (patch: Partial<TxnFilter>) => setFilter(f => ({ ...f, ...patch }));
  const hasCustomRangeValues = Boolean(filter.dateFrom || filter.dateTo);
  const hasCompleteCustomRange = Boolean(filter.dateFrom && filter.dateTo);
  const customRangeStart =
    filter.dateFrom && filter.dateTo
      ? filter.dateFrom < filter.dateTo
        ? filter.dateFrom
        : filter.dateTo
      : filter.dateFrom || filter.dateTo;
  const customRangeEnd =
    filter.dateFrom && filter.dateTo
      ? filter.dateFrom > filter.dateTo
        ? filter.dateFrom
        : filter.dateTo
      : undefined;

  const selectedFilterDates = (filter.dates || []).map(dateKey => {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day);
  });
  const datesWithTransactions = useMemo(
    () =>
      transactions
        .filter(transaction => !transaction.isDeleted)
        .map(transaction => {
          const [year, month, day] = transaction.date.split('-').map(Number);
          return new Date(year, month - 1, day);
        }),
    [transactions]
  );
  const monthsWithTransactions = useMemo(
    () =>
      new Set(
        transactions
          .filter(transaction => !transaction.isDeleted)
          .map(transaction => transaction.date.slice(0, 7))
      ),
    [transactions]
  );
  const yearsWithTransactions = useMemo(
    () =>
      new Set(
        transactions
          .filter(transaction => !transaction.isDeleted)
          .map(transaction => transaction.date.slice(0, 4))
      ),
    [transactions]
  );

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
        <div className="sticky top-0 bg-background/80 backdrop-blur-md z-20 border-b border-border px-4 py-4 md:px-8 md:py-6 space-y-6 [@media(max-height:500px)]:p-3 [@media(max-height:500px)]:space-y-3">
          <div className="flex flex-row items-center justify-between gap-3 md:flex-col md:items-start lg:flex-row lg:items-center lg:gap-4">
            <div className="min-w-0 flex-1 md:flex-none lg:flex-none">
              <h1
                className={cn(
                  'truncate font-bold tracking-tight transition-[font-size] duration-150 md:text-2xl',
                  mobileSearchOpen ? 'text-xl md:text-2xl' : 'text-2xl'
                )}
              >
                {t('ledger.title')}
              </h1>
              <p className="max-w-full truncate whitespace-nowrap text-sm text-muted-foreground">
                {txns.length} {t('ledger.transactions')}
              </p>
            </div>
            <div className="flex w-auto shrink-0 items-center gap-0.5 md:w-full md:gap-2 lg:w-auto">
              <div className="relative hidden min-w-0 flex-1 md:block lg:w-64 lg:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('ledger.searchDescription')}
                  className={cn('h-9 pl-9 text-xs', filter.search && 'pr-9')}
                  value={filter.search || ''}
                  onChange={e => updateFilter({ search: e.target.value || undefined })}
                />
                {filter.search && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t('ledger.clearSearch')}
                    className="absolute right-0.5 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => updateFilter({ search: undefined })}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              <div
                ref={mobileSearchContainerRef}
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center overflow-hidden rounded-md border border-transparent bg-transparent transition-[width,background-color,border-color] duration-200 md:hidden',
                  mobileSearchOpen && 'w-40 border-input bg-background shadow-sm'
                )}
              >
                <Button
                  type="button"
                  variant={filter.search ? 'secondary' : 'ghost'}
                  size="icon"
                  aria-label={t('ledger.searchDescription')}
                  aria-expanded={mobileSearchOpen}
                  title={t('ledger.searchDescription')}
                  className="h-10 w-10 shrink-0 rounded-r-none border-0 bg-transparent px-0 shadow-none hover:bg-accent"
                  onClick={() => {
                    if (mobileSearchOpen) {
                      setMobileSearchOpen(false);
                      mobileSearchRef.current?.blur();
                    } else {
                      setMobileSearchOpen(true);
                    }
                  }}
                >
                  <Search className="h-4 w-4" />
                </Button>
                <Input
                  ref={mobileSearchRef}
                  placeholder={t('ledger.searchDescription')}
                  aria-label={t('ledger.searchDescription')}
                  tabIndex={mobileSearchOpen ? 0 : -1}
                  className={cn(
                    'h-9 min-w-0 border-0 bg-transparent px-0 text-xs opacity-0 transition-opacity duration-150 focus-visible:ring-0',
                    mobileSearchOpen ? 'w-full opacity-100' : 'w-0 px-0'
                  )}
                  value={filter.search || ''}
                  onChange={event => updateFilter({ search: event.target.value || undefined })}
                  onKeyDown={event => {
                    if (event.key === 'Escape') {
                      setMobileSearchOpen(false);
                      mobileSearchRef.current?.blur();
                    }
                  }}
                />
                {filter.search && mobileSearchOpen && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t('ledger.clearSearch')}
                    className="h-8 w-8 shrink-0 rounded-l-none px-0 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      updateFilter({ search: undefined });
                      mobileSearchRef.current?.focus();
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              <Popover
                open={typeFilterOpen}
                onOpenChange={open => {
                  setTypeFilterOpen(open);
                  if (open) setMobileSearchOpen(false);
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant={
                      selectedTypes.length !== typeFilterOptions.length ? 'secondary' : 'ghost'
                    }
                    size="icon"
                    aria-label={t('ledger.filterByType')}
                    aria-expanded={typeFilterOpen}
                    title={t('ledger.filterByType')}
                    className={cn(
                      'h-10 w-10 shrink-0 justify-center border-0 bg-transparent px-2 shadow-none transition-[width] duration-150 hover:bg-accent md:h-9 md:w-[120px] md:justify-between md:border md:border-input md:bg-background md:px-3 md:shadow-sm md:hover:bg-accent/50 md:duration-200',
                      typeFilterOpen && 'w-36 opacity-0 md:opacity-0',
                      selectedTypes.length !== typeFilterOptions.length &&
                        'bg-secondary md:bg-background'
                    )}
                  >
                    <ListFilter className="h-4 w-4 md:hidden" />
                    <span className="hidden min-w-0 flex-1 truncate text-left text-xs md:block">
                      {typeFilterSummary}
                    </span>
                    <ChevronDown className="hidden h-4 w-4 opacity-50 md:block" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  side="bottom"
                  align="end"
                  sideOffset={-36}
                  avoidCollisions={false}
                  className="max-h-[calc(100dvh-1rem)] w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] overflow-y-auto p-0 duration-150 md:duration-200"
                >
                  <div
                    role="group"
                    aria-label={t('ledger.filterByType')}
                    className="flex flex-col p-1"
                  >
                    <div className="hidden h-9 items-center justify-between gap-2 rounded-md px-2 text-xs font-medium md:flex">
                      <span className="min-w-0 truncate">{typeFilterSummary}</span>
                      <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                    </div>
                    {typeFilterOptions.map(option => {
                      const selected = selectedTypes.includes(option.value);
                      const checkboxId = `type-filter-${option.value}`;
                      return (
                        <label
                          key={option.value}
                          htmlFor={checkboxId}
                          className="group flex h-9 cursor-pointer items-center gap-2 rounded-md px-2 text-xs hover:bg-accent"
                        >
                          <span className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center">
                            <Checkbox
                              id={checkboxId}
                              aria-label={option.label}
                              checked={selected}
                              className="border-input transition-colors duration-150 focus-visible:ring-muted-foreground/40 focus-visible:ring-offset-0 group-hover:border-primary data-[state=checked]:border-primary"
                              onCheckedChange={value => toggleType(option.value, value === true)}
                            />
                          </span>
                          <span>{option.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setExportDialogOpen(true)}
                aria-label={t('ledger.exportPdf')}
                title={t('ledger.exportPdf')}
                className="h-10 w-10 shrink-0 justify-center border-0 bg-transparent px-0 shadow-none hover:bg-accent md:h-9 md:w-auto md:gap-2 md:border md:border-input md:bg-background md:px-3 md:shadow-sm"
              >
                <Download className="h-4 w-4 -translate-x-1.5 md:translate-x-0" />
                <span className="hidden md:inline">{t('ledger.exportPdf')}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 flex flex-col pt-4 min-h-0 px-4 md:px-8 pb-4 md:pb-8 [@media(max-height:500px)]:pt-2 [@media(max-height:500px)]:pb-2">
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
                    <div className="pr-1 md:pr-5 py-3 shrink-0 w-[60px] md:w-[96px] flex items-center gap-0.5">
                      {t('common.date')}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={
                              filter.dates?.length ||
                              filter.months?.length ||
                              filter.years?.length ||
                              hasCustomRangeValues
                                ? 'secondary'
                                : 'ghost'
                            }
                            size="icon-xs"
                            aria-label={t('ledger.filterByDate')}
                            title={t('ledger.filterByDate')}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          >
                            <ListFilter className="h-3 w-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="start"
                          side="bottom"
                          className="w-[min(22rem,calc(100vw-2rem))] p-0 overflow-hidden"
                        >
                          <div className="border-b border-border px-3 pt-3 pb-3">
                            <div className="grid grid-cols-5 gap-1">
                              {(['day', 'week', 'month', 'year', 'custom'] as const).map(period => (
                                <Button
                                  key={period}
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  disabled={
                                    period !== 'day' &&
                                    period !== 'week' &&
                                    period !== 'month' &&
                                    period !== 'year' &&
                                    period !== 'custom'
                                  }
                                  className={cn(
                                    'relative h-8 px-1 text-xs capitalize transition-colors duration-200',
                                    period === datePeriod && 'text-foreground',
                                    period !== datePeriod &&
                                      (period === 'day' ||
                                        period === 'week' ||
                                        period === 'month' ||
                                        period === 'year' ||
                                        period === 'custom') &&
                                      'hover:bg-primary/15 hover:text-primary'
                                  )}
                                  onClick={() => {
                                    if (
                                      period === 'day' ||
                                      period === 'week' ||
                                      period === 'month' ||
                                      period === 'year' ||
                                      period === 'custom'
                                    ) {
                                      setDatePeriod(period);
                                      updateFilter({
                                        dates: undefined,
                                        months: undefined,
                                        years: undefined,
                                        dateFrom: undefined,
                                        dateTo: undefined,
                                      });
                                    }
                                  }}
                                >
                                  {period === datePeriod && (
                                    <motion.span
                                      layoutId="ledger-date-period-indicator"
                                      className="absolute inset-0 rounded-md bg-secondary"
                                      transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                                    />
                                  )}
                                  <span className="relative z-10">
                                    {t(`ledger.datePeriod.${period}`)}
                                  </span>
                                </Button>
                              ))}
                            </div>
                          </div>
                          <div className="p-3">
                            {datePeriod === 'custom' ? (
                              <div className="space-y-4 px-3 pb-3">
                                <label className="block space-y-1.5 text-xs font-medium">
                                  <span>{t('ledger.fromDate')}</span>
                                  <DatePicker
                                    date={filter.dateFrom || ''}
                                    onChange={date => updateFilter({ dateFrom: date })}
                                    fixedWeeks
                                    rangeAnchor={filter.dateTo}
                                    rangeStart={customRangeStart}
                                    rangeEnd={customRangeEnd}
                                    rangeSelectionRole="from"
                                    onCompleteRange={(firstDate, secondDate) =>
                                      updateFilter({ dateFrom: firstDate, dateTo: secondDate })
                                    }
                                  />
                                </label>
                                <label className="block space-y-1.5 text-xs font-medium">
                                  <span>{t('ledger.toDate')}</span>
                                  <DatePicker
                                    date={filter.dateTo || ''}
                                    onChange={date => updateFilter({ dateTo: date })}
                                    fixedWeeks
                                    rangeAnchor={filter.dateFrom}
                                    rangeStart={customRangeStart}
                                    rangeEnd={customRangeEnd}
                                    rangeSelectionRole="to"
                                    onCompleteRange={(firstDate, secondDate) =>
                                      updateFilter({ dateTo: firstDate, dateFrom: secondDate })
                                    }
                                  />
                                </label>
                              </div>
                            ) : datePeriod === 'year' ? (
                              <div className="space-y-3 px-3 pb-3">
                                <div className="flex items-center justify-between">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    aria-label={t('ledger.previousDecade')}
                                    onClick={() =>
                                      setDateCalendarMonth(
                                        current =>
                                          new Date(
                                            current.getFullYear() - 10,
                                            current.getMonth(),
                                            1
                                          )
                                      )
                                    }
                                  >
                                    <ChevronLeft className="h-4 w-4" />
                                  </Button>
                                  <span className="text-sm font-medium">
                                    {Math.floor(dateCalendarMonth.getFullYear() / 10) * 10}–
                                    {Math.floor(dateCalendarMonth.getFullYear() / 10) * 10 + 9}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    aria-label={t('ledger.nextDecade')}
                                    onClick={() =>
                                      setDateCalendarMonth(
                                        current =>
                                          new Date(
                                            current.getFullYear() + 10,
                                            current.getMonth(),
                                            1
                                          )
                                      )
                                    }
                                  >
                                    <ChevronRight className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div className="grid grid-cols-5 gap-2">
                                  {Array.from({ length: 10 }, (_, yearIndex) => {
                                    const decadeStart =
                                      Math.floor(dateCalendarMonth.getFullYear() / 10) * 10;
                                    const year = String(decadeStart + yearIndex);
                                    const isSelected = filter.years?.includes(year) || false;
                                    const hasTransactions = yearsWithTransactions.has(year);
                                    return (
                                      <Button
                                        key={year}
                                        type="button"
                                        variant="ghost"
                                        aria-pressed={isSelected}
                                        className={cn(
                                          'relative h-12 justify-center gap-1 transition-colors',
                                          isSelected
                                            ? 'bg-primary/25 text-foreground hover:bg-primary/30'
                                            : 'hover:bg-primary/10 hover:text-primary'
                                        )}
                                        onClick={() => {
                                          const selectedYears = new Set(filter.years || []);
                                          if (isSelected) selectedYears.delete(year);
                                          else selectedYears.add(year);
                                          updateFilter({
                                            years: selectedYears.size
                                              ? [...selectedYears].sort()
                                              : undefined,
                                          });
                                        }}
                                      >
                                        {year}
                                        {hasTransactions && (
                                          <span
                                            aria-hidden="true"
                                            className="h-1 w-1 rounded-full bg-primary"
                                          />
                                        )}
                                      </Button>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : datePeriod === 'month' ? (
                              <div className="space-y-3 px-3 pb-3">
                                <div className="flex items-center justify-between">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    aria-label={t('ledger.previousYear')}
                                    onClick={() =>
                                      setDateCalendarMonth(
                                        current =>
                                          new Date(current.getFullYear() - 1, current.getMonth(), 1)
                                      )
                                    }
                                  >
                                    <ChevronLeft className="h-4 w-4" />
                                  </Button>
                                  <span className="text-sm font-medium">
                                    {dateCalendarMonth.getFullYear()}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    aria-label={t('ledger.nextYear')}
                                    onClick={() =>
                                      setDateCalendarMonth(
                                        current =>
                                          new Date(current.getFullYear() + 1, current.getMonth(), 1)
                                      )
                                    }
                                  >
                                    <ChevronRight className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  {Array.from({ length: 12 }, (_, monthIndex) => {
                                    const monthDate = new Date(
                                      dateCalendarMonth.getFullYear(),
                                      monthIndex,
                                      1
                                    );
                                    const monthKey = format(monthDate, 'yyyy-MM');
                                    const isSelected = filter.months?.includes(monthKey) || false;
                                    const hasTransactions = monthsWithTransactions.has(monthKey);
                                    return (
                                      <Button
                                        key={monthKey}
                                        type="button"
                                        variant="ghost"
                                        aria-pressed={isSelected}
                                        className={cn(
                                          'relative h-12 justify-center gap-1 transition-colors',
                                          isSelected
                                            ? 'bg-primary/25 text-foreground hover:bg-primary/30'
                                            : 'hover:bg-primary/10 hover:text-primary'
                                        )}
                                        onClick={() => {
                                          const selectedMonths = new Set(filter.months || []);
                                          if (isSelected) selectedMonths.delete(monthKey);
                                          else selectedMonths.add(monthKey);
                                          updateFilter({
                                            months: selectedMonths.size
                                              ? [...selectedMonths].sort()
                                              : undefined,
                                          });
                                        }}
                                      >
                                        {monthDate.toLocaleDateString('en-IN', { month: 'long' })}
                                        {hasTransactions && (
                                          <span
                                            aria-hidden="true"
                                            className="h-1 w-1 rounded-full bg-primary"
                                          />
                                        )}
                                      </Button>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : datePeriod === 'day' ? (
                              <Calendar
                                mode="multiple"
                                navLayout="around"
                                className="p-0"
                                selected={selectedFilterDates}
                                modifiers={{ hasTransaction: datesWithTransactions }}
                                month={dateCalendarMonth}
                                onMonthChange={setDateCalendarMonth}
                                onSelect={dates =>
                                  updateFilter({
                                    dates: dates?.length
                                      ? dates.map(date => format(date, 'yyyy-MM-dd'))
                                      : undefined,
                                  })
                                }
                              />
                            ) : (
                              <Calendar
                                mode="single"
                                navLayout="around"
                                className="p-0"
                                classNames={{
                                  week: cn(
                                    'flex w-full mt-2 justify-between gap-1',
                                    datePeriod === 'week' && 'group/week'
                                  ),
                                }}
                                required
                                selected={selectedFilterDates[0]}
                                modifiers={{
                                  hasTransaction: datesWithTransactions,
                                  selectedWeek: selectedFilterDates,
                                  weekMode: true,
                                }}
                                month={dateCalendarMonth}
                                onMonthChange={setDateCalendarMonth}
                                onSelect={date => {
                                  if (!date) {
                                    return;
                                  }
                                  const weekStart = startOfWeek(date, { weekStartsOn: 0 });
                                  const weekDates = Array.from({ length: 7 }, (_, dayIndex) =>
                                    format(addDays(weekStart, dayIndex), 'yyyy-MM-dd')
                                  );
                                  const selectedDates = new Set(filter.dates || []);
                                  if (weekDates.every(weekDate => selectedDates.has(weekDate))) {
                                    weekDates.forEach(weekDate => selectedDates.delete(weekDate));
                                  } else {
                                    weekDates.forEach(weekDate => selectedDates.add(weekDate));
                                  }
                                  updateFilter({
                                    dates: selectedDates.size
                                      ? [...selectedDates].sort()
                                      : undefined,
                                  });
                                }}
                              />
                            )}
                          </div>
                          {filter.dates?.length ||
                          filter.months?.length ||
                          filter.years?.length ||
                          hasCustomRangeValues ? (
                            <div className="flex items-center justify-between border-t border-border px-4 py-3">
                              <span className="text-xs text-muted-foreground">
                                {datePeriod === 'custom'
                                  ? hasCompleteCustomRange
                                    ? t('ledger.customRangeSelected')
                                    : t('ledger.customRangeIncomplete')
                                  : datePeriod === 'year'
                                    ? t('ledger.selectedYearCount', {
                                        count: filter.years?.length || 0,
                                      })
                                    : datePeriod === 'month'
                                      ? t('ledger.selectedMonthCount', {
                                          count: filter.months?.length || 0,
                                        })
                                      : datePeriod === 'week'
                                        ? t('ledger.selectedWeekCount', {
                                            count: Math.floor((filter.dates?.length || 0) / 7),
                                          })
                                        : t('ledger.selectedDateCount', {
                                            count: filter.dates?.length || 0,
                                          })}
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                onClick={() =>
                                  updateFilter({
                                    dates: undefined,
                                    months: undefined,
                                    years: undefined,
                                    dateFrom: undefined,
                                    dateTo: undefined,
                                  })
                                }
                              >
                                {t('ledger.clearDateFilter')}
                              </Button>
                            </div>
                          ) : null}
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="px-3 md:px-5 py-3 flex-1 min-w-0">
                      {t('common.description')}
                    </div>
                    <div className="hidden md:flex items-center gap-1 px-3 md:px-5 py-3 shrink-0 w-[160px]">
                      <span>{t('common.categories')}</span>
                      <CategoryFilterPopover
                        categories={categories}
                        selectedIds={filter.categoryIds || []}
                        onChange={ids =>
                          updateFilter({ categoryIds: ids.length ? ids : undefined })
                        }
                        t={t}
                      />
                    </div>
                    <div className="hidden md:flex items-center gap-1 px-3 md:px-5 py-3 shrink-0 w-[140px]">
                      <span>{t('common.accounts')}</span>
                      <AccountFilterPopover
                        accounts={accounts}
                        selectedIds={filter.accountIds || []}
                        onChange={ids => updateFilter({ accountIds: ids.length ? ids : undefined })}
                        t={t}
                      />
                    </div>
                    <div className="flex items-center justify-end gap-1 px-3 md:px-5 py-3 text-right shrink-0 w-[110px] md:w-[140px]">
                      <span>{t('common.amount')}</span>
                      <AmountFilterPopover
                        minBound={amountBounds.min}
                        maxBound={amountBounds.max}
                        contextMin={amountContextBounds.min}
                        contextMax={amountContextBounds.max}
                        minAmount={filter.minAmount}
                        maxAmount={filter.maxAmount}
                        settings={settings}
                        onChange={(minAmount, maxAmount) =>
                          updateFilter({
                            minAmount:
                              minAmount > amountBounds.min + 0.000001 ? minAmount : undefined,
                            maxAmount:
                              maxAmount < amountBounds.max - 0.000001 ? maxAmount : undefined,
                          })
                        }
                        onClear={() => updateFilter({ minAmount: undefined, maxAmount: undefined })}
                        t={t}
                      />
                    </div>
                  </div>
                </div>

                {/* ── Scrollable Body ── */}
                <div
                  data-ledger-scroll-body
                  className={cn(
                    'flex-1 overflow-y-scroll custom-scrollbar pl-[6px]',
                    txns.length === 0 && 'flex items-center justify-center px-4 text-center'
                  )}
                >
                  {txns.length === 0 ? (
                    <p className="text-muted-foreground font-medium">
                      {t('ledger.noFilteredTransactions')}
                    </p>
                  ) : (
                    groupedByDate.map(({ date, items }) => (
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
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
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
