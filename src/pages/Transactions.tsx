import { useState, useMemo } from 'react';
import { Download, SlidersHorizontal, X, Search, Calendar, Trash2 } from 'lucide-react';
import PageShell from '../components/PageShell';
import TxnRow from '../components/TxnRow';
import { useDataStore } from '../store/dataStore';
import { useFilteredTransactions } from '../hooks/useComputed';
import { groupByDate, exportToCSV, toMonthKey, formatCurrency } from '../utils/format';
import type { TxnFilter } from '../hooks/useComputed';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';

export default function Transactions() {
  const { sources, categories, methods, settings, transactions, deleteTransaction } = useDataStore();
  const [filter, setFilter] = useState<TxnFilter>({
    month: toMonthKey(new Date()),
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);

  const txns = useFilteredTransactions(filter);
  const grouped = useMemo(() => groupByDate(txns), [txns]);
  const selectedTxn = transactions.find((t) => t.id === selectedTxnId);

  const updateFilter = (patch: Partial<TxnFilter>) =>
    setFilter((f) => ({ ...f, ...patch }));

  const clearFilter = (key: keyof TxnFilter) =>
    setFilter((f) => { const next = { ...f }; delete next[key]; return next; });

  const activeFilterCount = Object.keys(filter).filter(
    (k) => filter[k as keyof TxnFilter] && k !== 'month'
  ).length;

  const handleExport = () => {
    exportToCSV(txns, sources, categories, methods, `moniq-${filter.month || 'all'}.csv`);
  };

  return (
    <PageShell
      title="Ledger"
      subtitle={`${txns.length} transactions`}
      headerRight={
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={handleExport} title="Download CSV">
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowFilters(true)}
            className="relative"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Search and Month Row */}
        <div className="flex flex-col sm:flex-row gap-3">
           <div className="relative flex-1">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
             <Input
                placeholder="Search note..."
                className="pl-9"
                value={filter.search || ''}
                onChange={(e) => updateFilter({ search: e.target.value || undefined })}
             />
           </div>
           <div className="flex gap-2 shrink-0">
             <Input
                type="month"
                className="w-auto"
                value={filter.month || ''}
                onChange={(e) => updateFilter({ month: e.target.value || undefined })}
             />
             {filter.month && (
               <Button variant="secondary" size="sm" onClick={() => clearFilter('month')}>
                 All time
               </Button>
             )}
           </div>
        </div>

        {/* Filter Chips */}
        {(filter.type || filter.sourceId || filter.categoryId || filter.search) && (
          <div className="flex flex-wrap gap-2">
            {filter.type && (
              <div className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                filter.type === 'income' ? "bg-income/10 text-income" : "bg-expense/10 text-expense"
              )}>
                <span className="capitalize">{filter.type}</span>
                <button onClick={() => clearFilter('type')} className="hover:opacity-70"><X className="h-3 w-3" /></button>
              </div>
            )}
            {filter.sourceId && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
                <span>{sources.find((s) => s.id === filter.sourceId)?.name}</span>
                <button onClick={() => clearFilter('sourceId')} className="hover:opacity-70"><X className="h-3 w-3" /></button>
              </div>
            )}
            {filter.categoryId && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
                <span>{categories.find((c) => c.id === filter.categoryId)?.head}</span>
                <button onClick={() => clearFilter('categoryId')} className="hover:opacity-70"><X className="h-3 w-3" /></button>
              </div>
            )}
            {filter.search && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground italic">
                <span>"{filter.search}"</span>
                <button onClick={() => clearFilter('search')} className="hover:opacity-70"><X className="h-3 w-3" /></button>
              </div>
            )}
          </div>
        )}

        {/* Transaction Ledger */}
        {grouped.length === 0 ? (
          <Card className="py-12 text-center border-dashed bg-muted/20">
            <p className="text-muted-foreground mb-1 font-medium">No transactions found</p>
            <p className="text-xs text-muted-foreground">Try adjusting your filters or time range</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {grouped.map((g) => (
              <div key={g.label} className="space-y-2">
                <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground px-1">{g.label}</p>
                <Card className="divide-y divide-muted/30 overflow-hidden">
                  {g.items.map((t) => (
                    <TxnRow key={t.id} txn={t} onClick={() => setSelectedTxnId(t.id)} />
                  ))}
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter Modal */}
      <Dialog open={showFilters} onOpenChange={setShowFilters}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filter Ledger</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label>Transaction Type</Label>
              <div className="flex flex-wrap gap-2">
                {['income', 'expense', 'transfer'].map((t) => (
                  <Button
                    key={t}
                    variant={filter.type === t ? "default" : "outline"}
                    size="sm"
                    className="capitalize h-9 px-4"
                    onClick={() => updateFilter({ type: filter.type === t ? undefined : t as any })}
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-source">Account</Label>
              <Select 
                value={filter.sourceId || "all"} 
                onValueChange={(val) => updateFilter({ sourceId: val === "all" ? undefined : val })}
              >
                <SelectTrigger id="filter-source">
                  <SelectValue placeholder="All accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All accounts</SelectItem>
                  {sources.filter((s) => s.isActive).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-category">Category</Label>
              <Select 
                value={filter.categoryId || "all"} 
                onValueChange={(val) => updateFilter({ categoryId: val === "all" ? undefined : val })}
              >
                <SelectTrigger id="filter-category">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.filter((c) => c.isActive).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.head}{c.subHead ? ` · ${c.subHead}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="ghost" className="sm:mr-auto" onClick={() => { setFilter({ month: toMonthKey(new Date()) }); setShowFilters(false); }}>
              Reset All
            </Button>
            <Button onClick={() => setShowFilters(false)}>Show Results</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Details */}
      <Dialog open={!!selectedTxnId} onOpenChange={(o) => !o && setSelectedTxnId(null)}>
        {selectedTxn && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transaction Details</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center py-6 border-b border-muted/30">
               <p className={cn(
                 "text-4xl font-extrabold tracking-tight mono",
                 selectedTxn.type === 'income' ? "text-income" : selectedTxn.type === 'expense' ? "text-expense" : ""
               )}>
                 {selectedTxn.type === 'income' ? '+' : selectedTxn.type === 'expense' ? '−' : ''}
                 {formatCurrency(selectedTxn.amount, settings)}
               </p>
               <div className="mt-2 flex items-center gap-2">
                  <div className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                    selectedTxn.type === 'income' ? "bg-income/10 text-income" : "bg-expense/10 text-expense"
                  )}>
                    {selectedTxn.type}
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">
                    {new Date(selectedTxn.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
               </div>
            </div>
            <div className="space-y-4 py-4">
              <DetailRow 
                label="Account" 
                value={sources.find((s) => s.id === selectedTxn.sourceId)?.name || '—'} 
              />
              {selectedTxn.toSourceId && (
                <DetailRow 
                  label="To Account" 
                  value={sources.find((s) => s.id === selectedTxn.toSourceId)?.name || '—'} 
                />
              )}
              {selectedTxn.categoryId && (
                <DetailRow
                  label="Category"
                  value={(() => {
                    const c = categories.find((c) => c.id === selectedTxn.categoryId);
                    return c ? `${c.head}${c.subHead ? ' · ' + c.subHead : ''}` : '—';
                  })()}
                />
              )}
              {selectedTxn.note && <DetailRow label="Note" value={selectedTxn.note} />}
            </div>
            <DialogFooter>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => { deleteTransaction(selectedTxn.id); setSelectedTxnId(null); }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete Transaction
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </PageShell>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold max-w-[60%] text-right">{value}</span>
    </div>
  );
}

