import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { useTranslation } from '@/hooks/useTranslation';
import { buildContributionTrendData, buildSpendingPaceData } from '@/lib/insightsWidgets';
import type { Account, Category, Transaction } from '@/types';
import { formatCurrencyShort } from '@/utils/format';

const SPENDING_SERIES = [
  { key: 'thisMonth', label: 'thisMonth', color: 'var(--color-primary)', dash: undefined },
  { key: 'lastMonth', label: 'lastMonth', color: 'var(--color-income)', dash: '5 4' },
  {
    key: 'typicalMonth',
    label: 'typicalMonth',
    color: 'var(--color-muted-foreground)',
    dash: '2 4',
  },
] as const;

function formatSignedCurrencyShort(amount: number, currencySymbol: string) {
  return amount < 0
    ? `−${formatCurrencyShort(Math.abs(amount), currencySymbol)}`
    : formatCurrencyShort(amount, currencySymbol);
}

function ChartLegend({
  items,
}: {
  items: { label: string; value: number; color: string; dash?: string; currencySymbol: string }[];
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map(item => (
        <div key={item.label} className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground sm:text-xs">
            <span
              aria-hidden="true"
              className="w-3 shrink-0 border-t-2"
              style={{ borderColor: item.color, borderStyle: item.dash ? 'dashed' : 'solid' }}
            />
            <span className="truncate">{item.label}</span>
          </div>
          <div className="mt-0.5 truncate text-xs font-semibold tabular-nums text-foreground sm:text-sm">
            {formatSignedCurrencyShort(item.value, item.currencySymbol)}
          </div>
        </div>
      ))}
    </div>
  );
}

