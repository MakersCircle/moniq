import { useMemo } from 'react';
import {
  EChartsSankeyChart,
  type ChartConfig,
  type SankeyData,
} from '@/components/evilcharts/charts/echarts-sankey-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import {
  buildInsightsSankeyChartData,
  buildInsightsSankeyData,
  type InsightsSankeyNode,
} from '@/lib/insightsSankey';
import type { InsightsDateRange } from '@/lib/insightsData';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';
import type { Category, Transaction } from '@/types';
import { formatCurrencyShort } from '@/utils/format';

interface IncomeExpenseSankeyProps {
  transactions: Transaction[];
  categories: Category[];
  currencySymbol: string;
  range: InsightsDateRange | null;
}

export default function IncomeExpenseSankey({
  transactions,
  categories,
  currencySymbol,
  range,
}: IncomeExpenseSankeyProps) {
  const isMobile = useIsMobile();
  const data = useMemo(
    () => buildInsightsSankeyData(transactions, categories, range),
    [transactions, categories, range]
  );
  const chartData = useMemo<SankeyData>(
    () => buildInsightsSankeyChartData(data, isMobile),
    [data, isMobile]
  );
  const incomeTotal = data.nodes.find(node => node.label === 'Total income')?.flowValue || 0;
  const expenseTotal = data.nodes.find(node => node.label === 'Total expenses')?.flowValue || 0;
  const overallTotal = Math.max(incomeTotal, expenseTotal);
  const chartConfig = useMemo(
    () =>
      Object.fromEntries(
        data.nodes.map((node: InsightsSankeyNode) => [
          node.name,
          {
            label:
              node.kind === 'total' ||
              (isMobile && node.stage === 4) ||
              (node.flowValue > 0 &&
                node.flowValue /
                  (node.kind === 'income'
                    ? incomeTotal
                    : node.kind === 'expense'
                      ? expenseTotal
                      : overallTotal) >=
                  (isMobile ? 0.14 : 0.06) &&
                (!isMobile || node.label.length <= 10))
                ? node.label
                : '',
            tooltipLabel: node.label,
            tooltipValueFormatter: value => formatCurrencyShort(value, currencySymbol),
            colors: { light: [node.fill], dark: [node.fill] },
          },
        ])
      ) as ChartConfig,
    [data.nodes, incomeTotal, expenseTotal, overallTotal, currencySymbol, isMobile]
  );
  const nodeLabelOptions = useMemo(
    () => ({
      position: 'outside' as const,
      showValues: true,
      valueFormatter: (value: number) => formatCurrencyShort(value, currencySymbol),
    }),
    [currencySymbol]
  );
  const stageCounts = new Map<number, number>();
  for (const node of data.nodes) {
    if (isMobile && (node.stage === 0 || node.stage === 6)) continue;
    stageCounts.set(node.stage, (stageCounts.get(node.stage) || 0) + 1);
  }
  const maxStageCount = Math.max(0, ...stageCounts.values());
  const chartHeight = Math.max(isMobile ? 600 : 420, maxStageCount * (isMobile ? 72 : 44));

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-3 px-5 pb-2 pt-4 sm:px-6 sm:pb-3 sm:pt-5">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Money flow
          </CardTitle>
          <InfoTooltip text="Transfers are excluded. Unspent income or existing funds balance the period totals. Flows show category totals, not which income paid for each purchase." />
        </div>
      </CardHeader>
      <CardContent className={cn('p-0', !isMobile && 'px-6 pb-4')}>
        {data.links.length === 0 ? (
          <div className="flex min-h-48 items-center justify-center px-4 pb-6 text-center text-sm text-muted-foreground">
            No income or expense activity in this date range. Transfers are excluded from this view.
          </div>
        ) : (
          <>
            <div
              className="w-full min-w-0 overflow-hidden"
              role="region"
              aria-label="Money flow chart"
              tabIndex={0}
            >
              <div className="w-full min-w-0" style={{ height: chartHeight }}>
                <EChartsSankeyChart
                  data={chartData}
                  config={chartConfig}
                  className="h-full w-full"
                  nodeWidth={isMobile ? 8 : 12}
                  nodePadding={isMobile ? 24 : 16}
                  outsideLabelMargin={isMobile ? 16 : 120}
                  nodeLabelOptions={nodeLabelOptions}
                  enableTooltip
                  linkCurvature={0.5}
                >
                  <EChartsSankeyChart.Tooltip />
                  <EChartsSankeyChart.Link variant="gradient" />
                  <EChartsSankeyChart.Node radius={4}></EChartsSankeyChart.Node>
                </EChartsSankeyChart>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
