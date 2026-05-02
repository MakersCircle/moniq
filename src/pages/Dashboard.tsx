import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart as PieChartIcon,
  ArrowRight,
} from 'lucide-react';
import { useDataStore } from '../store/dataStore';
import { useAllBalances, useMonthSummary, useCategorySpend } from '../hooks/useComputed';
import { formatCurrency, formatCurrencyShort } from '../utils/format';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import RecentTransactionsTable from '@/components/Dashboard/RecentTransactionsTable';
import type { UserSettings } from '@/types';

export default function Dashboard() {
  const { accounts, transactions, settings } = useDataStore();
  const balances = useAllBalances();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const { income, expenses } = useMonthSummary(year, month);
  const categorySpend = useCategorySpend(year, month);

  // Stats Calculations
  const { netWorth, liquidity, totalSavings } = useMemo(() => {
    const activeAccounts = accounts.filter(s => s.isActive && !s.isDeleted && !s.excludeFromNet);
    const nw = activeAccounts.reduce((sum, s) => sum + (balances[s.id] || 0), 0);
    const liq = activeAccounts
      .filter(s => !s.isSavings && s.type === 'Asset')
      .reduce((sum, s) => sum + (balances[s.id] || 0), 0);
    const sav = activeAccounts
      .filter(s => s.isSavings && s.type === 'Asset')
      .reduce((sum, s) => sum + (balances[s.id] || 0), 0);
    return { netWorth: nw, liquidity: liq, totalSavings: sav };
  }, [accounts, balances]);

  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

  const recentTxns = useMemo(() => {
    return transactions
      .filter(t => !t.isDeleted)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  }, [transactions]);

  const monthLabel = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-12 pb-10 px-1">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/transactions">
            <Button variant="outline" size="sm" className="h-9 gap-2 text-xs">
              View Ledger
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Top Stats Row — 4 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Net Worth"
          value={netWorth}
          settings={settings}
          detail={`Liq: ${formatCurrencyShort(liquidity, settings.currencySymbol)} · Sav: ${formatCurrencyShort(totalSavings, settings.currencySymbol)}`}
          detailColor="text-muted-foreground"
        />
        <StatCard label="Income" value={income} settings={settings} detail="This Month" />
        <StatCard
          label="Expenses"
          value={expenses}
          settings={settings}
          detail="This Month"
          valueColor="text-expense"
        />
        <StatCard
          label="Savings Rate"
          value={savingsRate}
          settings={settings}
          isPercent
          detail={`${formatCurrency(income - expenses, settings)} remaining`}
          detailColor={income - expenses >= 0 ? 'text-income' : 'text-expense'}
        />
      </div>

      {/* Lending & Debt Stats */}
      {(() => {
        const totalReceivable = accounts
          .filter(s => s.description?.toLowerCase() === 'receivable' && s.isActive && !s.isDeleted)
          .reduce((sum, s) => sum + (balances[s.id] || 0), 0);
        const totalPayable = accounts
          .filter(s => s.description?.toLowerCase() === 'payable' && s.isActive && !s.isDeleted)
          .reduce((sum, s) => sum + (balances[s.id] || 0), 0);

        if (totalReceivable === 0 && totalPayable === 0) return null;

        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-accent/10 border border-border rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                  Total Receivable
                </p>
                <p className="text-base font-bold mono text-income">
                  {formatCurrency(totalReceivable, settings)}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-income/10 flex items-center justify-center text-income">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="bg-accent/10 border border-border rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                  Total Payable
                </p>
                <p className="text-base font-bold mono text-expense">
                  {formatCurrency(totalPayable, settings)}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-expense/10 flex items-center justify-center text-expense">
                <TrendingDown className="h-4 w-4" />
              </div>
            </div>
          </div>
        );
      })()}

      {/* Middle Row — 50/50 Split */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
        {/* Left Pane: Accounts */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">
              <Wallet className="h-4 w-4" />
              Accounts
            </h3>
            <Link
              to="/settings/accounts"
              className="text-[10px] font-bold text-primary hover:underline"
            >
              Manage ›
            </Link>
          </div>
          <Card className="border-border">
            <div className="divide-y divide-border">
              {accounts
                .filter(s => s.isActive && !s.isDeleted)
                .slice(0, 5)
                .map(s => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-4 group hover:bg-accent/20 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-semibold">{s.name}</p>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">
                        {s.type}
                      </p>
                    </div>
                    <p
                      className={cn(
                        'font-bold mono',
                        (balances[s.id] || 0) < 0 ? 'text-expense' : 'text-foreground'
                      )}
                    >
                      {formatCurrency(balances[s.id] || 0, settings)}
                    </p>
                  </div>
                ))}
              {accounts.filter(s => s.isActive && !s.isDeleted).length > 5 && (
                <Link
                  to="/settings/accounts"
                  className="block p-3 text-center text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
                >
                  View all accounts
                </Link>
              )}
            </div>
          </Card>
        </section>

        {/* Right Pane: Spending Break down */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">
              <PieChartIcon className="h-4 w-4" />
              Spending This Month
            </h3>
            <Link to="/insights" className="text-[10px] font-bold text-primary hover:underline">
              Analysis ›
            </Link>
          </div>
          <Card className="p-6 border-border h-full min-h-[200px]">
            {categorySpend.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground italic text-sm py-10">
                No data for this month
              </div>
            ) : (
              <div className="space-y-5">
                {categorySpend.slice(0, 5).map(c => {
                  const percent =
                    categorySpend.reduce((s, x) => s + x.amount, 0) > 0
                      ? (c.amount / categorySpend.reduce((s, x) => s + x.amount, 0)) * 100
                      : 0;
                  return (
                    <div key={c.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{c.label}</span>
                        <div className="text-right">
                          <span className="mono font-bold mr-2">
                            {formatCurrencyShort(c.amount, settings.currencySymbol)}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-bold">
                            ({percent.toFixed(0)}%)
                          </span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-accent/30 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/80 transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </section>
      </div>

      {/* Bottom Row — Recent Transactions */}
      <section className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Recent Transactions
          </h3>
          <Link to="/transactions" className="text-[10px] font-bold text-primary hover:underline">
            View Ledger ›
          </Link>
        </div>
        <Card className="border-border overflow-hidden">
          {recentTxns.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground italic">
              No transactions yet.
            </div>
          ) : (
            <RecentTransactionsTable transactions={recentTxns} />
          )}
        </Card>
      </section>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  settings: UserSettings;
  isPercent?: boolean;
  detail?: string;
  detailColor?: string;
  valueColor?: string;
}

function StatCard({
  label,
  value,
  settings,
  isPercent,
  detail,
  detailColor,
  valueColor,
}: StatCardProps) {
  return (
    <Card className="border-border shadow-sm hover:border-primary/30 transition-colors">
      <CardContent className="p-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
          {label}
        </p>
        <p
          className={cn(
            'text-2xl font-bold mono tracking-tight mb-1',
            valueColor || 'text-foreground'
          )}
        >
          {isPercent ? `${value.toFixed(1)}%` : formatCurrency(value, settings)}
        </p>
        {detail && (
          <p className={cn('text-[11px] font-medium', detailColor || 'text-muted-foreground')}>
            {detail}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
