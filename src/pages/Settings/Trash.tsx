import React, { useState, useMemo } from 'react';
import { Info, RotateCcw, Trash2, ArrowRight, SortAsc } from 'lucide-react';
import { useDataStore } from '@/store/dataStore';
import { formatCurrency, formatDate, groupByDate } from '@/utils/format';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';
import SettingsLayout from '@/components/Layout/SettingsLayout';
import type { Transaction } from '@/types';

function InfoTooltip({ text, position = 'top' }: { text: string; position?: 'top' | 'bottom' }) {
  return (
    <div className="group relative inline-flex items-center justify-center">
      <Info className="h-3.5 w-3.5 text-muted-foreground ml-1.5 flex-shrink-0 cursor-help transition-colors hover:text-foreground" />
      <div className={`pointer-events-none absolute left-1/2 z-50 w-48 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100 ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
        <div className="rounded-md bg-popover px-3 py-2 text-[10px] font-medium leading-tight text-popover-foreground shadow-md border border-border">
          {text}
        </div>
      </div>
    </div>
  );
}

type SortOption = 'deleted' | 'created';

export default function Trash() {
  const { transactions, accounts, categories, settings, updateTransaction } = useDataStore();
  const [restoring, setRestoring] = useState<Record<string, boolean>>({});
  const [sortBy, setSortBy] = useState<SortOption>('deleted');

  const sortedTxns = useMemo(() => {
    return transactions
      .filter((t) => t.isDeleted)
      .sort((a, b) => {
        if (sortBy === 'deleted') {
          return b.updatedAt.localeCompare(a.updatedAt);
        }
        return b.date.localeCompare(a.date);
      });
  }, [transactions, sortBy]);

  // We need a custom grouping that uses the relevant date key
  const grouped = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    for (const item of sortedTxns) {
      // Use updatedAt if sorting by deleted, otherwise date
      const dateVal = sortBy === 'deleted' ? item.updatedAt : item.date;
      const key = dateVal.slice(0, 10);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return Object.entries(groups)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, items]) => ({ label: formatDate(date), items }));
  }, [sortedTxns, sortBy]);

  const handleRestore = (id: string) => {
    setRestoring(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      updateTransaction(id, { isDeleted: false });
      setRestoring(prev => { const n = { ...prev }; delete n[id]; return n; });
    }, 150);
  };

  const getAccountName = (txn: Transaction) => {
    const isIncome = txn.uiType === 'income';
    const entry = txn.entries.find(e => accounts.some(a => a.id === e.accountId) && (isIncome ? e.type === 'DEBIT' : e.type === 'CREDIT'));
    return accounts.find(a => a.id === entry?.accountId)?.name || 'Unknown';
  };

  const getCategoryName = (txn: Transaction) => {
    if (txn.uiType === 'transfer') {
      const targetEntry = txn.entries.find(e => e.type === 'DEBIT');
      return accounts.find(a => a.id === targetEntry?.accountId)?.name || 'Transfer';
    }
    const catEntry = txn.entries.find(e => categories.some(c => c.id === e.accountId));
    const c = categories.find(c => c.id === catEntry?.accountId);
    return c ? `${c.head}${c.subHead ? ' · ' + c.subHead : ''}` : '—';
  };

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <div className="sticky top-0 bg-background/95 backdrop-blur-md z-40 pb-4 pt-2 -mx-1 px-1">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-destructive">Recently Deleted</h2>
                <InfoTooltip position="bottom" text="Transactions you delete are sent here. Restoring a transaction will put it back in your ledger and budget. Permanent deletion should be done in the Google Sheet directly." />
              </div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Discarded Transactions ({sortedTxns.length})
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mr-1">Sort by</span>
              <Select value={sortBy} onValueChange={(val) => setSortBy(val as SortOption)}>
                <SelectTrigger className="h-8 w-[160px] text-[10px] font-bold uppercase tracking-widest">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deleted" className="text-[10px] font-bold uppercase tracking-widest">Recently Deleted</SelectItem>
                  <SelectItem value="created" className="text-[10px] font-bold uppercase tracking-widest">Date of Transaction</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl bg-accent/20 border border-border/50 border-dashed opacity-70">
            <Trash2 className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <h3 className="text-sm font-bold text-muted-foreground">Trash is empty</h3>
            <p className="text-[10px] text-muted-foreground mt-1 max-w-[250px] uppercase font-bold tracking-[0.1em]">
              Deleted transactions will neatly stack up here.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-accent/30 text-muted-foreground uppercase text-[10px] font-bold tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="px-5 py-3 border-b border-border">Date</th>
                  <th className="px-5 py-3 border-b border-border">Description</th>
                  <th className="px-5 py-3 border-b border-border">Category / Target</th>
                  <th className="px-5 py-3 border-b border-border">Account</th>
                  <th className="px-5 py-3 border-b border-border text-right">Amount</th>
                  <th className="px-5 py-3 border-b border-border w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {grouped.map((group) => (
                  <React.Fragment key={group.label}>
                    <tr className="bg-accent/10 pointer-events-none">
                      <td colSpan={6} className="px-5 py-1.5 text-[10px] uppercase font-bold text-muted-foreground/70">
                        {sortBy === 'deleted' ? `Deleted on ${group.label}` : group.label}
                      </td>
                    </tr>
                    {group.items.map((txn) => {
                      const deletedDate = new Date(txn.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                      const createdDate = new Date(txn.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

                      return (
                        <tr 
                          key={txn.id} 
                          className={cn(
                            "group transition-all duration-150",
                            restoring[txn.id] ? "opacity-0 scale-95 pointer-events-none" : "hover:bg-accent/20"
                          )}
                        >
                          <td className="px-5 py-3 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="font-bold text-xs">{createdDate}</span>
                              <span className="text-[9px] text-muted-foreground/60 uppercase font-black tracking-tighter">Transaction</span>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex flex-col">
                              <span className="font-medium truncate">{txn.note || 'No description'}</span>
                              <span className="text-[9px] text-muted-foreground/50 font-bold uppercase tracking-wider">
                                Deleted on {deletedDate}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1.5">
                              <div className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                txn.uiType === 'income' ? 'bg-income' : txn.uiType === 'expense' ? 'bg-expense' : 'bg-blue-500'
                              )} />
                              <span className="text-muted-foreground text-xs font-medium">
                                {getCategoryName(txn)}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-muted-foreground text-xs whitespace-nowrap font-medium">
                            {getAccountName(txn)}
                          </td>
                          <td className={cn(
                            "px-5 py-3 font-bold text-right mono whitespace-nowrap",
                            txn.uiType === 'income' ? 'text-income' : 'text-expense'
                          )}>
                            {txn.uiType === 'income' ? '+' : ''}{formatCurrency(txn.amount, settings)}
                          </td>
                          <td className="px-2 py-3">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 text-primary opacity-0 group-hover:opacity-100 transition-opacity p-0"
                              onClick={() => handleRestore(txn.id)}
                              title="Restore"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SettingsLayout>
  );
}
