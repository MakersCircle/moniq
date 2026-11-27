import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';
import { buildDailyCashflowHeatmapData } from '@/lib/insightsData';
import type { Transaction } from '@/types';
import { formatCurrencyShort } from '@/utils/format';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function colorForNet(net: number, income: number, spent: number) {
  if (income === 0 && spent === 0) return 'bg-muted/60';
  const scale = Math.max(income, spent, 1);
  const intensity = Math.min(4, Math.max(1, Math.ceil((Math.abs(net) / scale) * 4)));
  if (net > 0)
    return [
      'bg-emerald-200 dark:bg-emerald-950',
      'bg-emerald-300 dark:bg-emerald-900',
      'bg-emerald-500 dark:bg-emerald-700',
      'bg-emerald-600 dark:bg-emerald-500',
    ][intensity - 1];
  if (net < 0)
    return [
      'bg-rose-200 dark:bg-rose-950',
      'bg-rose-300 dark:bg-rose-900',
      'bg-rose-500 dark:bg-rose-700',
      'bg-rose-600 dark:bg-rose-500',
    ][intensity - 1];
  return 'bg-amber-300 dark:bg-amber-700';
}

function cashflowState(income: number, spent: number) {
  if (income === 0 && spent === 0) return 'empty';
  if (income > spent) return 'income';
  if (spent > income) return 'spending';
  return 'balanced';
}

