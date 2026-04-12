import { useState } from 'react';
import { Plus, Pencil, Archive, Check, X } from 'lucide-react';
import PageShell from '../../components/PageShell';
import { useDataStore } from '../../store/dataStore';
import type { Source, SourceType } from '../../types';

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
      hasBack

      headerRight={
        <Button size="sm" onClick={openAdd} id="add-source-btn">
          <Plus className="mr-2 h-4 w-4" /> Add
        </Button>
      }
    >
      <div className="flex flex-col gap-2">
        {activeSources.map((s) => (
          <Card key={s.id} className="flex items-center gap-3 p-4">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[0.9375rem] truncate">{s.name}</p>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-0.5">
                {s.type} · {s.currency}
              </p>
            </div>
            <p className="mono font-semibold text-sm text-muted-foreground shrink-0">
              Opening: {settings.currencySymbol}{s.initialBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <Button variant="ghost" size="icon" onClick={() => openEdit(s)} aria-label={`Edit ${s.name}`}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => archiveSource(s.id)} aria-label={`Archive ${s.name}`}>
              <Archive className="h-4 w-4" />
            </Button>
          </Card>
        ))}
      </div>

      {archivedSources.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Archived</p>
          {archivedSources.map((s) => (
            <Card key={s.id} className="flex items-center gap-3 p-4 opacity-50">
              <span className="flex-1">{s.name}</span>
              <Button variant="ghost" size="sm" onClick={() => updateSource(s.id, { isActive: true })}>
                Restore
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Account' : 'Add Account'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="src-name">Name</Label>
              <Input 
                id="src-name" 
                placeholder="e.g., SBI Savings" 
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })} 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="src-type">Type</Label>
              <Select 
                value={form.type} 
                onValueChange={(val) => setForm({ ...form, type: val as SourceType })}
              >
                <SelectTrigger id="src-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="src-balance">Opening Balance</Label>
              <Input 
                id="src-balance" 
                type="number" 
                value={form.initialBalance} 
                onChange={(e) => setForm({ ...form, initialBalance: e.target.value })} 
                inputMode="decimal" 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="src-currency">Currency</Label>
              <Input 
                id="src-currency" 
                value={form.currency} 
                onChange={(e) => setForm({ ...form, currency: e.target.value })} 
                placeholder="INR" 
              />
            </div>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Check className="mr-2 h-4 w-4" /> Save Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

