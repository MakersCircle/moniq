import { useState } from 'react';
import { Plus, Pencil, Archive, Check, X } from 'lucide-react';
import PageShell from '../../components/PageShell';
import Modal from '../../components/Modal';
import { useDataStore } from '../../store/dataStore';
import type { Category, CategoryGroup } from '../../types';

const GROUPS: CategoryGroup[] = ['Needs', 'Wants', 'Savings', 'Investment', 'Debt', 'Income', 'Custom'];

export default function Categories() {
  const { categories, addCategory, updateCategory, archiveCategory } = useDataStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ group: 'Needs' as CategoryGroup, head: '', subHead: '' });

  const openAdd = () => { setEditing(null); setForm({ group: 'Needs', head: '', subHead: '' }); setModalOpen(true); };
  const openEdit = (c: Category) => { setEditing(c); setForm({ group: c.group, head: c.head, subHead: c.subHead || '' }); setModalOpen(true); };

  const handleSave = () => {
    if (!form.head.trim()) return;
    const data = { group: form.group, head: form.head.trim(), subHead: form.subHead.trim() || undefined, isActive: true };
    if (editing) updateCategory(editing.id, data);
    else addCategory(data);
    setModalOpen(false);
  };

  const active = categories.filter((c) => c.isActive);
  const archived = categories.filter((c) => !c.isActive);

  // Group by category group
  const grouped = GROUPS.reduce<Record<string, Category[]>>((acc, g) => {
    const cats = active.filter((c) => c.group === g);
    if (cats.length) acc[g] = cats;
    return acc;
  }, {});

  return (
    <PageShell
      title="Categories"
      subtitle="Why money moves"
      headerRight={<button className="btn btn-primary btn-sm" onClick={openAdd} id="add-category-btn"><Plus size={15} /> Add</button>}
    >
      {Object.entries(grouped).map(([group, cats]) => (
        <div key={group}>
          <p className="label" style={{ marginBottom: 8, paddingLeft: 4 }}>{group}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {cats.map((c) => (
              <div key={c.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                    {c.head}{c.subHead && <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}> · {c.subHead}</span>}
                  </p>
                </div>
                <button className="btn btn-ghost btn-icon" onClick={() => openEdit(c)}><Pencil size={15} /></button>
                <button className="btn btn-ghost btn-icon" onClick={() => archiveCategory(c.id)}><Archive size={15} /></button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {archived.length > 0 && (
        <div>
          <p className="label" style={{ marginBottom: 8 }}>Archived</p>
          {archived.map((c) => (
            <div key={c.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: 0.5 }}>
              <span style={{ flex: 1 }}>{c.head}{c.subHead ? ` · ${c.subHead}` : ''}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => updateCategory(c.id, { isActive: true })}>Restore</button>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Category' : 'Add Category'}>
        <div className="form-group">
          <label className="form-label" htmlFor="cat-group">Group</label>
          <select id="cat-group" className="form-select" value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value as CategoryGroup })}>
            {GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="cat-head">Head</label>
          <input id="cat-head" className="form-input" placeholder="e.g., Food" value={form.head} onChange={(e) => setForm({ ...form, head: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="cat-subhead">Sub-head (optional)</label>
          <input id="cat-subhead" className="form-input" placeholder="e.g., Groceries" value={form.subHead} onChange={(e) => setForm({ ...form, subHead: e.target.value })} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-full" onClick={handleSave}><Check size={16} /> Save</button>
          <button className="btn btn-secondary" onClick={() => setModalOpen(false)}><X size={16} /></button>
        </div>
      </Modal>
    </PageShell>
  );
}
