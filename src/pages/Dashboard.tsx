import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import PageShell from '../components/PageShell';
import TxnRow from '../components/TxnRow';
import { useDataStore } from '../store/dataStore';
import { useAllBalances, useMonthSummary, useCategorySpend } from '../hooks/useComputed';
import { formatCurrency, formatCurrencyShort } from '../utils/format';
import './Dashboard.css';

const CATEGORY_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function Dashboard() {
  const { sources, transactions, settings } = useDataStore();
  const balances = useAllBalances();

  const now = new Date();
  const { income, expenses, net } = useMonthSummary(now.getFullYear(), now.getMonth() + 1);
  const categorySpend = useCategorySpend(now.getFullYear(), now.getMonth() + 1);

  const netWorth = useMemo(() => {
    return sources
      .filter((s) => s.isActive && !s.excludeFromNet)
      .reduce((sum, s) => sum + (balances[s.id] || 0), 0);
  }, [sources, balances]);

  const recentTxns = useMemo(() => {
    return transactions
      .filter((t) => !t.isDeleted)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  }, [transactions]);

  const monthLabel = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <PageShell noPad>
      <div className="dashboard">
        {/* Background blobs */}
        <div className="bg-blobs" aria-hidden="true">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
          <div className="blob blob-3" />
        </div>

        {/* Hero — Net Worth */}
        <section className="dash-hero">
          <p className="label">Total Net Worth</p>
          <h1 className={`dash-net-worth mono${netWorth < 0 ? ' text-expense' : ''}`}>
            {netWorth < 0 ? '−' : ''}{formatCurrency(Math.abs(netWorth), settings)}
          </h1>
          <p className="dash-month text-secondary">{monthLabel}</p>
        </section>

        {/* Month Summary */}
        <section className="dash-section">
          <div className="dash-summary-grid">
            <div className="dash-summary-card income">
              <TrendingUp size={18} />
              <div>
                <p className="label">Income</p>
                <p className="dash-summary-amount mono">{formatCurrency(income, settings)}</p>
              </div>
            </div>
            <div className="dash-summary-card expense">
              <TrendingDown size={18} />
              <div>
                <p className="label">Expenses</p>
                <p className="dash-summary-amount mono">{formatCurrency(expenses, settings)}</p>
              </div>
            </div>
          </div>
          {/* Net for month */}
          <div className="dash-net-bar">
            <span className="text-secondary" style={{ fontSize: '0.875rem' }}>Month net</span>
            <span className={`mono ${net >= 0 ? 'text-income' : 'text-expense'}`} style={{ fontWeight: 600 }}>
              {net >= 0 ? '+' : '−'}{formatCurrency(Math.abs(net), settings)}
            </span>
          </div>
        </section>

        {/* Sources */}
        <section className="dash-section">
          <h2 className="dash-section-title">Accounts</h2>
          <div className="sources-grid">
            {sources.filter((s) => s.isActive).map((s) => {
              const bal = balances[s.id] || 0;
              return (
                <div key={s.id} className="source-card card">
                  <span className="source-type label">{s.type}</span>
                  <span className="source-name truncate">{s.name}</span>
                  <span className={`source-balance mono${bal < 0 ? ' text-expense' : ''}`}>
                    {bal < 0 ? '−' : ''}{formatCurrencyShort(Math.abs(bal), settings.currencySymbol)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Category Breakdown */}
        {categorySpend.length > 0 && (
          <section className="dash-section">
            <h2 className="dash-section-title">Where it went</h2>
            <div className="dash-chart-wrap card">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={categorySpend}
                    dataKey="amount"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {categorySpend.map((_, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => formatCurrency(Number(v), settings)}
                    contentStyle={{ background: '#1a1a1e', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="chart-legend">
                {categorySpend.slice(0, 5).map((c, i) => (
                  <div key={c.label} className="legend-row">
                    <span className="legend-dot" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                    <span className="legend-label truncate">{c.label}</span>
                    <span className="legend-amount mono">{formatCurrencyShort(c.amount, settings.currencySymbol)}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Recent Transactions */}
        <section className="dash-section">
          <div className="dash-section-header">
            <h2 className="dash-section-title">Recent</h2>
            <Link to="/transactions" className="btn btn-ghost btn-sm">
              See all <ArrowRight size={14} />
            </Link>
          </div>
          {recentTxns.length === 0 ? (
            <div className="empty-state card">
              <p>No transactions yet.</p>
              <Link to="/add" className="btn btn-primary btn-sm">Add your first one</Link>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {recentTxns.map((t) => (
                <TxnRow key={t.id} txn={t} />
              ))}
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}
