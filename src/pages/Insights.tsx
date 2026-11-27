import { lazy, memo, Suspense, useMemo, useState } from 'react';
import { useDataStore } from '../store/dataStore';
import { CalendarRange, ChevronDown, LineChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/Transactions/DatePicker';
import { Field, FieldLabel } from '@/components/ui/field';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTranslation } from '@/hooks/useTranslation';
import type { InsightsDateRange } from '@/lib/insightsData';
import { normalizeDateRange } from '@/lib/dateRange';
import type { Transaction } from '@/types';

const InsightsCharts = memo(lazy(() => import('@/components/Insights/InsightsCharts')));

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
  const effectiveRange = useMemo(
    () => normalizeDateRange(datePreset === 'all' ? allTimeRange(transactions) : dateRange),
    [datePreset, dateRange, transactions]
  );
  const selectedRangeLabel = rangeLabel(datePreset, effectiveRange, t);
  const customRangeStart =
    normalizeDateRange(dateRange)?.startDate || dateRange.startDate || dateRange.endDate;
  const customRangeEnd = normalizeDateRange(dateRange)?.endDate;

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
      <header className="sticky top-0 z-20 -mx-4 -mt-2 flex min-w-0 items-center justify-between gap-3 bg-background px-4 py-2 md:-mx-8 md:px-8 [@media(max-height:500px)]:-mx-3 [@media(max-height:500px)]:px-3">
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
      </header>

      <Suspense
        fallback={
          <p role="status" className="py-8 text-center text-sm text-muted-foreground">
            Loading charts…
          </p>
        }
      >
        <InsightsCharts
          transactions={transactions}
          accounts={accounts}
          categories={categories}
          currencySymbol={settings.currencySymbol}
          range={effectiveRange}
        />
      </Suspense>
    </div>
  );
}
