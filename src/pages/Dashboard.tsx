import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import PageShell from '../components/PageShell';
import TxnRow from '../components/TxnRow';
import { useDataStore } from '../store/dataStore';
import { useAllBalances, useMonthSummary, useCategorySpend } from '../hooks/useComputed';
import { formatCurrency, formatCurrencyShort } from '../utils/format';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const CATEGORY_COLORS = ['#863bff', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#ec4899', '#6366f1'];

export default function Dashboard() {
  const { sources, transactions, settings } = useDataStore();
  const balances = useAllBalances();

  const now = new Date();
  const { income, expenses, net } = useMonthSummary(now.getFullYear(), now.getMonth() + 1);
  const categorySpend = useCategorySpend(now.getFullYear(), now.getMonth() + 1);

  const netWorth = useMemo(() => {
    return sources
      .filter((s) => s.isActive && !s.excludeFromNet)
      .reduce((sum, s) => sum + (balances[s.id] || 0), 0);
  }, [sources, balances]);

  const recentTxns = useMemo(() => {
    return transactions
      .filter((t) => !t.isDeleted)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  }, [transactions]);

  const monthLabel = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <PageShell noPad>
      <div className="flex flex-col gap-8 pb-10">
        {/* Hero Section — Net Worth */}
        <section className="relative px-5 pt-8 pb-12 overflow-hidden">
          {/* Subtle background decoration */}
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-64 h-64 bg-primary/10 blur-3xl rounded-full" />
          <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-64 h-64 bg-accent/10 blur-3xl rounded-full" />
          
          <div className="relative z-10 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Total Net Worth</p>
            <h1 className={cn(
              "text-5xl font-extrabold tracking-tighter mb-2 mono",
              netWorth < 0 ? 'text-expense' : 'text-foreground'
            )}>
              {netWorth < 0 ? '−' : ''}{formatCurrency(Math.abs(netWorth), settings)}
            </h1>
            <p className="text-sm font-medium text-muted-foreground">{monthLabel}</p>
          </div>
        </section>

        <div className="px-5 space-y-8">
          {/* Month Summary Cards */}
          <section className="grid grid-cols-2 gap-4">
            <Card className="border-none bg-income/5 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 flex items-center justify-center rounded-full bg-income/10 text-income">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Income</p>
                  <p className="text-lg font-bold mono leading-tight">{formatCurrency(income, settings)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none bg-expense/5 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 flex items-center justify-center rounded-full bg-expense/10 text-expense">
                  <TrendingDown className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Expenses</p>
                  <p className="text-lg font-bold mono leading-tight">{formatCurrency(expenses, settings)}</p>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Accounts Breakdown */}
          <section className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground px-1">Accounts</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {sources.filter((s) => s.isActive).map((s) => {
                const bal = balances[s.id] || 0;
                return (
                  <Card key={s.id} className="p-3 border-muted/50 transition-colors hover:border-primary/50 cursor-pointer">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">{s.type}</p>
                    <p className="text-sm font-semibold truncate mb-1">{s.name}</p>
                    <p className={cn(
                      "text-sm font-bold mono",
                      bal < 0 ? 'text-expense' : 'text-foreground'
                    )}>
                      {bal < 0 ? '−' : ''}{formatCurrencyShort(Math.abs(bal), settings.currencySymbol)}
                    </p>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Spend Analysis */}
          {categorySpend.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground px-1">Where it went</h2>
              <Card className="overflow-hidden">
                <div className="flex flex-col sm:flex-row items-center p-6 gap-6">
                  <div className="w-full sm:w-1/2 h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categorySpend}
                          dataKey="amount"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={3}
                          stroke="transparent"
                        >
                          {categorySpend.map((_, i) => (
                            <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            borderColor: 'hsl(var(--border))',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full sm:w-1/2 space-y-2">
                    {categorySpend.slice(0, 5).map((c, i) => (
                      <div key={c.label} className="flex items-center justify-between text-sm py-1 border-b border-muted/30 last:border-0">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                          <span className="font-medium">{c.label}</span>
                        </div>
                        <span className="mono font-semibold">{formatCurrencyShort(c.amount, settings.currencySymbol)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </section>
          )}

          {/* Recent Transactions */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Recent Activity</h2>
              <Button variant="ghost" size="sm" asChild className="text-xs h-8">
                <Link to="/transactions">
                  View All <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
            {recentTxns.length === 0 ? (
              <Card className="p-8 text-center bg-muted/20 border-dashed">
                <p className="text-muted-foreground mb-4">No transactions recorded this month.</p>
                <Button asChild>
                  <Link to="/add">Add Your First Transaction</Link>
                </Button>
              </Card>
            ) : (
              <Card className="divide-y divide-muted/30 overflow-hidden">
                {recentTxns.map((t) => (
                  <TxnRow key={t.id} txn={t} />
                ))}
              </Card>
            )}
          </section>
        </div>
      </div>
    </PageShell>
  );
}

