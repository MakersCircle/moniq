import { useState, useMemo } from 'react';
import { Download, SlidersHorizontal, X } from 'lucide-react';
import PageShell from '../components/PageShell';
import TxnRow from '../components/TxnRow';
import Modal from '../components/Modal';
import { useDataStore } from '../store/dataStore';
import { useFilteredTransactions } from '../hooks/useComputed';
import { groupByDate, exportToCSV, toMonthKey } from '../utils/format';
import type { TxnFilter } from '../hooks/useComputed';
import './Transactions.css';

export default function Transactions() {
  const { sources, categories, methods, settings } = useDataStore();
  const [filter, setFilter] = useState<TxnFilter>({
    month: toMonthKey(new Date()),
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);

  const txns = useFilteredTransactions(filter);
  const { transactions, deleteTransaction } = useDataStore();

  const grouped = useMemo(() => groupByDate(txns), [txns]);

  const selectedTxn = transactions.find((t) => t.id === selectedTxnId);

  const updateFilter = (patch: Partial<TxnFilter>) =>
    setFilter((f) => ({ ...f, ...patch }));

  const clearFilter = (key: keyof TxnFilter) =>
    setFilter((f) => { const next = { ...f }; delete next[key]; return next; });

  const activeFilterCount = Object.keys(filter).filter(
    (k) => filter[k as keyof TxnFilter] && k !== 'month'
  ).length;

  const handleExport = () => {
    exportToCSV(txns, sources, categories, methods, `moniq-${filter.month || 'all'}.csv`);
  };

  return (
    <PageShell
      title="Ledger"
      subtitle={`${txns.length} transactions`}
      headerRight={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-icon" onClick={handleExport} aria-label="Download CSV" title="Download CSV">
            <Download size={18} />
          </button>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setShowFilters(true)}
            aria-label="Filters"
          >
            <SlidersHorizontal size={18} />
            {activeFilterCount > 0 && (
              <span className="filter-badge">{activeFilterCount}</span>
            )}
          </button>
        </div>
      }
    >
      {/* Month Strip */}
      <div className="month-strip">
        <input
          type="month"
          className="form-input month-input"
          value={filter.month || ''}
          onChange={(e) => updateFilter({ month: e.target.value || undefined })}
          aria-label="Filter by month"
        />
        {filter.month && (
          <button className="btn btn-ghost btn-sm" onClick={() => clearFilter('month')}>
            All time
          </button>
        )}
      </div>

      {/* Active filter chips */}
      {(filter.type || filter.sourceId || filter.categoryId || filter.search) && (
        <div className="filter-chips">
          {filter.type && (
            <span className={`chip chip-${filter.type}`}>
              {filter.type}
              <button onClick={() => clearFilter('type')} aria-label="Remove type filter"><X size={12} /></button>
            </span>
          )}
          {filter.sourceId && (
            <span className="chip chip-neutral">
              {sources.find((s) => s.id === filter.sourceId)?.name}
              <button onClick={() => clearFilter('sourceId')} aria-label="Remove source filter"><X size={12} /></button>
            </span>
          )}
          {filter.categoryId && (
            <span className="chip chip-neutral">
              {categories.find((c) => c.id === filter.categoryId)?.head}
              <button onClick={() => clearFilter('categoryId')} aria-label="Remove category filter"><X size={12} /></button>
            </span>
          )}
          {filter.search && (
            <span className="chip chip-neutral">
              "{filter.search}"
              <button onClick={() => clearFilter('search')} aria-label="Clear search"><X size={12} /></button>
            </span>
          )}
        </div>
      )}

      {/* Search */}
      <input
        type="search"
        className="form-input"
        placeholder="Search by note..."
        value={filter.search || ''}
        onChange={(e) => updateFilter({ search: e.target.value || undefined })}
        aria-label="Search transactions"
      />

      {/* Transaction Groups */}
      {grouped.length === 0 ? (
        <div className="empty-state">
          <p>No transactions found.</p>
          <p className="text-secondary" style={{ fontSize: '0.875rem' }}>Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="txn-groups">
          {grouped.map((g) => (
            <div key={g.label} className="txn-group">
              <p className="txn-group-date label">{g.label}</p>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {g.items.map((t) => (
                  <TxnRow key={t.id} txn={t} onClick={() => setSelectedTxnId(t.id)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter Modal */}
      <Modal isOpen={showFilters} onClose={() => setShowFilters(false)} title="Filter">
        <div className="filter-form">
          <div className="form-group">
            <label className="form-label">Type</label>
            <div className="filter-chips-row">
              {['income', 'expense', 'transfer'].map((t) => (
                <button
                  key={t}
                  className={`chip chip-${t} filter-chip-btn${filter.type === t ? ' selected' : ''}`}
                  onClick={() => updateFilter({ type: filter.type === t ? undefined : t as any })}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="filter-source">Account</label>
            <select
              id="filter-source"
              className="form-select"
              value={filter.sourceId || ''}
              onChange={(e) => updateFilter({ sourceId: e.target.value || undefined })}
            >
              <option value="">All accounts</option>
              {sources.filter((s) => s.isActive).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="filter-category">Category</label>
            <select
              id="filter-category"
              className="form-select"
              value={filter.categoryId || ''}
              onChange={(e) => updateFilter({ categoryId: e.target.value || undefined })}
            >
              <option value="">All categories</option>
              {categories.filter((c) => c.isActive).map((c) => (
                <option key={c.id} value={c.id}>{c.head}{c.subHead ? ` · ${c.subHead}` : ''}</option>
              ))}
            </select>
          </div>

          <button className="btn btn-primary btn-full" onClick={() => setShowFilters(false)}>
            Apply Filters
          </button>
          <button
            className="btn btn-ghost btn-full"
            onClick={() => { setFilter({ month: toMonthKey(new Date()) }); setShowFilters(false); }}
          >
            Reset All
          </button>
        </div>
      </Modal>

      {/* Transaction Detail Modal */}
      {selectedTxn && (
        <Modal isOpen={!!selectedTxnId} onClose={() => setSelectedTxnId(null)} title="Transaction">
          <div className="txn-detail">
            <div className={`txn-detail-amount mono text-${selectedTxn.type}`}>
              {selectedTxn.type === 'income' ? '+' : selectedTxn.type === 'expense' ? '−' : ''}
              {settings.currencySymbol}{selectedTxn.amount.toFixed(2)}
            </div>
            <div className="txn-detail-rows">
              <Row label="Type" value={selectedTxn.type} />
              <Row label="Date" value={new Date(selectedTxn.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} />
              <Row label="Account" value={sources.find((s) => s.id === selectedTxn.sourceId)?.name || '—'} />
              {selectedTxn.toSourceId && (
                <Row label="To Account" value={sources.find((s) => s.id === selectedTxn.toSourceId)?.name || '—'} />
              )}
              {selectedTxn.categoryId && (
                <Row
                  label="Category"
                  value={(() => {
                    const c = categories.find((c) => c.id === selectedTxn.categoryId);
                    return c ? `${c.head}${c.subHead ? ' · ' + c.subHead : ''}` : '—';
                  })()}
                />
              )}
              {selectedTxn.note && <Row label="Note" value={selectedTxn.note} />}
            </div>
            <button
              className="btn btn-danger btn-full"
              onClick={() => { deleteTransaction(selectedTxn.id); setSelectedTxnId(null); }}
            >
              Delete Transaction
            </button>
          </div>
        </Modal>
      )}
    </PageShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="txn-detail-row">
      <span className="label">{label}</span>
      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}
