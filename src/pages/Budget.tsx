import { useState } from 'react';
import { ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import { useDataStore } from '../store/dataStore';
import { useBudgetSummary } from '../hooks/useComputed';
import { formatCurrency, formatCurrencyShort, toMonthKey } from '../utils/format';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function Budget() {
  const { settings, updateBudget } = useDataStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const monthKey = toMonthKey(currentDate);

  const { income, totalAllocated, remainingToAllocate, categoryGroups } = useBudgetSummary(
    currentDate.getFullYear(), 
    currentDate.getMonth() + 1
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const changeMonth = (delta: number) => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + delta);
    setCurrentDate(next);
  };

  const handleStartEdit = (catId: string, current: number) => {
    setEditingId(catId);
    setEditValue(current ? current.toString() : "");
  };

  const handleSaveEdit = (catId: string) => {
    const val = parseFloat(editValue) || 0;
    updateBudget(catId, monthKey, val);
    setEditingId(null);
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Budget</h1>
          <p className="text-sm text-muted-foreground">Allocate your monthly income to categories</p>
        </div>
        <div className="flex items-center gap-4 bg-accent/20 p-1 rounded-xl border border-border">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => changeMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-bold min-w-[120px] text-center">
            {currentDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => changeMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Monthly Income" value={income} settings={settings} />
        <StatCard label="Total Allocated" value={totalAllocated} settings={settings} />
        <StatCard 
          label="Remaining to Allocate" 
          value={remainingToAllocate} 
          settings={settings} 
          valueColor={remainingToAllocate === 0 ? "text-income" : remainingToAllocate < 0 ? "text-expense" : "text-primary"}
          detail={remainingToAllocate === 0 ? "Perfectly balanced!" : remainingToAllocate < 0 ? "Over-allocated" : "Assign these funds"}
        />
      </div>

      {/* Budget Grid */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="grid grid-cols-12 bg-accent/30 px-6 py-3 border-b border-border text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <div className="col-span-5">Category</div>
          <div className="col-span-2 text-right">Budgeted</div>
          <div className="col-span-2 text-right">Spent</div>
          <div className="col-span-3 text-right">Remaining</div>
        </div>

        <div className="divide-y divide-border">
          {categoryGroups.map((group) => (
            <div key={group.name} className="divide-y divide-border/50">
              <div className="px-6 py-2 bg-accent/5">
                <span className="text-[10px] font-black uppercase text-muted-foreground/60">{group.name}</span>
              </div>
              {group.categories.map((cat) => (
                <div key={cat.id} className="grid grid-cols-12 px-6 py-4 items-center group hover:bg-accent/10 transition-colors">
                  <div className="col-span-5 space-y-1.5 pr-8">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-foreground">{cat.head} {cat.subHead ? `· ${cat.subHead}` : ''}</span>
                      <span className="text-[10px] text-muted-foreground font-bold">{cat.percent.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-accent/30 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all duration-500",
                          cat.percent > 100 ? "bg-expense" : "bg-primary/70"
                        )} 
                        style={{ width: `${Math.min(cat.percent, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="col-span-2 text-right pr-4">
                    {editingId === cat.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <input
                          autoFocus
                          className="w-20 bg-background border border-primary h-7 px-2 text-xs font-bold mono text-right outline-none rounded"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(cat.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                        />
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleStartEdit(cat.id, cat.budgeted)}
                        className="w-full text-right font-bold mono group-hover:bg-accent/30 rounded px-1 -mr-1 transition-colors py-1"
                      >
                        {formatCurrencyShort(cat.budgeted, settings.currencySymbol)}
                      </button>
                    )}
                  </div>

                  <div className="col-span-2 text-right text-muted-foreground text-xs mono pr-4">
                    {formatCurrencyShort(cat.spent, settings.currencySymbol)}
                  </div>

                  <div className="col-span-3 text-right">
                    <span className={cn(
                      "text-xs font-bold mono px-2 py-0.5 rounded",
                      cat.remaining >= 0 ? "text-income bg-income/5" : "text-expense bg-expense/5"
                    )}>
                      {cat.remaining < 0 ? '−' : ''}{formatCurrencyShort(Math.abs(cat.remaining), settings.currencySymbol)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, settings, valueColor, detail }: any) {
  return (
    <Card className="border-border">
      <CardContent className="p-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">{label}</p>
        <p className={cn("text-2xl font-bold mono tracking-tight mb-1", valueColor || "text-foreground")}>
          {formatCurrency(value, settings)}
        </p>
        {detail && <p className="text-[10px] text-muted-foreground font-medium">{detail}</p>}
      </CardContent>
    </Card>
  );
}
