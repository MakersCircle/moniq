import { useState } from 'react';
import { Plus, Pencil, Archive, Check, X } from 'lucide-react';
import PageShell from '../../components/PageShell';
import { useDataStore } from '../../store/dataStore';
import type { PaymentMethod } from '../../types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
      hasBack

      headerRight={
        <Button size="sm" onClick={openAdd} id="add-method-btn">
          <Plus className="mr-2 h-4 w-4" /> Add
        </Button>
      }
    >
      <div className="flex flex-col gap-2">
        {active.map((m) => (
          <Card key={m.id} className="flex items-center gap-3 p-4">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[0.9375rem]">{m.name}</p>
              {m.linkedSourceId && (
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-0.5">
                  → {sources.find((s) => s.id === m.linkedSourceId)?.name || '?'}
                </p>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => archiveMethod(m.id)}>
              <Archive className="h-4 w-4" />
            </Button>
          </Card>
        ))}
      </div>

      {archived.length > 0 && (
        <div className="mt-8">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3 px-1">Archived</p>
          <div className="flex flex-col gap-2">
            {archived.map((m) => (
              <Card key={m.id} className="flex items-center gap-3 p-4 opacity-50">
                <span className="flex-1 text-[0.9375rem]">{m.name}</span>
                <Button variant="ghost" size="sm" onClick={() => updateMethod(m.id, { isActive: true })}>
                  Restore
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Method' : 'Add Method'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="met-name">Name</Label>
              <Input 
                id="met-name" 
                placeholder="e.g., UPI, Cash" 
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })} 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="met-src">Default Account (optional)</Label>
              <Select 
                value={form.linkedSourceId} 
                onValueChange={(val) => setForm({ ...form, linkedSourceId: val })}
              >
                <SelectTrigger id="met-src">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {sources.filter((s) => s.isActive).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Check className="mr-2 h-4 w-4" /> Save Method
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

