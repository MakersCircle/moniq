import { useState } from 'react';
import { Plus, Pencil, Archive, Check, X } from 'lucide-react';
import PageShell from '../../components/PageShell';
import Modal from '../../components/Modal';
import { useDataStore } from '../../store/dataStore';
import type { PaymentMethod } from '../../types';

export default function Methods() {
  const { methods, sources, addMethod, updateMethod, archiveMethod } = useDataStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [form, setForm] = useState({ name: '', linkedSourceId: '' });

  const openAdd = () => { setEditing(null); setForm({ name: '', linkedSourceId: '' }); setModalOpen(true); };
  const openEdit = (m: PaymentMethod) => { setEditing(m); setForm({ name: m.name, linkedSourceId: m.linkedSourceId || '' }); setModalOpen(true); };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const data = { name: form.name.trim(), linkedSourceId: form.linkedSourceId || undefined, isActive: true };
    if (editing) updateMethod(editing.id, data);
    else addMethod(data);
    setModalOpen(false);
  };

  const active   = methods.filter((m) => m.isActive);
  const archived = methods.filter((m) => !m.isActive);

  return (
    <PageShell
      title="Payment Methods"
      subtitle="How money moves"
      headerRight={<button className="btn btn-primary btn-sm" onClick={openAdd} id="add-method-btn"><Plus size={15} /> Add</button>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {active.map((m) => (
          <div key={m.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{m.name}</p>
              {m.linkedSourceId && (
                <p className="label" style={{ marginTop: 2 }}>
                  → {sources.find((s) => s.id === m.linkedSourceId)?.name || '?'}
                </p>
              )}
            </div>
            <button className="btn btn-ghost btn-icon" onClick={() => openEdit(m)}><Pencil size={15} /></button>
            <button className="btn btn-ghost btn-icon" onClick={() => archiveMethod(m.id)}><Archive size={15} /></button>
          </div>
        ))}
      </div>

      {archived.length > 0 && (
        <div>
          <p className="label" style={{ marginBottom: 8 }}>Archived</p>
          {archived.map((m) => (
            <div key={m.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: 0.5 }}>
              <span style={{ flex: 1 }}>{m.name}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => updateMethod(m.id, { isActive: true })}>Restore</button>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Method' : 'Add Method'}>
        <div className="form-group">
          <label className="form-label" htmlFor="met-name">Name</label>
          <input id="met-name" className="form-input" placeholder="e.g., UPI, Cash" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="met-src">Default Account (optional)</label>
          <select id="met-src" className="form-select" value={form.linkedSourceId} onChange={(e) => setForm({ ...form, linkedSourceId: e.target.value })}>
            <option value="">None</option>
            {sources.filter((s) => s.isActive).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-full" onClick={handleSave}><Check size={16} /> Save</button>
          <button className="btn btn-secondary" onClick={() => setModalOpen(false)}><X size={16} /></button>
        </div>
      </Modal>
    </PageShell>
  );
}
