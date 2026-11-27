import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  EChartsBarChart,
  type ChartConfig,
} from '@/components/evilcharts/charts/echarts-bar-chart';
import {
  buildInsightsCategoryBarData,
  type InsightsCategoryBarRow,
  type InsightsCategorySpend,
} from '@/lib/insightsData';
import { formatCurrencyShort } from '@/utils/format';

function escapeTooltipText(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createCategoryTooltipFormatter(rows: InsightsCategoryBarRow[], currencySymbol: string) {
  return (params: unknown) => {
    const points = Array.isArray(params) ? params : [params];
    const first = points[0] as { dataIndex?: number } | undefined;
    const row = typeof first?.dataIndex === 'number' ? rows[first.dataIndex] : undefined;
    if (!row) return '';

    const details = row.details
      .map(
        detail => `<div class="flex items-center justify-between gap-4">
          <span class="truncate text-muted-foreground">${escapeTooltipText(detail.label)}</span>
          <span class="shrink-0 font-mono tabular-nums text-foreground">${escapeTooltipText(formatCurrencyShort(detail.amount, currencySymbol))}</span>
        </div>`
      )
      .join('');
    const title = row.isOther ? 'Other categories' : `${row.label} · ${row.group}`;

    return `<div class="grid max-w-64 gap-1.5 rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <div class="font-medium text-foreground">${escapeTooltipText(title)}</div>
      <div class="grid max-h-36 gap-1 overflow-y-auto">${details}</div>
      <div class="mt-1 flex items-center justify-between gap-4 border-t border-border pt-1 font-medium">
        <span class="text-foreground">Total spent</span>
        <span class="font-mono tabular-nums text-foreground">${escapeTooltipText(formatCurrencyShort(row.amount, currencySymbol))}</span>
      </div>
    </div>`;
  };
}

export default function CategorySpendingChart({
  categorySpend,
  currencySymbol,
}: {
  categorySpend: InsightsCategorySpend[];
  currencySymbol: string;
}) {
  const [maxBars, setMaxBars] = useState(6);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartData = useMemo(
    () => buildInsightsCategoryBarData(categorySpend, maxBars),
    [categorySpend, maxBars]
  );
  const chartConfig = useMemo(
    () =>
      Object.fromEntries(
        chartData.series.map(series => [
          series.key,
          { label: series.label, colors: { light: [series.color], dark: [series.color] } },
        ])
      ) satisfies ChartConfig,
    [chartData.series]
  );
  const tooltipFormatter = useMemo(
    () => createCategoryTooltipFormatter(chartData.rows, currencySymbol),
    [chartData.rows, currencySymbol]
  );
  const rotateLabels = chartData.rows.length > 4;

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const updateCapacity = () => {
      const width = container.clientWidth;
      if (!width) return;
      const capacity = Math.max(4, Math.floor((width - 56) / 48));
      setMaxBars(current => (current === capacity ? current : capacity));
    };
    const resizeObserver = new ResizeObserver(updateCapacity);
    resizeObserver.observe(container);
    updateCapacity();
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <Card className="flex flex-col border-border shadow-sm">
      <CardHeader className="px-5 pb-3 pt-5 sm:px-6">
        <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Spending by Category
        </CardTitle>
      </CardHeader>
      <CardContent className="min-h-[320px] min-w-0 flex-1 px-4 pb-4 pt-0 sm:px-5">
        {categorySpend.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm italic text-muted-foreground">
            No spending data in this date range
          </div>
        ) : (
          <div
            ref={chartContainerRef}
            className="h-full min-w-0"
            role="img"
            aria-label="Category and subcategory spending"
            data-testid="category-spending-chart"
            data-visible-category-count={chartData.rows.length}
            data-has-other={chartData.rows.some(row => row.isOther)}
          >
            <EChartsBarChart
              data={chartData.rows}
              config={chartConfig}
              xDataKey="label"
              className="h-full min-h-[280px] w-full"
              stackType="stacked"
              barCategoryGap={18}
              animation={false}
              chartOptions={{
                grid: {
                  left: 52,
                  right: 12,
                  top: 12,
                  bottom: rotateLabels ? 58 : 40,
                  outerBoundsMode: 'none',
                },
              }}
            >
              <EChartsBarChart.Grid />
              <EChartsBarChart.XAxis
                dataKey="label"
                rotate={rotateLabels ? 35 : 0}
                interval={0}
                tickFormatter={value => {
                  const limit = maxBars > 8 ? 9 : 13;
                  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
                }}
              />
              <EChartsBarChart.YAxis
                tickFormatter={value => formatCurrencyShort(Number(value), currencySymbol)}
              />
              <EChartsBarChart.Tooltip formatter={tooltipFormatter} />
              {chartData.series.map(segment => (
                <EChartsBarChart.Bar key={segment.key} dataKey={segment.key} radius={6} />
              ))}
            </EChartsBarChart>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
