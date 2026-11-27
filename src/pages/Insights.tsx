import { useMemo, useState } from 'react';
import {
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useDataStore } from '../store/dataStore';
import { formatCurrencyShort } from '../utils/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import IncomeExpenseSankey from '@/components/Insights/IncomeExpenseSankey';
import DailyCashflowHeatmap from '@/components/Insights/DailyCashflowHeatmap';
import CategorySpendingChart from '@/components/Insights/CategorySpendingChart';
import { ContributionsCard, SpendingPaceCard } from '@/components/Insights/InsightTrendWidgets';

import { CalendarRange, ChevronDown, LineChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/Transactions/DatePicker';
import { Field, FieldLabel } from '@/components/ui/field';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTranslation } from '@/hooks/useTranslation';
import { buildInsightsPeriodData, type InsightsDateRange } from '@/lib/insightsData';
import { normalizeDateRange } from '@/lib/dateRange';
import type { Transaction } from '@/types';

type DatePreset = 'current' | 'previous' | 'all' | 'custom';

function toISODate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function monthRange(offset = 0): InsightsDateRange {
  const today = new Date();
  const month = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  return { startDate: toISODate(month), endDate: toISODate(lastDay) };
}

function allTimeRange(transactions: Transaction[]) {
  const dates = transactions
    .filter(
      transaction =>
        !transaction.isDeleted &&
        (transaction.uiType === 'income' || transaction.uiType === 'expense')
    )
    .map(transaction => transaction.date)
    .sort();
  return dates.length ? { startDate: dates[0], endDate: dates[dates.length - 1] } : null;
}

function rangeLabel(
  preset: DatePreset,
  range: InsightsDateRange | null,
  t: (key: string) => string
) {
  if (preset === 'all') return t('ledger.allTime');
  if (preset === 'current' || preset === 'previous') {
    const offset = preset === 'current' ? 0 : -1;
    return new Date(new Date().getFullYear(), new Date().getMonth() + offset, 1).toLocaleDateString(
      'en-IN',
      { month: 'long', year: 'numeric' }
    );
  }
  if (!range?.startDate || !range.endDate || range.startDate > range.endDate) {
    return t('ledger.customRange');
  }
  const formatDate = (value: string) =>
    new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  return `${formatDate(range.startDate)} – ${formatDate(range.endDate)}`;
}

