import { useState } from 'react';
import { Plus, Pencil, Archive, Check, X } from 'lucide-react';
import PageShell from '../../components/PageShell';
import Modal from '../../components/Modal';
import { useDataStore } from '../../store/dataStore';
import type { Source, SourceType } from '../../types';

const SOURCE_TYPES: SourceType[] = ['Bank', 'Wallet', 'Cash', 'Investment', 'Receivable', 'Payable', 'Custom'];

interface SourceForm {
  name: string;
  type: SourceType;
  initialBalance: string;
  currency: string;
}

const emptyForm: SourceForm = { name: '', type: 'Bank', initialBalance: '0', currency: 'INR' };

export default function Sources() {
  const { sources, settings, addSource, updateSource, archiveSource } = useDataStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Source | null>(null);
  const [form, setForm] = useState<SourceForm>(emptyForm);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, currency: settings.currency });
    setModalOpen(true);
  };

  const openEdit = (s: Source) => {
    setEditing(s);
    setForm({ name: s.name, type: s.type, initialBalance: String(s.initialBalance), currency: s.currency });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const data = {
      name: form.name.trim(),
      type: form.type,
      initialBalance: parseFloat(form.initialBalance) || 0,
      currency: form.currency || 'INR',
      isActive: true,
    };
    if (editing) {
      updateSource(editing.id, data);
    } else {
      addSource(data);
    }
    setModalOpen(false);
  };

  const activeSources   = sources.filter((s) => s.isActive);
  const archivedSources = sources.filter((s) => !s.isActive);

  return (
    <PageShell
      title="Accounts"
      subtitle="Where your money lives"
      headerRight={
        <button className="btn btn-primary btn-sm" onClick={openAdd} id="add-source-btn">
          <Plus size={15} /> Add
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {activeSources.map((s) => (
          <div key={s.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 600, fontSize: '0.9375rem' }} className="truncate">{s.name}</p>
              <p className="label" style={{ marginTop: 2 }}>{s.type} · {s.currency}</p>
            </div>
            <p className="mono" style={{ fontWeight: 600, flexShrink: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Opening: {settings.currencySymbol}{s.initialBalance.toFixed(2)}
            </p>
            <button className="btn btn-ghost btn-icon" onClick={() => openEdit(s)} aria-label={`Edit ${s.name}`}>
              <Pencil size={15} />
            </button>
            <button className="btn btn-ghost btn-icon" onClick={() => archiveSource(s.id)} aria-label={`Archive ${s.name}`}>
              <Archive size={15} />
            </button>
          </div>
        ))}
      </div>

      {archivedSources.length > 0 && (
        <div>
          <p className="label" style={{ marginBottom: 8 }}>Archived</p>
          {archivedSources.map((s) => (
            <div key={s.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: 0.5 }}>
              <span style={{ flex: 1 }}>{s.name}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => updateSource(s.id, { isActive: true })}>
                Restore
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Account' : 'Add Account'}>
        <div className="form-group">
          <label className="form-label" htmlFor="src-name">Name</label>
          <input id="src-name" className="form-input" placeholder="e.g., SBI Savings" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="src-type">Type</label>
          <select id="src-type" className="form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as SourceType })}>
            {SOURCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="src-balance">Opening Balance</label>
          <input id="src-balance" type="number" className="form-input" value={form.initialBalance} onChange={(e) => setForm({ ...form, initialBalance: e.target.value })} inputMode="decimal" />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="src-currency">Currency</label>
          <input id="src-currency" className="form-input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} placeholder="INR" />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-full" onClick={handleSave}><Check size={16} /> Save</button>
          <button className="btn btn-secondary" onClick={() => setModalOpen(false)}><X size={16} /></button>
        </div>
      </Modal>
    </PageShell>
  );
}
