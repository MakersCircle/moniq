import { memo, useMemo } from 'react';
import { formatCurrencyShort } from '@/utils/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import IncomeExpenseSankey from '@/components/Insights/IncomeExpenseSankey';
import DailyCashflowHeatmap from '@/components/Insights/DailyCashflowHeatmap';
import CategorySpendingChart from '@/components/Insights/CategorySpendingChart';
import { ContributionsCard, SpendingPaceCard } from '@/components/Insights/InsightTrendWidgets';
import {
  EChartsAreaChart,
  type ChartConfig,
} from '@/components/evilcharts/charts/echarts-area-chart';
import {
  buildInsightsMonthlyTrendData,
  buildInsightsPeriodData,
  type InsightsDateRange,
} from '@/lib/insightsData';
import type { Account, Category, Transaction } from '@/types';
import { useProgressiveRender } from '@/hooks/useProgressiveRender';

const CategorySpending = memo(CategorySpendingChart);
const MoneyFlow = memo(IncomeExpenseSankey);
const SpendingPace = memo(SpendingPaceCard);
const Contributions = memo(ContributionsCard);
const CashflowCalendar = memo(DailyCashflowHeatmap);

const incomeExpenseChartConfig = {
  income: {
    label: 'Income',
    colors: { light: ['#047857'], dark: ['#10b981'] },
  },
  expenses: {
    label: 'Expenses',
    colors: { light: ['#be123c'], dark: ['#f43f5e'] },
  },
} satisfies ChartConfig;

function toISODate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function trailingTwelveMonthRange(): InsightsDateRange {
  const now = new Date();
  const firstMonth = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { startDate: toISODate(firstMonth), endDate: toISODate(lastDay) };
}

interface InsightsChartsProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  currencySymbol: string;
  range: InsightsDateRange | null;
}

export default function InsightsCharts({
  transactions,
  accounts,
  categories,
  currencySymbol,
  range,
}: InsightsChartsProps) {
  const visibleSections = useProgressiveRender(4, 1);
  const trendRange = useMemo(() => trailingTwelveMonthRange(), []);
  const { categorySpend } = useMemo(
    () => buildInsightsPeriodData(transactions, categories, range),
    [transactions, categories, range]
  );
  const incomeExpenseData = useMemo(
    () => buildInsightsMonthlyTrendData(transactions, trendRange),
    [transactions, trendRange]
  );

  return (
    <div className="isolate space-y-8">
      <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-2">
        <CategorySpending categorySpend={categorySpend} currencySymbol={currencySymbol} />
        <SpendingPace transactions={transactions} currencySymbol={currencySymbol} />
      </div>

      {visibleSections >= 2 && (
        <MoneyFlow
          transactions={transactions}
          categories={categories}
          currencySymbol={currencySymbol}
          range={range}
        />
      )}

      {visibleSections >= 3 && (
        <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-2">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Income vs Expenses
              </CardTitle>
              <p className="text-xs text-muted-foreground">Last 12 months</p>
            </CardHeader>
            <CardContent className="h-[350px] pt-2">
              <div
                className="h-full w-full"
                data-testid="income-expense-trend-chart"
                data-month-count={incomeExpenseData.length}
                role="img"
                aria-label="Income and expenses over the last 12 months"
              >
                <EChartsAreaChart
                  data={incomeExpenseData}
                  config={incomeExpenseChartConfig}
                  xDataKey="label"
                  className="h-full w-full"
                  curveType="monotone"
                  animation={false}
                  chartOptions={{
                    grid: { left: 56, right: 12, top: 36, bottom: 28 },
                  }}
                >
                  <EChartsAreaChart.Grid />
                  <EChartsAreaChart.XAxis
                    dataKey="label"
                    tickFormatter={value => value.slice(0, 3)}
                  />
                  <EChartsAreaChart.YAxis
                    tickFormatter={value => formatCurrencyShort(value, currencySymbol)}
                  />
                  <EChartsAreaChart.Legend align="right" verticalAlign="top" />
                  <EChartsAreaChart.Tooltip />
                  <EChartsAreaChart.Area
                    dataKey="income"
                    variant="gradient"
                    strokeVariant="dashed"
                    strokeWidth={2}
                  >
                    <EChartsAreaChart.Dot variant="border" />
                    <EChartsAreaChart.ActiveDot variant="colored-border" />
                  </EChartsAreaChart.Area>
                  <EChartsAreaChart.Area
                    dataKey="expenses"
                    variant="gradient"
                    strokeVariant="dashed"
                    strokeWidth={2}
                  >
                    <EChartsAreaChart.Dot variant="border" />
                    <EChartsAreaChart.ActiveDot variant="colored-border" />
                  </EChartsAreaChart.Area>
                </EChartsAreaChart>
              </div>
            </CardContent>
          </Card>
          <Contributions
            transactions={transactions}
            accounts={accounts}
            categories={categories}
            currencySymbol={currencySymbol}
          />
        </div>
      )}
      {visibleSections >= 4 && (
        <CashflowCalendar transactions={transactions} currencySymbol={currencySymbol} />
      )}
    </div>
  );
}
