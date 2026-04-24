import React, { useState, useMemo } from 'react';
import { 
  Download, 
  Search, 
  ChevronRight, 
  MoreVertical, 
  Pencil, 
  Copy, 
  Trash2 
} from 'lucide-react';
import { useDataStore } from '../store/dataStore';
import { useFilteredTransactions } from '../hooks/useComputed';
import { groupByDate, exportToCSV, toMonthKey, formatCurrency } from '../utils/format';
import type { TxnFilter } from '../hooks/useComputed';
import type { Transaction } from '../types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import TransactionDetailPanel from '@/components/Transactions/TransactionDetailPanel';

export default function Transactions() {
  const { accounts, categories, methods, settings, transactions, deleteTransaction } = useDataStore();
  
  const [filter, setFilter] = useState<TxnFilter>({
    month: toMonthKey(new Date()),
  });
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);

  const txns = useFilteredTransactions(filter);
  const grouped = useMemo(() => groupByDate(txns), [txns]);
  const selectedTxn = transactions.find((t) => t.id === selectedTxnId) || null;

  const updateFilter = (patch: Partial<TxnFilter>) =>
    setFilter((f) => ({ ...f, ...patch }));

  const handleExport = () => {
    exportToCSV(txns, accounts, categories, methods, `moniq-${filter.month || 'all'}.csv`);
  };

  const currentNet = txns.reduce((sum, t) => {
    if (t.uiType === 'income') return sum + t.amount;
    if (t.uiType === 'expense') return sum - t.amount;
    return sum;
  }, 0);

  const handleEdit = (t: Transaction) => {
    (window as any).openTransactionModal.openEdit(t);
  };

  const handleDuplicate = (t: Transaction) => {
    (window as any).openTransactionModal.openDuplicate(t);
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
    <div className="flex h-full relative overflow-hidden -m-8">
      {/* Main Table Area */}
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300",
        selectedTxnId ? "pr-[400px]" : ""
      )}>
        {/* Sticky Header with Filters */}
        <div className="sticky top-0 bg-background/80 backdrop-blur-md z-20 border-b border-border p-8 pb-4 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Ledger</h1>
              <p className="text-sm text-muted-foreground">
                {txns.length} transactions · Net: 
                <span className={cn("ml-1 font-bold mono", currentNet >= 0 ? "text-income" : "text-expense")}>
                   {currentNet >= 0 ? '+' : ''}{formatCurrency(currentNet, settings)}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExport} className="h-9 gap-2">
                <Download className="h-4 w-4" />
                Export CSV
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
                onChange={(e) => updateFilter({ search: e.target.value || undefined })}
              />
            </div>

            <Select value={filter.month || 'all'} onValueChange={(val) => updateFilter({ month: val === 'all' ? undefined : val })}>
              <SelectTrigger className="h-9 w-[160px] text-xs">
                <SelectValue placeholder="All time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
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

            <Select value={filter.uiType || 'all'} onValueChange={(val) => updateFilter({ uiType: val === 'all' ? undefined : val as any })}>
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

            <Select value={filter.accountId || 'all'} onValueChange={(val) => updateFilter({ accountId: val === 'all' ? undefined : val })}>
              <SelectTrigger className="h-9 w-[150px] text-xs">
                <SelectValue placeholder="All Accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts.filter(a => !a.isDeleted).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results Table */}
        <div className="flex-1 overflow-auto p-8 pt-4">
          {grouped.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-border rounded-2xl bg-accent/5">
              <p className="text-muted-foreground font-medium">No transactions found matching your filters.</p>
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
                      {/* Day Divider Row */}
                      <tr className="bg-accent/10 pointer-events-none">
                        <td colSpan={6} className="px-5 py-1.5 text-[10px] uppercase font-bold text-muted-foreground/70">
                          {group.label}
                        </td>
                      </tr>
                      {group.items.map((txn) => (
                        <tr 
                          key={txn.id} 
                          onClick={() => setSelectedTxnId(txn.id === selectedTxnId ? null : txn.id)}
                          className={cn(
                            "group cursor-pointer transition-colors",
                            selectedTxnId === txn.id ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-accent/20"
                          )}
                        >
                          <td className="px-5 py-3 whitespace-nowrap text-muted-foreground text-xs">
                            {new Date(txn.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-between">
                              <span className="font-medium truncate">{txn.note || 'No description'}</span>
                              {selectedTxnId === txn.id && <ChevronRight className="h-3.5 w-3.5 text-primary" />}
                            </div>
                          </td>
                          <td className="px-5 py-3">
                             <div className="flex items-center gap-1.5">
                               <div className={cn(
                                 "h-1.5 w-1.5 rounded-full",
                                 txn.uiType === 'income' ? 'bg-income' : txn.uiType === 'expense' ? 'bg-expense' : 'bg-blue-500'
                               )} />
                               <span className="text-muted-foreground text-xs">
                                 {getCategoryName(txn)}
                               </span>
                             </div>
                          </td>
                          <td className="px-5 py-3 text-muted-foreground text-xs whitespace-nowrap">
                            {getAccountName(txn)}
                          </td>
                          <td className={cn(
                            "px-5 py-3 font-bold text-right mono whitespace-nowrap",
                            txn.uiType === 'income' ? 'text-income' : 'text-expense'
                          )}>
                            {txn.uiType === 'income' ? '+' : ''}{formatCurrency(txn.amount, settings)}
                          </td>
                          <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem onClick={() => handleEdit(txn)} className="gap-2">
                                  <Pencil className="h-3.5 w-3.5" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicate(txn)} className="gap-2">
                                  <Copy className="h-3.5 w-3.5" /> Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => deleteTransaction(txn.id)} 
                                  className="gap-2 text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Slide-in Detail Panel */}
      <TransactionDetailPanel 
        transaction={selectedTxn}
        onClose={() => setSelectedTxnId(null)}
        onDelete={(id) => { deleteTransaction(id); setSelectedTxnId(null); }}
        onEdit={handleEdit}
      />
    </div>
  );
}
