import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Info, RotateCcw, Trash2, Landmark, CreditCard, ReceiptText, Tag } from 'lucide-react';
import { useDataStore } from '@/store/dataStore';
import { formatCurrency } from '@/utils/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import SettingsLayout from '@/components/Layout/SettingsLayout';
import type { Transaction, Account, PaymentMethod, Category, UserSettings } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import { LedgerEngine } from '@/lib/ledger';

function InfoTooltip({ text, position = 'top' }: { text: string; position?: 'top' | 'bottom' }) {
  return (
    <div className="group relative inline-flex items-center justify-center">
      <Info className="h-3.5 w-3.5 text-muted-foreground ml-1.5 flex-shrink-0 cursor-help transition-colors hover:text-foreground" />
      <div
        className={`pointer-events-none absolute left-1/2 z-50 w-48 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100 ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}
      >
        <div className="rounded-md bg-popover px-3 py-2 text-[10px] font-medium leading-tight text-popover-foreground shadow-md border border-border">
          {text}
        </div>
      </div>
    </div>
  );
}

function RestoreAction({
  label,
  onClick,
  isRestoring,
  compact = false,
}: {
  label: string;
  onClick: () => void;
  isRestoring: boolean;
  compact?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size={compact ? 'sm' : 'default'}
      aria-label={`Restore ${label}`}
      title={`Restore ${label}`}
      disabled={isRestoring}
      className={cn(
        'text-primary',
        compact
          ? 'h-8 w-8 p-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100'
          : 'h-9 w-full gap-2'
      )}
      onClick={onClick}
    >
      <RotateCcw className="h-4 w-4" />
      {!compact && <span>Restore</span>}
    </Button>
  );
}

type SortOption = 'deleted' | 'created';

export default function Trash() {
  const {
    transactions,
    accounts,
    categories,
    methods,
    settings,
    updateTransaction,
    updateMethod,
    updateCategory,
    restoreAccount,
  } = useDataStore();
  const { t } = useTranslation();
  const [restoring, setRestoring] = useState<Record<string, boolean>>({});
  const [sortBy, setSortBy] = useState<SortOption>('deleted');
  const [activeTab, setActiveTab] = useState('transactions');
  const [error, setError] = useState<string | null>(null);
  const tabScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const selectedTab = tabScrollRef.current?.querySelector<HTMLElement>('[data-state="active"]');
    if (!selectedTab) return;

    selectedTab.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [activeTab]);

  const deletedTxns = useMemo(() => transactions.filter(t => t.isDeleted), [transactions]);
  const deletedAccounts = useMemo(() => accounts.filter(a => a.isDeleted), [accounts]);
  const deletedMethods = useMemo(() => methods.filter(m => m.isDeleted), [methods]);
  const deletedCategories = useMemo(() => categories.filter(c => c.isDeleted), [categories]);

  const handleRestore = (type: string, id: string) => {
    setError(null);

    // Safety check for methods
    if (type === 'method') {
      const method = methods.find(m => m.id === id);
      const account = accounts.find(a => a.id === method?.linkedAccountId);
      if (account?.isDeleted) {
        setError(
          `Cannot restore "${method?.name}" because its linked account "${account.name}" is deleted. Restore the account first.`
        );
        return;
      }
    }

    // Safety checks for transactions
    if (type === 'transaction') {
      const txn = transactions.find(t => t.id === id);
      if (txn) {
        // Find the main account for this transaction
        const entry = LedgerEngine.getPrimaryAccountEntry(txn, accounts);
        const account = accounts.find(a => a.id === entry?.accountId);

        if (account?.isDeleted) {
          setError(
            `Cannot restore this transaction because account "${account.name}" is deleted. Restore the account first.`
          );
          return;
        }

        // Check category for non-transfer txns
        if (txn.uiType !== 'transfer') {
          const catEntry = LedgerEngine.getCategoryEntry(txn, categories);
          const cat = categories.find(c => c.id === catEntry?.accountId);
          if (cat?.isDeleted) {
            setError(
              `Cannot restore this transaction because category "${cat.head}" is deleted. Restore the category first.`
            );
            return;
          }
        }
      }
    }

    setRestoring(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      if (type === 'transaction') updateTransaction(id, { isDeleted: false });
      if (type === 'account') restoreAccount(id);
      if (type === 'method') updateMethod(id, { isDeleted: false });
      if (type === 'category') updateCategory(id, { isDeleted: false });
      setRestoring(prev => {
        const n = { ...prev };
        delete n[id];
        return n;
      });
    }, 150);
  };

  const renderEmpty = () => (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl bg-accent/20 border border-border/50 border-dashed opacity-70">
      <Trash2 className="h-10 w-10 text-muted-foreground/50 mb-3" />
      <h3 className="text-sm font-bold text-muted-foreground">{t('trash.noDeleted')}</h3>
      <p className="text-[10px] text-muted-foreground mt-1 max-w-[250px] uppercase font-bold tracking-[0.1em]">
        {t('trash.emptyDesc')}
      </p>
    </div>
  );

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <div className="sticky top-0 bg-background/95 backdrop-blur-md z-40 pb-4 pt-2 -mx-1 px-1">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-destructive">
                  {t('trash.title')}
                </h2>
                <InfoTooltip position="bottom" text={t('trash.infoText')} />
              </div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                {t('trash.subtitle')}
              </p>
            </div>
            <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
              <span className="mr-1 whitespace-nowrap text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                {t('trash.sortBy')}
              </span>
              <Select value={sortBy} onValueChange={val => setSortBy(val as SortOption)}>
                <SelectTrigger className="h-9 w-[160px] text-[10px] font-bold uppercase tracking-widest">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    value="deleted"
                    className="text-[10px] font-bold uppercase tracking-widest"
                  >
                    {t('trash.recentlyDeleted')}
                  </SelectItem>
                  <SelectItem
                    value="created"
                    className="text-[10px] font-bold uppercase tracking-widest"
                  >
                    {t('trash.dateCreated')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div
              ref={tabScrollRef}
              className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <TabsList className="h-10 w-max min-w-full flex-nowrap justify-start gap-2 rounded-xl border border-border/50 bg-accent/30 p-1">
                <TabsTrigger
                  value="transactions"
                  className="h-8 flex-none gap-2 whitespace-nowrap rounded-lg px-3 text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <ReceiptText className="h-3.5 w-3.5" />
                  {t('common.transactions')} ({deletedTxns.length})
                </TabsTrigger>
                <TabsTrigger
                  value="accounts"
                  className="h-8 flex-none gap-2 whitespace-nowrap rounded-lg px-3 text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <Landmark className="h-3.5 w-3.5" />
                  {t('common.accounts')} ({deletedAccounts.length})
                </TabsTrigger>
                <TabsTrigger
                  value="methods"
                  className="h-8 flex-none gap-2 whitespace-nowrap rounded-lg px-3 text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  {t('trash.payMethods')} ({deletedMethods.length})
                </TabsTrigger>
                <TabsTrigger
                  value="categories"
                  className="h-8 flex-none gap-2 whitespace-nowrap rounded-lg px-3 text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <Tag className="h-3.5 w-3.5" />
                  {t('common.categories')} ({deletedCategories.length})
                </TabsTrigger>
              </TabsList>
            </div>
          </Tabs>
        </div>

        {error && (
          <div className="mx-1 flex min-w-0 items-start gap-2 break-words rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-[11px] font-bold uppercase tracking-wider text-destructive animate-in fade-in slide-in-from-top-1">
            <Info className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="pt-2">
          {activeTab === 'transactions' &&
            (deletedTxns.length === 0 ? (
              renderEmpty()
            ) : (
              <TransactionsTable
                transactions={deletedTxns}
                sortBy={sortBy}
                settings={settings}
                accounts={accounts}
                restoring={restoring}
                onRestore={id => handleRestore('transaction', id)}
                t={t}
              />
            ))}

          {activeTab === 'accounts' &&
            (deletedAccounts.length === 0 ? (
              renderEmpty()
            ) : (
              <AccountsTable
                accounts={deletedAccounts}
                sortBy={sortBy}
                settings={settings}
                restoring={restoring}
                onRestore={id => handleRestore('account', id)}
                t={t}
              />
            ))}

          {activeTab === 'methods' &&
            (deletedMethods.length === 0 ? (
              renderEmpty()
            ) : (
              <MethodsTable
                methods={deletedMethods}
                accounts={accounts}
                sortBy={sortBy}
                restoring={restoring}
                onRestore={id => handleRestore('method', id)}
                t={t}
              />
            ))}

          {activeTab === 'categories' &&
            (deletedCategories.length === 0 ? (
              renderEmpty()
            ) : (
              <CategoriesTable
                categories={deletedCategories}
                sortBy={sortBy}
                restoring={restoring}
                onRestore={id => handleRestore('category', id)}
                t={t}
              />
            ))}
        </div>
      </div>
    </SettingsLayout>
  );
}

// Sub-components for cleaner code

interface TransactionsTableProps {
  transactions: Transaction[];
  sortBy: SortOption;
  settings: UserSettings;
  accounts: Account[];
  restoring: Record<string, boolean>;
  onRestore: (id: string) => void;
  t: (key: string) => string;
}

function TransactionsTable({
  transactions,
  sortBy,
  settings,
  accounts,
  restoring,
  onRestore,
  t,
}: TransactionsTableProps) {
  const sorted = [...transactions].sort((a, b) => {
    if (sortBy === 'deleted') return b.updatedAt.localeCompare(a.updatedAt);
    return b.date.localeCompare(a.date);
  });

  return (
    <>
      <div className="hidden rounded-xl border border-border bg-card shadow-sm sm:block sm:overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-accent/30 text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
            <tr>
              <th className="px-5 py-3 border-b border-border">{t('common.date')}</th>
              <th className="px-5 py-3 border-b border-border">{t('common.description')}</th>
              <th className="px-5 py-3 border-b border-border">{t('common.accounts')}</th>
              <th className="px-5 py-3 border-b border-border text-right">{t('common.amount')}</th>
              <th className="px-5 py-3 border-b border-border w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map(txn => (
              <tr
                key={txn.id}
                className={cn(
                  'group hover:bg-accent/20 transition-all',
                  restoring[txn.id] && 'opacity-0 scale-95'
                )}
              >
                <td className="px-5 py-3 whitespace-nowrap text-xs font-bold">{txn.date}</td>
                <td className="px-5 py-3">
                  <p className="font-bold text-xs">
                    {txn.note || t('common.noDescriptionProvided')}
                  </p>
                  <p className="text-[9px] text-muted-foreground uppercase font-black tracking-tighter">
                    {t('trash.deletedOn')} {txn.updatedAt.slice(0, 10)}
                  </p>
                </td>
                <td className="px-5 py-3 text-xs text-muted-foreground">
                  {accounts.find((a: Account) => a.id === txn.entries[0]?.accountId)?.name ||
                    t('common.unknown')}
                </td>
                <td
                  className={cn(
                    'px-5 py-3 text-right mono font-bold',
                    txn.uiType === 'income' ? 'text-income' : 'text-expense'
                  )}
                >
                  {txn.uiType === 'income' ? '+' : ''}
                  {formatCurrency(txn.amount, settings)}
                </td>
                <td className="px-2 py-3">
                  <RestoreAction
                    label={txn.note || t('common.noDescriptionProvided')}
                    isRestoring={Boolean(restoring[txn.id])}
                    onClick={() => onRestore(txn.id)}
                    compact
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-2 sm:hidden">
        {sorted.map(txn => {
          const description = txn.note || t('common.noDescriptionProvided');
          const accountName =
            accounts.find(account => account.id === txn.entries[0]?.accountId)?.name ||
            t('common.unknown');

          return (
            <Card
              key={txn.id}
              className={cn('border-border shadow-sm', restoring[txn.id] && 'opacity-0 scale-95')}
            >
              <CardContent className="space-y-3 p-3">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-bold [overflow-wrap:anywhere]">
                      {description}
                    </p>
                    <p className="mt-0.5 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
                      {accountName}
                    </p>
                  </div>
                  <p
                    className={cn(
                      'shrink-0 text-right mono text-sm font-bold',
                      txn.uiType === 'income' ? 'text-income' : 'text-expense'
                    )}
                  >
                    {txn.uiType === 'income' ? '+' : ''}
                    {formatCurrency(txn.amount, settings)}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2 text-[10px] font-medium text-muted-foreground">
                  <span>{txn.date}</span>
                  <span className="text-right">
                    {t('trash.deletedOn')} {txn.updatedAt.slice(0, 10)}
                  </span>
                </div>
                <RestoreAction
                  label={description}
                  isRestoring={Boolean(restoring[txn.id])}
                  onClick={() => onRestore(txn.id)}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}

interface AccountsTableProps {
  accounts: Account[];
  sortBy: SortOption;
  settings: UserSettings;
  restoring: Record<string, boolean>;
  onRestore: (id: string) => void;
  t: (key: string) => string;
}

function AccountsTable({ accounts, settings, restoring, onRestore, t }: AccountsTableProps) {
  const sorted = [...accounts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <>
      <div className="hidden rounded-xl border border-border bg-card shadow-sm sm:block sm:overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-accent/30 text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
            <tr>
              <th className="px-5 py-3 border-b border-border">{t('common.name')}</th>
              <th className="px-5 py-3 border-b border-border">{t('common.type')}</th>
              <th className="px-5 py-3 border-b border-border text-right">
                {t('account.openingBalance')}
              </th>
              <th className="px-5 py-3 border-b border-border w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map(a => (
              <tr
                key={a.id}
                className={cn(
                  'group hover:bg-accent/20 transition-all',
                  restoring[a.id] && 'opacity-0 scale-95'
                )}
              >
                <td className="px-5 py-3">
                  <p className="font-bold text-xs">{a.name}</p>
                  <p className="text-[9px] text-muted-foreground uppercase font-black tracking-tighter">
                    {t('trash.deletedOn')} {a.updatedAt.slice(0, 10)}
                  </p>
                </td>
                <td className="px-5 py-3 text-xs text-muted-foreground uppercase font-bold tracking-widest">
                  {a.type}
                </td>
                <td className="px-5 py-3 text-right mono font-bold text-xs">
                  {formatCurrency(a.initialBalance, settings)}
                </td>
                <td className="px-2 py-3">
                  <RestoreAction
                    label={a.name}
                    isRestoring={Boolean(restoring[a.id])}
                    onClick={() => onRestore(a.id)}
                    compact
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-2 sm:hidden">
        {sorted.map(a => (
          <Card
            key={a.id}
            className={cn('border-border shadow-sm', restoring[a.id] && 'opacity-0 scale-95')}
          >
            <CardContent className="space-y-3 p-3">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-bold [overflow-wrap:anywhere]">{a.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{a.type}</p>
                </div>
                <p className="shrink-0 text-right mono text-sm font-bold">
                  {formatCurrency(a.initialBalance, settings)}
                </p>
              </div>
              <p className="border-t border-border/60 pt-2 text-[10px] font-medium text-muted-foreground">
                {t('trash.deletedOn')} {a.updatedAt.slice(0, 10)}
              </p>
              <RestoreAction
                label={a.name}
                isRestoring={Boolean(restoring[a.id])}
                onClick={() => onRestore(a.id)}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

interface MethodsTableProps {
  methods: PaymentMethod[];
  accounts: Account[];
  sortBy: SortOption;
  restoring: Record<string, boolean>;
  onRestore: (id: string) => void;
  t: (key: string) => string;
}

function MethodsTable({ methods, accounts, restoring, onRestore, t }: MethodsTableProps) {
  const sorted = [...methods].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <>
      <div className="hidden rounded-xl border border-border bg-card shadow-sm sm:block sm:overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-accent/30 text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
            <tr>
              <th className="px-5 py-3 border-b border-border">{t('trash.methodName')}</th>
              <th className="px-5 py-3 border-b border-border">{t('method.linkedAccount')}</th>
              <th className="px-5 py-3 border-b border-border w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map(m => (
              <tr
                key={m.id}
                className={cn(
                  'group hover:bg-accent/20 transition-all',
                  restoring[m.id] && 'opacity-0 scale-95'
                )}
              >
                <td className="px-5 py-3">
                  <p className="font-bold text-xs">{m.name}</p>
                  <p className="text-[9px] text-muted-foreground uppercase font-black tracking-tighter">
                    {t('trash.deletedOn')} {m.updatedAt.slice(0, 10)}
                  </p>
                </td>
                <td className="px-5 py-3 text-xs text-muted-foreground font-bold">
                  {accounts.find((a: Account) => a.id === m.linkedAccountId)?.name ||
                    t('common.unknown')}
                </td>
                <td className="px-2 py-3">
                  <RestoreAction
                    label={m.name}
                    isRestoring={Boolean(restoring[m.id])}
                    onClick={() => onRestore(m.id)}
                    compact
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-2 sm:hidden">
        {sorted.map(m => {
          const accountName =
            accounts.find(account => account.id === m.linkedAccountId)?.name || t('common.unknown');
          return (
            <Card
              key={m.id}
              className={cn('border-border shadow-sm', restoring[m.id] && 'opacity-0 scale-95')}
            >
              <CardContent className="space-y-3 p-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-bold [overflow-wrap:anywhere]">{m.name}</p>
                  <p className="mt-0.5 break-words text-xs font-medium text-muted-foreground [overflow-wrap:anywhere]">
                    {t('method.linkedAccount')}: {accountName}
                  </p>
                </div>
                <p className="border-t border-border/60 pt-2 text-[10px] font-medium text-muted-foreground">
                  {t('trash.deletedOn')} {m.updatedAt.slice(0, 10)}
                </p>
                <RestoreAction
                  label={m.name}
                  isRestoring={Boolean(restoring[m.id])}
                  onClick={() => onRestore(m.id)}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}

interface CategoriesTableProps {
  categories: Category[];
  sortBy: SortOption;
  restoring: Record<string, boolean>;
  onRestore: (id: string) => void;
  t: (key: string) => string;
}

function CategoriesTable({ categories, restoring, onRestore, t }: CategoriesTableProps) {
  const sorted = [...categories].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <>
      <div className="hidden rounded-xl border border-border bg-card shadow-sm sm:block sm:overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-accent/30 text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
            <tr>
              <th className="px-5 py-3 border-b border-border">{t('common.categories')}</th>
              <th className="px-5 py-3 border-b border-border">{t('common.group')}</th>
              <th className="px-5 py-3 border-b border-border w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map(c => (
              <tr
                key={c.id}
                className={cn(
                  'group hover:bg-accent/20 transition-all',
                  restoring[c.id] && 'opacity-0 scale-95'
                )}
              >
                <td className="px-5 py-3">
                  <p className="font-bold text-xs">
                    {c.head} {c.subHead ? `· ${c.subHead}` : ''}
                  </p>
                  <p className="text-[9px] text-muted-foreground uppercase font-black tracking-tighter">
                    {t('trash.deletedOn')} {c.updatedAt.slice(0, 10)}
                  </p>
                </td>
                <td className="px-5 py-3 text-xs text-muted-foreground uppercase font-black tracking-widest">
                  {c.group}
                </td>
                <td className="px-2 py-3">
                  <RestoreAction
                    label={`${c.head}${c.subHead ? ` · ${c.subHead}` : ''}`}
                    isRestoring={Boolean(restoring[c.id])}
                    onClick={() => onRestore(c.id)}
                    compact
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-2 sm:hidden">
        {sorted.map(c => {
          const label = `${c.head}${c.subHead ? ` · ${c.subHead}` : ''}`;
          return (
            <Card
              key={c.id}
              className={cn('border-border shadow-sm', restoring[c.id] && 'opacity-0 scale-95')}
            >
              <CardContent className="space-y-3 p-3">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <p className="min-w-0 break-words text-sm font-bold [overflow-wrap:anywhere]">
                    {label}
                  </p>
                  <span className="shrink-0 rounded-full bg-accent px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground">
                    {c.group}
                  </span>
                </div>
                <p className="border-t border-border/60 pt-2 text-[10px] font-medium text-muted-foreground">
                  {t('trash.deletedOn')} {c.updatedAt.slice(0, 10)}
                </p>
                <RestoreAction
                  label={label}
                  isRestoring={Boolean(restoring[c.id])}
                  onClick={() => onRestore(c.id)}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
