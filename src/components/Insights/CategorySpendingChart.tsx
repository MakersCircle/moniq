import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  buildInsightsCategoryBarData,
  type InsightsCategoryBarRow,
  type InsightsCategorySpend,
} from '@/lib/insightsData';
import { formatCurrencyShort } from '@/utils/format';

function CategoryTooltip({
  active,
  payload,
  currencySymbol,
}: {
  active?: boolean;
  payload?: { payload?: InsightsCategoryBarRow }[];
  currencySymbol: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div className="max-w-64 rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-foreground">
        {row.isOther ? 'Other categories' : `${row.label} · ${row.group}`}
      </p>
      <div className="flex max-h-36 flex-col gap-1 overflow-y-auto">
        {row.details.map((detail, index) => (
          <div key={`${detail.label}-${index}`} className="flex items-center justify-between gap-4">
            <span className="truncate text-muted-foreground">{detail.label}</span>
            <span className="shrink-0 font-mono tabular-nums text-foreground">
              {formatCurrencyShort(detail.amount, currencySymbol)}
            </span>
          </div>
        ))}
        <div className="mt-1 flex items-center justify-between gap-4 border-t border-border pt-1 font-medium">
          <span className="text-foreground">Total spent</span>
          <span className="font-mono tabular-nums text-foreground">
            {formatCurrencyShort(row.amount, currencySymbol)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function CategorySpendingChart({
  categorySpend,
  currencySymbol,
  rangeLabel,
}: {
  categorySpend: InsightsCategorySpend[];
  currencySymbol: string;
  rangeLabel: string;
}) {
  const [maxBars, setMaxBars] = useState(6);
  const chartData = useMemo(
    () => buildInsightsCategoryBarData(categorySpend, maxBars),
    [categorySpend, maxBars]
  );

  return (
    <Card className="flex flex-col border-border shadow-sm">
      <CardHeader className="px-5 pb-3 pt-5 sm:px-6">
        <CardTitle className="flex items-center justify-between gap-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">
          <span>Spending by Category</span>
          <span className="max-w-[46%] truncate rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium lowercase">
            {rangeLabel}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="min-h-[260px] min-w-0 flex-1 px-4 pb-4 pt-0 sm:px-5">
        {categorySpend.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm italic text-muted-foreground">
            No spending data in this date range
          </div>
        ) : (
          <div
            className="h-full min-w-0"
            role="img"
            aria-label="Category and subcategory spending"
            data-testid="category-spending-chart"
            data-visible-category-count={chartData.rows.length}
            data-has-other={chartData.rows.some(row => row.isOther)}
          >
            <ResponsiveContainer
              width="100%"
              height="100%"
              onResize={width => {
                const capacity = Math.max(4, Math.floor((width - 56) / 40));
                setMaxBars(current => (current === capacity ? current : capacity));
              }}
            >
              <BarChart data={chartData.rows} margin={{ top: 8, right: 8, left: 0, bottom: 28 }}>
                <CartesianGrid
                  stroke="var(--color-border)"
                  vertical={false}
                  strokeDasharray="3 4"
                />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={maxBars > 7 ? -35 : 0}
                  textAnchor={maxBars > 7 ? 'end' : 'middle'}
                  height={maxBars > 7 ? 56 : 38}
                  tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                  tickFormatter={value =>
                    String(value).length > (maxBars > 7 ? 16 : 10)
                      ? `${String(value).slice(0, maxBars > 7 ? 15 : 9)}…`
                      : value
                  }
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  tick={{ fontSize: 9, fill: 'var(--color-muted-foreground)' }}
                  tickFormatter={value => formatCurrencyShort(Number(value), currencySymbol)}
                />
                <Tooltip
                  content={<CategoryTooltip currencySymbol={currencySymbol} />}
                  cursor={{ fill: 'var(--color-accent)', opacity: 0.25 }}
                />
                {chartData.series.map(segment => (
                  <Bar
                    key={segment.key}
                    dataKey={segment.key}
                    name={segment.label}
                    stackId="category"
                    fill={segment.color}
                    radius={6}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