export default function Insights() {
  const { settings, transactions, accounts, categories } = useDataStore();
  const { t } = useTranslation();
  const [datePreset, setDatePreset] = useState<DatePreset>('current');
  const [dateRange, setDateRange] = useState<InsightsDateRange>(() => monthRange());
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  const [customRangeNeedsBothDates, setCustomRangeNeedsBothDates] = useState(false);
  const allRange = useMemo(() => allTimeRange(transactions), [transactions]);
  const effectiveRange = normalizeDateRange(datePreset === 'all' ? allRange : dateRange);
  const validRange = effectiveRange;
  const insightsData = useMemo(
    () => buildInsightsPeriodData(transactions, categories, validRange),
    [transactions, categories, validRange]
  );
  const { categorySpend, historicalData } = insightsData;
  const selectedRangeLabel = rangeLabel(datePreset, effectiveRange, t);
  const customRangeStart =
    normalizeDateRange(dateRange)?.startDate || dateRange.startDate || dateRange.endDate;
  const customRangeEnd = normalizeDateRange(dateRange)?.endDate;
  const historicalChartMinWidth =
    historicalData.length > 6 ? `${historicalData.length * 72}px` : undefined;

  const chooseDatePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset === 'custom') {
      if (datePreset !== 'custom') {
        setDateRange({ startDate: '', endDate: '' });
        setCustomRangeNeedsBothDates(true);
      }
      return;
    }

    setCustomRangeNeedsBothDates(false);
    if (preset === 'current') setDateRange(monthRange());
    if (preset === 'previous') setDateRange(monthRange(-1));
    setIsDateRangeOpen(false);
  };

  const updateCustomRange = (patch: Partial<InsightsDateRange>) => {
    setDatePreset('custom');
    const nextRange = { ...dateRange, ...patch };
    setDateRange(nextRange);
    if (customRangeNeedsBothDates && normalizeDateRange(nextRange)) {
      setCustomRangeNeedsBothDates(false);
      setIsDateRangeOpen(false);
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[var(--app-viewport-half-height)] lg:h-[var(--app-viewport-height-70)] py-12 text-center px-4">
        <div className="h-16 w-16 lg:h-24 lg:w-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <LineChart className="h-8 w-8 lg:h-12 lg:w-12 text-primary opacity-80" />
        </div>
        <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-3">Nothing here yet</h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-8 text-sm lg:text-base">
          Log some transactions to see your financial trends and insights.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex min-w-0 flex-row items-center justify-between gap-3">
        <h1 className="min-w-0 truncate text-2xl font-bold tracking-tight">Insights</h1>
        <Popover open={isDateRangeOpen} onOpenChange={setIsDateRangeOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={t('ledger.dateRange')}
              className="max-w-[58%] shrink-0 justify-between gap-2 px-2.5 sm:max-w-none sm:px-3"
            >
              <CalendarRange className="h-4 w-4 shrink-0" />
              <span className="truncate">{selectedRangeLabel}</span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[min(22rem,calc(100vw-1rem))] p-4">
            <fieldset className="space-y-2">
              <legend className="px-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {t('ledger.dateRange')}
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ['current', t('ledger.currentMonth')],
                    ['previous', t('ledger.previousMonth')],
                    ['all', t('ledger.allTime')],
                    ['custom', t('ledger.customRange')],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 text-sm text-foreground hover:bg-accent"
                  >
                    <input
                      type="radio"
                      name="insights-date-range"
                      value={value}
                      checked={datePreset === value}
                      onChange={() => chooseDatePreset(value)}
                      className="size-4 shrink-0 accent-primary"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              {datePreset === 'custom' && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Field>
                    <FieldLabel htmlFor="insights-start-date">{t('ledger.fromDate')}</FieldLabel>
                    <DatePicker
                      id="insights-start-date"
                      date={dateRange.startDate}
                      onChange={startDate => updateCustomRange({ startDate })}
                      fixedWeeks
                      rangeAnchor={dateRange.endDate}
                      rangeStart={customRangeStart}
                      rangeEnd={customRangeEnd}
                      rangeSelectionRole="from"
                      onCompleteRange={(firstDate, secondDate) =>
                        updateCustomRange({ startDate: firstDate, endDate: secondDate })
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="insights-end-date">{t('ledger.toDate')}</FieldLabel>
                    <DatePicker
                      id="insights-end-date"
                      date={dateRange.endDate}
                      onChange={endDate => updateCustomRange({ endDate })}
                      fixedWeeks
                      rangeAnchor={dateRange.startDate}
                      rangeStart={customRangeStart}
                      rangeEnd={customRangeEnd}
                      rangeSelectionRole="to"
                      onCompleteRange={(firstDate, secondDate) =>
                        updateCustomRange({ endDate: firstDate, startDate: secondDate })
                      }
                    />
                  </Field>
                </div>
              )}
            </fieldset>
          </PopoverContent>
        </Popover>
      </div>

      <IncomeExpenseSankey
        transactions={transactions}
        categories={categories}
        currencySymbol={settings.currencySymbol}
        range={validRange}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SpendingPaceCard transactions={transactions} currencySymbol={settings.currencySymbol} />
        <ContributionsCard
          transactions={transactions}
          accounts={accounts}
          categories={categories}
          currencySymbol={settings.currencySymbol}
        />
      </div>

      <DailyCashflowHeatmap transactions={transactions} currencySymbol={settings.currencySymbol} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CategorySpendingChart
          categorySpend={categorySpend}
          currencySymbol={settings.currencySymbol}
          rangeLabel={selectedRangeLabel}
        />

        {/* Monthly Trend Bar Chart */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Expense Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[350px] pt-4">
            <div className="h-full overflow-x-auto">
              <div
                className="h-full"
                style={historicalChartMinWidth ? { minWidth: historicalChartMinWidth } : undefined}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={historicalData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={val => formatCurrencyShort(val, settings.currencySymbol)}
                    />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--accent)/0.2)' }}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Income vs Expenses Stacked Grid */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Income vs Expenses
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[350px] pt-6">
          <div className="h-full overflow-x-auto">
            <div
              className="h-full"
              style={historicalChartMinWidth ? { minWidth: historicalChartMinWidth } : undefined}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={historicalData} barGap={8}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={val => formatCurrencyShort(val, settings.currencySymbol)}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--accent)/0.2)' }}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ paddingBottom: '20px', fontSize: '11px' }}
                  />
                  <Bar
                    name="Income"
                    dataKey="income"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                  />
                  <Bar
                    name="Expenses"
                    dataKey="expenses"
                    fill="#f43f5e"
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
