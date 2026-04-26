import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
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
import { useCategorySpend, useHistoricalData } from '../hooks/useComputed';
import { formatCurrencyShort } from '../utils/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const CATEGORY_COLORS = [
  '#863bff', // Primary
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
];

export default function Insights() {
  const { settings } = useDataStore();
  const now = new Date();
  const categorySpend = useCategorySpend(now.getFullYear(), now.getMonth() + 1);
  const historicalData = useHistoricalData(6);

  const totalExpense = useMemo(
    () => categorySpend.reduce((sum, c) => sum + c.amount, 0),
    [categorySpend]
  );

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Insights</h1>
        <p className="text-sm text-muted-foreground">
          Financial trends and breakdown for your activity
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category Breakdown Donut */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between">
              Spending by Category
              <span className="text-[10px] lowercase font-medium bg-accent px-2 py-0.5 rounded-full">
                This Month
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            {categorySpend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground italic text-sm">
                No spending data for this month
              </div>
            ) : (
              <div className="flex h-full items-center">
                <div className="w-[55%] h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categorySpend}
                        dataKey="amount"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={5}
                        stroke="transparent"
                      >
                        {categorySpend.map((_, i) => (
                          <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '12px',
                          fontSize: '12px',
                        }}
                        formatter={(val: number) => [
                          formatCurrencyShort(val, settings.currencySymbol),
                          'Spent',
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-[45%] flex flex-col justify-center space-y-3 pl-4">
                  {categorySpend.slice(0, 5).map((c, i) => (
                    <div key={c.label} className="flex items-center justify-between group">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                        />
                        <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                          {c.label}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold mono">
                        {((c.amount / totalExpense) * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trend Bar Chart */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Expense Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[350px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
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
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={historicalData} barGap={8}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
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
        </CardContent>
      </Card>
    </div>
  );
}
