import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart as PieChartIcon,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useDashboardData } from '../hooks/useDashboardData';
import { formatCurrency, formatCurrencyShort } from '../utils/format';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import RecentTransactionsTable from '@/components/Dashboard/RecentTransactionsTable';
import type { UserSettings } from '@/types';
import { useTranslation } from '../hooks/useTranslation';

export default function Dashboard() {
  const { t } = useTranslation();
  const {
    accounts,
    settings,
    balances,
    monthLabel,
    income,
    expenses,
    categorySpend,
    fySummary,
    netWorth,
    liquidity,
    totalSavings,
    savingsRate,
    recentTxns,
    topAccounts,
    totalReceivable,
    totalPayable,
    isEmpty,
  } = useDashboardData();

  const [debtsExpanded, setDebtsExpanded] = useState(false);

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50dvh] lg:h-[70vh] py-12 text-center px-4">
        <div className="h-16 w-16 lg:h-24 lg:w-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <PieChartIcon className="h-8 w-8 lg:h-12 lg:w-12 text-primary opacity-80" />
        </div>
        <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-3">
          {t('dashboard.welcomeTitle')}
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-8 text-sm lg:text-base">
          {t('dashboard.welcomeDesc1')}
          <span className="hidden lg:inline">
            {t('dashboard.welcomeDesc2')}
            <kbd className="px-2 py-1 bg-accent rounded text-xs font-mono">Alt+N</kbd>
            {t('dashboard.welcomeDesc3')}
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-12 pb-10 px-1">
      {/* Page Header */}
      <div className="flex flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('dashboard.title')}</h1>
          <p className="text-sm text-muted-foreground">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/transactions">
            <Button variant="outline" size="sm" className="h-9 gap-2 text-xs">
              {t('dashboard.viewLedger')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Top Stats Row — 4 Cards */}
      <div className="grid grid-cols-1 min-[340px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label={t('dashboard.totalNetWorth')}
          value={netWorth}
          settings={settings}
          detail={
            <div className="flex flex-col">
              <span>
                {t('dashboard.spendableCash')}:{' '}
                {formatCurrencyShort(liquidity, settings.currencySymbol)}
              </span>
              <span>
                {t('dashboard.savings')}:{' '}
                {formatCurrencyShort(totalSavings, settings.currencySymbol)}
              </span>
            </div>
          }
          detailColor="text-muted-foreground"
        />
        <StatCard
          label={t('common.income')}
          value={income}
          settings={settings}
          detail={
            <div className="flex flex-col">
              <span>{t('dashboard.thisMonth')}</span>
              <span>
                {t('dashboard.thisFy')}:{' '}
                {formatCurrencyShort(fySummary.income, settings.currencySymbol)}
              </span>
            </div>
          }
        />
        <StatCard
          label={t('common.expenses')}
          value={expenses}
          settings={settings}
          detail={
            <div className="flex flex-col">
              <span>{t('dashboard.thisMonth')}</span>
              <span>
                {t('dashboard.thisFy')}:{' '}
                {formatCurrencyShort(fySummary.expenses, settings.currencySymbol)}
              </span>
            </div>
          }
          valueColor="text-expense"
        />
        <StatCard
          label={t('dashboard.savingsRate')}
          value={savingsRate}
          settings={settings}
          isPercent
          detail={`${formatCurrency(income - expenses, settings)} ${t('dashboard.remaining')}`}
          detailColor={income - expenses >= 0 ? 'text-income' : 'text-expense'}
        />
      </div>

      {/* Additional Stats Collapse */}
      {(totalReceivable > 0 || totalPayable > 0) && (
        <div className="space-y-4 pt-2">
          <div
            className="flex items-center gap-2 cursor-pointer group w-max"
            onClick={() => setDebtsExpanded(!debtsExpanded)}
          >
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">
              {t('dashboard.additionalSummaries')}
            </h3>
            <div className="h-5 w-5 flex items-center justify-center rounded-full bg-accent/50 group-hover:bg-primary/20 text-muted-foreground group-hover:text-primary transition-colors">
              {debtsExpanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </div>
          </div>

          {debtsExpanded && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
              <div className="bg-accent/10 border border-border rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                    {t('dashboard.totalReceivable')}
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
                    {t('dashboard.totalPayable')}
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
          )}
        </div>
      )}

      {/* Middle Row — 50/50 Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-12 items-start">
        {/* Left Pane: Accounts */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground truncate">
              <Wallet className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{t('common.accounts')}</span>
            </h3>
            <Link
              to="/settings/accounts"
              className="text-[10px] font-bold text-primary hover:underline whitespace-nowrap flex-shrink-0"
            >
              {t('dashboard.manage')}
            </Link>
          </div>
          <Card className="border-border">
            <div className="divide-y divide-border">
              {topAccounts.map(s => (
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
                  {t('dashboard.viewAllAccounts')}
                </Link>
              )}
            </div>
          </Card>
        </section>

        {/* Right Pane: Spending Break down */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground truncate">
              <PieChartIcon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{t('dashboard.spendingThisMonth')}</span>
            </h3>
            <Link
              to="/insights"
              className="text-[10px] font-bold text-primary hover:underline whitespace-nowrap flex-shrink-0"
            >
              {t('dashboard.analysis')}
            </Link>
          </div>
          <Card className="p-6 border-border">
            {categorySpend.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-muted-foreground italic text-sm py-10">
                {t('dashboard.noDataThisMonth')}
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
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground truncate">
            {t('dashboard.recentTransactions')}
          </h3>
          <Link
            to="/transactions"
            className="text-[10px] font-bold text-primary hover:underline whitespace-nowrap flex-shrink-0"
          >
            {t('dashboard.viewLedgerArrow')}
          </Link>
        </div>
        <Card className="border-border overflow-hidden">
          {recentTxns.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground italic">
              {t('dashboard.noTransactions')}
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
  detail?: React.ReactNode;
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
      <CardContent className="p-4 sm:p-6 overflow-hidden">
        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 sm:mb-3 truncate">
          {label}
        </p>
        <p
          className={cn(
            'text-lg sm:text-2xl font-bold mono tracking-tight mb-1',
            valueColor || 'text-foreground'
          )}
        >
          {isPercent ? `${value.toFixed(1)}%` : formatCurrency(value, settings)}
        </p>
        {detail && (
          <div
            className={cn(
              'text-[9px] sm:text-[11px] font-medium mt-0.5',
              detailColor || 'text-muted-foreground'
            )}
          >
            {detail}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