export default function DailyCashflowHeatmap({
  transactions,
  currencySymbol,
}: {
  transactions: Transaction[];
  currencySymbol: string;
}) {
  const { t } = useTranslation();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const calendarScrollRef = useRef<HTMLDivElement>(null);
  const now = new Date();
  const currentYear = now.getFullYear();
  const todayDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const years = useMemo(() => {
    const values = new Set([new Date().getFullYear()]);
    for (const transaction of transactions) {
      if (
        !transaction.isDeleted &&
        (transaction.uiType === 'income' || transaction.uiType === 'expense') &&
        /^\d{4}-\d{2}-\d{2}$/.test(transaction.date)
      ) {
        values.add(Number(transaction.date.slice(0, 4)));
      }
    }
    return Array.from(values).sort((a, b) => b - a);
  }, [transactions]);
  const calendar = useMemo(
    () => buildDailyCashflowHeatmapData(transactions, year),
    [transactions, year]
  );
  const activeDay = calendar.days.find(day => day.date === activeDate) ?? null;
  const money = (amount: number) => formatCurrencyShort(amount, currencySymbol);
  const formatDate = (date: string) =>
    new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

  useLayoutEffect(() => {
    const scrollContainer = calendarScrollRef.current;
    if (year !== currentYear || !scrollContainer) return;

    const todayCell = scrollContainer.querySelector<HTMLButtonElement>(
      `[data-testid="cashflow-day-${todayDate}"]`
    );
    if (!todayCell || scrollContainer.scrollWidth <= scrollContainer.clientWidth) return;

    const containerRect = scrollContainer.getBoundingClientRect();
    const cellRect = todayCell.getBoundingClientRect();
    const centeredScrollLeft =
      scrollContainer.scrollLeft +
      cellRect.left -
      containerRect.left -
      (scrollContainer.clientWidth - cellRect.width) / 2;
    scrollContainer.scrollLeft = Math.max(
      0,
      Math.min(centeredScrollLeft, scrollContainer.scrollWidth - scrollContainer.clientWidth)
    );
  }, [calendar.weeks.length, currentYear, todayDate, year]);

  return (
    <Card className="min-w-0 border-border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-3 px-5 pb-3 pt-5 sm:px-6">
        <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          {t('insights.dailyCashflow')}
        </CardTitle>
        <Select
          value={String(year)}
          onValueChange={value => {
            setYear(Number(value));
            setActiveDate(null);
          }}
        >
          <SelectTrigger
            aria-label={t('insights.cashflowYear')}
            className="h-8 w-[6.5rem] px-2 text-xs"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {years.map(value => (
              <SelectItem key={value} value={String(value)}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="min-w-0 space-y-3 px-5 pb-5 sm:px-6">
        <div
          ref={calendarScrollRef}
          data-testid="cashflow-calendar-scroll"
          className="min-w-0 overflow-x-auto overscroll-x-contain pb-1"
          role="region"
          aria-label={t('insights.dailyCashflowCalendar')}
        >
          <div
            className="grid min-w-[800px] w-full gap-x-1 gap-y-1"
            style={{
              gridTemplateColumns: `24px repeat(${calendar.weeks.length}, minmax(0, 1fr))`,
              gridTemplateRows: '16px repeat(7, minmax(0, 1fr))',
              aspectRatio: `${calendar.weeks.length + 1} / 8`,
            }}
          >
            {WEEKDAYS.map((day, index) => (
              <span
                key={day}
                className="sticky left-0 z-10 flex items-center justify-end bg-card pr-1 text-[10px] leading-none text-muted-foreground"
                style={{ gridColumnStart: 1, gridRowStart: index + 2 }}
              >
                {index === 1 || index === 3 || index === 5 ? t(`insights.weekday${day}`) : ''}
              </span>
            ))}
            {calendar.monthLabels.map(month => (
              <span
                key={`${month.label}-${month.weekIndex}`}
                className="text-[10px] leading-4 text-muted-foreground"
                style={{ gridColumnStart: month.weekIndex + 2, gridRowStart: 1 }}
              >
                {month.label}
              </span>
            ))}
            {calendar.weeks.flatMap(week =>
              week.days.map((day, weekdayIndex) => {
                if (!day) {
                  return (
                    <span
                      key={`blank-${week.index}-${weekdayIndex}`}
                      style={{ gridColumnStart: week.index + 2, gridRowStart: weekdayIndex + 2 }}
                    />
                  );
                }
                const selected = activeDate === day.date;
                const state = cashflowState(day.income, day.spent);
                const label = t('insights.heatmapDay', {
                  date: formatDate(day.date),
                  income: money(day.income),
                  spent: money(day.spent),
                });
                return (
                  <button
                    key={day.date}
                    type="button"
                    data-testid={`cashflow-day-${day.date}`}
                    data-cashflow-state={state}
                    aria-label={label}
                    aria-pressed={selected}
                    title={label}
                    onMouseEnter={() => setActiveDate(day.date)}
                    onFocus={() => setActiveDate(day.date)}
                    onClick={() => setActiveDate(day.date)}
                    className={`h-full w-full rounded-[3px] outline-none transition-colors hover:ring-2 hover:ring-primary focus-visible:ring-2 focus-visible:ring-primary ${colorForNet(day.net, day.income, day.spent)}`}
                    style={{ gridColumnStart: week.index + 2, gridRowStart: weekdayIndex + 2 }}
                  />
                );
              })
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p
            data-testid="cashflow-day-details"
            aria-live="polite"
            className="min-h-8 min-w-0 text-xs text-muted-foreground"
          >
            {activeDay ? (
              <span className="flex flex-wrap gap-x-3 gap-y-1">
                <span>{formatDate(activeDay.date)}</span>
                <span>
                  {t('insights.spent')}:{' '}
                  <strong className="font-medium text-foreground">{money(activeDay.spent)}</strong>
                </span>
                <span>
                  {t('insights.income')}:{' '}
                  <strong className="font-medium text-foreground">{money(activeDay.income)}</strong>
                </span>
              </span>
            ) : (
              t('insights.heatmapInteractionHint')
            )}
          </p>
          <div
            className="flex shrink-0 items-center gap-2 text-[10px] text-muted-foreground"
            aria-label={t('insights.dailyCashflowLegend')}
          >
            <span>{t('insights.moreSpent')}</span>
            <span className="size-2.5 rounded-sm bg-rose-500" />
            <span className="size-2.5 rounded-sm bg-amber-300 dark:bg-amber-700" />
            <span className="size-2.5 rounded-sm bg-emerald-500" />
            <span>{t('insights.moreIncome')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