function InsightTooltip({
  active,
  label,
  payload,
  seriesLabels,
  currencySymbol,
}: {
  active?: boolean;
  label?: string | number;
  payload?: { name?: string; value?: number }[];
  seriesLabels: Record<string, string>;
  currencySymbol: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      <div className="flex flex-col gap-1">
        {payload.map((item, index) => {
          const key = item.name || String(index);
          return (
            <div key={key} className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{seriesLabels[key] || key}</span>
              <span className="font-mono tabular-nums text-foreground">
                {formatSignedCurrencyShort(Number(item.value || 0), currencySymbol)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SpendingPaceCard({
  transactions,
  currencySymbol,
}: {
  transactions: Transaction[];
  currencySymbol: string;
}) {
  const { t } = useTranslation();
  const [today] = useState(() => new Date());
  const data = useMemo(() => buildSpendingPaceData(transactions, today), [transactions, today]);
  const latest = data[data.length - 1];
  const labels = useMemo(
    () =>
      Object.fromEntries(
        SPENDING_SERIES.map(series => [series.key, t(`insights.${series.label}`)])
      ),
    [t]
  );
  const hasData = data.some(
    point => point.thisMonth > 0 || point.lastMonth > 0 || point.typicalMonth > 0
  );

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="gap-1 px-5 pb-3 pt-5 sm:px-6">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            {t('insights.spendingPace')}
          </CardTitle>
          <InfoTooltip text={t('insights.spendingPaceDescription')} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-5 pb-5 sm:px-6">
        {hasData && latest ? (
          <>
            <ChartLegend
              items={SPENDING_SERIES.map(series => ({
                label: labels[series.key],
                value: latest[series.key],
                color: series.color,
                dash: series.dash,
                currencySymbol,
              }))}
            />
            <div
              className="h-52 min-w-0 sm:h-60"
              role="img"
              aria-label={t('insights.spendingPaceChart')}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid
                    stroke="var(--color-border)"
                    vertical={false}
                    strokeDasharray="3 4"
                  />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    minTickGap={12}
                    tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                    tickFormatter={value =>
                      Number(value) === 1 ||
                      Number(value) % 7 === 0 ||
                      Number(value) === today.getDate()
                        ? String(value)
                        : ''
                    }
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    width={48}
                    tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                    tickFormatter={value => formatCurrencyShort(Number(value), currencySymbol)}
                  />
                  <Tooltip
                    content={
                      <InsightTooltip seriesLabels={labels} currencySymbol={currencySymbol} />
                    }
                    labelFormatter={value => t('insights.dayLabel', { day: String(value ?? '') })}
                  />
                  {SPENDING_SERIES.map(series => (
                    <Line
                      key={series.key}
                      type="monotone"
                      dataKey={series.key}
                      name={series.key}
                      stroke={series.color}
                      strokeWidth={series.key === 'thisMonth' ? 2.5 : 1.75}
                      strokeDasharray={series.dash}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="flex min-h-52 items-center justify-center px-4 text-center text-sm text-muted-foreground">
            {t('insights.noSpendingPaceHistory')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ContributionsCard({
  transactions,
  accounts,
  categories,
  currencySymbol,
}: {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  currencySymbol: string;
}) {
  const { t } = useTranslation();
  const [range, setRange] = useState<'12m' | 'all'>('12m');
  const data = useMemo(
    () =>
      buildContributionTrendData(
        transactions,
        accounts,
        categories,
        new Date(),
        range === 'all' ? 'all' : 12
      ),
    [transactions, accounts, categories, range]
  );
  const latest = data[data.length - 1];
  const hasData = data.some(point => point.savingsMonthly !== 0 || point.investmentMonthly !== 0);
  const seriesLabels = {
    savings: t('insights.savings'),
    investments: t('insights.investments'),
    total: t('insights.totalSetAside'),
  };

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-3 px-5 pb-3 pt-5 sm:px-6">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            {t('insights.setAside')}
          </CardTitle>
          <InfoTooltip
            text={t('insights.contributionNote', {
              period:
                range === 'all'
                  ? t('insights.allAvailableHistory')
                  : t('insights.last12MonthsPeriod'),
            })}
          />
        </div>
        <div
          className="flex shrink-0 items-center gap-1"
          role="group"
          aria-label={t('insights.contributionRange')}
        >
          {(['12m', 'all'] as const).map(option => (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={range === option ? 'secondary' : 'ghost'}
              aria-pressed={range === option}
              onClick={() => setRange(option)}
              className="h-7 min-w-10 px-2 text-xs"
            >
              {t(option === '12m' ? 'insights.last12Months' : 'insights.allTime')}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-5 pb-5 sm:px-6">
        {hasData && latest ? (
          <>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  label: t('insights.savings'),
                  value: latest.savings,
                  color: 'var(--color-income)',
                },
                {
                  label: t('insights.investments'),
                  value: latest.investments,
                  color: 'var(--color-primary)',
                },
                {
                  label: t('insights.totalSetAside'),
                  value: latest.total,
                  color: 'var(--color-foreground)',
                },
              ].map(item => (
                <div key={item.label} className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground sm:text-xs">
                    <span
                      aria-hidden="true"
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                  <div className="mt-0.5 truncate text-xs font-semibold tabular-nums text-foreground sm:text-sm">
                    {formatSignedCurrencyShort(item.value, currencySymbol)}
                  </div>
                </div>
              ))}
            </div>
            <div
              className="h-52 min-w-0 sm:h-60"
              role="img"
              aria-label={t(
                range === 'all' ? 'insights.contributionChartAll' : 'insights.contributionChart'
              )}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid
                    stroke="var(--color-border)"
                    vertical={false}
                    strokeDasharray="3 4"
                  />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    minTickGap={8}
                    tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    width={48}
                    tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                    tickFormatter={value =>
                      formatSignedCurrencyShort(Number(value), currencySymbol)
                    }
                  />
                  <Tooltip
                    content={
                      <InsightTooltip seriesLabels={seriesLabels} currencySymbol={currencySymbol} />
                    }
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.month || ''}
                  />
                  <Area
                    type="monotone"
                    dataKey="savings"
                    name="savings"
                    stroke="var(--color-income)"
                    fill="var(--color-income)"
                    fillOpacity={0.3}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="investments"
                    name="investments"
                    stroke="var(--color-primary)"
                    fill="var(--color-primary)"
                    fillOpacity={0.28}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="total"
                    stroke="var(--color-foreground)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="flex min-h-52 items-center justify-center px-4 text-center text-sm text-muted-foreground">
            {t('insights.noContributionHistory', {
              period:
                range === 'all'
                  ? t('insights.allAvailableHistory')
                  : t('insights.last12MonthsPeriod'),
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
