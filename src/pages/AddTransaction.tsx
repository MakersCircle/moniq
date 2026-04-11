import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Check, ChevronDown } from 'lucide-react';
import PageShell from '../components/PageShell';
import Modal from '../components/Modal';
import { useDataStore } from '../store/dataStore';
import type { TransactionType } from '../types';
import './AddTransaction.css';

interface SplitLine {
  categoryId: string;
  amount: string;
  note: string;
}

const today = new Date().toISOString().slice(0, 10);

export default function AddTransaction() {
  const navigate = useNavigate();
  const { sources, methods, categories, settings, addTransaction, addTransactionGroup } = useDataStore();

  // ── Form state ───
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [sourceId, setSourceId] = useState(sources.find((s) => s.isActive)?.id || '');
  const [toSourceId, setToSourceId] = useState('');
  const [methodId, setMethodId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');

  // Split
  const [isSplit, setIsSplit] = useState(false);
  const [splits, setSplits] = useState<SplitLine[]>([
    { categoryId: '', amount: '', note: '' },
    { categoryId: '', amount: '', note: '' },
  ]);

  // Modals
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [splitPickerIdx, setSplitPickerIdx] = useState<number | null>(null);

  const amountRef = useRef<HTMLInputElement>(null);

  // ── Helpers ─────
  const activeSources = sources.filter((s) => s.isActive);
  const activeMethods = methods.filter((m) => m.isActive);
  const activeCategories = categories.filter((c) => c.isActive);

  const getCatLabel = (id: string) => {
    const c = activeCategories.find((c) => c.id === id);
    return c ? `${c.head}${c.subHead ? ' · ' + c.subHead : ''}` : 'Select category';
  };



  const totalSplitAmount = splits.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
  const parsedAmount = parseFloat(amount) || 0;
  const remainingForSplits = parsedAmount - totalSplitAmount;

  // ── Submit ───────
  const handleSubmit = () => {
    if (!parsedAmount || parsedAmount <= 0) return;
    if (!sourceId) return;
    if (type !== 'transfer' && !isSplit && !categoryId) return;
    if (type === 'transfer' && !toSourceId) return;
    if (isSplit && splits.some((s) => !s.categoryId || !parseFloat(s.amount))) return;

    if (!isSplit || type !== 'expense') {
      addTransaction({
        date,
        type,
        amount: parsedAmount,
        sourceId,
        toSourceId: type === 'transfer' ? toSourceId : undefined,
        methodId: methodId || undefined,
        categoryId: type !== 'transfer' ? categoryId || undefined : undefined,
        note,
        tags: [],
      });
    } else {
      addTransactionGroup(
        splits.filter((s) => s.categoryId && parseFloat(s.amount)).map((s) => ({
          date,
          type: 'expense' as TransactionType,
          amount: parseFloat(s.amount),
          sourceId,
          methodId: methodId || undefined,
          categoryId: s.categoryId,
          note: s.note || note,
          tags: [],
        }))
      );
    }
    navigate('/');
  };

  // ── Split helpers ─
  const updateSplit = (idx: number, patch: Partial<SplitLine>) => {
    setSplits((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const addSplitLine = () => setSplits((prev) => [...prev, { categoryId: '', amount: '', note: '' }]);
  const removeSplitLine = (idx: number) => setSplits((prev) => prev.filter((_, i) => i !== idx));

  // Category groups
  const catGroups = activeCategories.reduce<Record<string, typeof activeCategories>>((acc, c) => {
    const key = c.group;
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  return (
    <PageShell title="Add Transaction">
      <div className="add-txn">
        {/* Type tabs */}
        <div className="type-tabs" role="tablist">
          {(['expense', 'income', 'transfer'] as TransactionType[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={type === t}
              className={`type-tab${type === t ? ` active-${t}` : ''}`}
              onClick={() => { setType(t); setIsSplit(false); }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Amount */}
        <div className="add-amount-wrap card">
          <div className="amount-input-wrap">
            <span className="amount-currency">{settings.currencySymbol}</span>
            <input
              ref={amountRef}
              type="number"
              className="amount-input"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              min="0"
              step="0.01"
              id="txn-amount"
              aria-label="Transaction amount"
            />
          </div>
          {isSplit && (
            <div className={`split-remainder ${Math.abs(remainingForSplits) < 0.01 ? 'ok' : 'warn'}`}>
              {Math.abs(remainingForSplits) < 0.01
                ? '✓ Splits match total'
                : `Remaining to split: ${settings.currencySymbol}${remainingForSplits.toFixed(2)}`}
            </div>
          )}
        </div>

        {/* Date */}
        <div className="form-group">
          <label className="form-label" htmlFor="txn-date">Date</label>
          <input
            id="txn-date"
            type="date"
            className="form-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {/* Source */}
        <div className="form-group">
          <label className="form-label" htmlFor="txn-source">
            {type === 'transfer' ? 'From Account' : 'Account'}
          </label>
          <div className="select-wrap">
            <select
              id="txn-source"
              className="form-select"
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
            >
              <option value="">Select account...</option>
              {activeSources.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <ChevronDown size={16} className="select-icon" />
          </div>
        </div>

        {/* To Source (Transfer only) */}
        {type === 'transfer' && (
          <div className="form-group">
            <label className="form-label" htmlFor="txn-to-source">To Account</label>
            <div className="select-wrap">
              <select
                id="txn-to-source"
                className="form-select"
                value={toSourceId}
                onChange={(e) => setToSourceId(e.target.value)}
              >
                <option value="">Select account...</option>
                {activeSources.filter((s) => s.id !== sourceId).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <ChevronDown size={16} className="select-icon" />
            </div>
          </div>
        )}

        {/* Payment Method */}
        <div className="form-group">
          <label className="form-label" htmlFor="txn-method">Payment Method</label>
          <div className="select-wrap">
            <select
              id="txn-method"
              className="form-select"
              value={methodId}
              onChange={(e) => setMethodId(e.target.value)}
            >
              <option value="">Select method... (optional)</option>
              {activeMethods.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <ChevronDown size={16} className="select-icon" />
          </div>
        </div>

        {/* Category (non-transfer) */}
        {type !== 'transfer' && !isSplit && (
          <div className="form-group">
            <label className="form-label">Category</label>
            <button
              type="button"
              className="form-input cat-button"
              onClick={() => setShowCatPicker(true)}
            >
              <span className={categoryId ? 'text-primary' : 'text-muted'}>
                {getCatLabel(categoryId)}
              </span>
              <ChevronDown size={16} />
            </button>
          </div>
        )}

        {/* Split Section */}
        {type === 'expense' && (
          <div className="split-toggle-row">
            <span className="form-label">Split into multiple categories</span>
            <button
              type="button"
              className={`toggle-btn${isSplit ? ' active' : ''}`}
              onClick={() => setIsSplit((v) => !v)}
              aria-pressed={isSplit}
            >
              <span className="toggle-thumb" />
            </button>
          </div>
        )}

        {isSplit && type === 'expense' && (
          <div className="split-lines">
            {splits.map((s, idx) => (
              <div key={idx} className="split-line card">
                <div className="split-line-top">
                  <button
                    type="button"
                    className="form-input cat-button split-cat-btn"
                    onClick={() => { setSplitPickerIdx(idx); setShowCatPicker(true); }}
                  >
                    <span className={s.categoryId ? 'text-primary' : 'text-muted'}>
                      {getCatLabel(s.categoryId)}
                    </span>
                    <ChevronDown size={14} />
                  </button>
                  <input
                    type="number"
                    className="form-input split-amount-input"
                    placeholder="Amount"
                    value={s.amount}
                    onChange={(e) => updateSplit(idx, { amount: e.target.value })}
                    inputMode="decimal"
                    min="0"
                    aria-label={`Split amount ${idx + 1}`}
                  />
                  {splits.length > 2 && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon"
                      onClick={() => removeSplitLine(idx)}
                      aria-label="Remove split"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Note for this split (optional)"
                  value={s.note}
                  onChange={(e) => updateSplit(idx, { note: e.target.value })}
                />
              </div>
            ))}
            <button type="button" className="btn btn-secondary" onClick={addSplitLine}>
              <Plus size={15} /> Add split
            </button>
          </div>
        )}

        {/* Note */}
        <div className="form-group">
          <label className="form-label" htmlFor="txn-note">Note</label>
          <input
            id="txn-note"
            type="text"
            className="form-input"
            placeholder="What was this for?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {/* Submit */}
        <button
          type="button"
          className="btn btn-primary btn-full btn-lg"
          onClick={handleSubmit}
          id="submit-transaction"
        >
          <Check size={20} /> Save Transaction
        </button>
      </div>

      {/* Category Picker Modal */}
      <Modal
        isOpen={showCatPicker}
        onClose={() => { setShowCatPicker(false); setSplitPickerIdx(null); }}
        title="Select Category"
        size="md"
      >
        <div className="cat-picker">
          {Object.entries(catGroups).map(([group, cats]) => (
            <div key={group} className="cat-group">
              <p className="label cat-group-label">{group}</p>
              <div className="cat-list">
                {cats.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="cat-option"
                    onClick={() => {
                      if (splitPickerIdx !== null) {
                        updateSplit(splitPickerIdx, { categoryId: c.id });
                      } else {
                        setCategoryId(c.id);
                      }
                      setShowCatPicker(false);
                      setSplitPickerIdx(null);
                    }}
                  >
                    {c.head}{c.subHead && <span className="text-secondary"> · {c.subHead}</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </PageShell>
  );
}

