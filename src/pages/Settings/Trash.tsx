import React, { useState, useMemo } from 'react';
import { Info, RotateCcw, Trash2, Landmark, CreditCard, ReceiptText, Tag } from 'lucide-react';
import { useDataStore } from '@/store/dataStore';
import { formatCurrency } from '@/utils/format';
import { Button } from '@/components/ui/button';
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
        const isIncome = txn.uiType === 'income';
        const entry = txn.entries.find(
          e =>
            accounts.some(a => a.id === e.accountId) &&
            (isIncome ? e.type === 'DEBIT' : e.type === 'CREDIT')
        );
        const account = accounts.find(a => a.id === entry?.accountId);

        if (account?.isDeleted) {
          setError(
            `Cannot restore this transaction because account "${account.name}" is deleted. Restore the account first.`
          );
          return;
        }

        // Check category for non-transfer txns
        if (txn.uiType !== 'transfer') {
          const catEntry = txn.entries.find(e => categories.some(c => c.id === e.accountId));
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
          <div className="flex items-center justify-between mb-4">
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
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mr-1">
                {t('trash.sortBy')}
              </span>
              <Select value={sortBy} onValueChange={val => setSortBy(val as SortOption)}>
                <SelectTrigger className="h-8 w-[160px] text-[10px] font-bold uppercase tracking-widest">
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
            <TabsList className="bg-accent/30 p-1 h-10 w-full justify-start gap-2 border border-border/50 rounded-xl">
              <TabsTrigger
                value="transactions"
                className="rounded-lg px-4 h-8 gap-2 text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <ReceiptText className="h-3.5 w-3.5" />
                {t('common.transactions')} ({deletedTxns.length})
              </TabsTrigger>
              <TabsTrigger
                value="accounts"
                className="rounded-lg px-4 h-8 gap-2 text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Landmark className="h-3.5 w-3.5" />
                {t('common.accounts')} ({deletedAccounts.length})
              </TabsTrigger>
              <TabsTrigger
                value="methods"
                className="rounded-lg px-4 h-8 gap-2 text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <CreditCard className="h-3.5 w-3.5" />
                {t('trash.payMethods')} ({deletedMethods.length})
              </TabsTrigger>
              <TabsTrigger
                value="categories"
                className="rounded-lg px-4 h-8 gap-2 text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Tag className="h-3.5 w-3.5" />
                {t('common.categories')} ({deletedCategories.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {error && (
          <div className="mx-1 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
            <Info className="h-4 w-4" />
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
    <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
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
                <p className="font-bold text-xs">{txn.note || t('common.noDescriptionProvided')}</p>
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 text-primary opacity-0 group-hover:opacity-100 p-0"
                  onClick={() => onRestore(txn.id)}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
    <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 text-primary opacity-0 group-hover:opacity-100 p-0"
                  onClick={() => onRestore(a.id)}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
    <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 text-primary opacity-0 group-hover:opacity-100 p-0"
                  onClick={() => onRestore(m.id)}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
    <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 text-primary opacity-0 group-hover:opacity-100 p-0"
                  onClick={() => onRestore(c.id)}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
