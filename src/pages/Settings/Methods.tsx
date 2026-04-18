import { useState } from 'react';
import { Info, Plus, Pencil, Archive, Trash2, CreditCard, ArrowRight } from 'lucide-react';
import { useDataStore } from '@/store/dataStore';
import type { PaymentMethod } from '@/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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
import SettingsLayout from '@/components/Layout/SettingsLayout';

function InfoTooltip({ text, position = 'top' }: { text: string; position?: 'top' | 'bottom' }) {
  return (
    <div className="group relative inline-flex items-center justify-center">
      <Info className="h-3.5 w-3.5 text-muted-foreground ml-1.5 flex-shrink-0 cursor-help transition-colors hover:text-foreground" />
      <div className={`pointer-events-none absolute left-1/2 z-50 w-48 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100 ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
        <div className="rounded-md bg-popover px-3 py-2 text-[10px] font-medium leading-tight text-popover-foreground shadow-md border border-border">
          {text}
        </div>
      </div>
    </div>
  );
}

export default function Methods() {
  const { methods, accounts, addMethod, updateMethod, archiveMethod, deleteMethod } = useDataStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [form, setForm] = useState({ name: '', linkedAccountId: '' });
  const [deleteError, setDeleteError] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const openAdd = () => { setEditing(null); setForm({ name: '', linkedAccountId: '' }); setError(''); setModalOpen(true); };
  const openEdit = (m: PaymentMethod) => { setEditing(m); setForm({ name: m.name, linkedAccountId: m.linkedAccountId || '' }); setError(''); setModalOpen(true); };

  const handleSave = () => {
    if (!form.name.trim()) {
      setError('Display Name is required.');
      return;
    }
    if (!form.linkedAccountId) {
      setError('A linked account is required.');
      return;
    }
    setError('');
    const data = { name: form.name.trim(), linkedAccountId: form.linkedAccountId, isActive: true };
    if (editing) updateMethod(editing.id, data);
    else addMethod(data);
    setModalOpen(false);
  };

  const active   = methods.filter((m) => m.isActive);
  const archived = methods.filter((m) => !m.isActive);

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <div className="sticky top-0 bg-background/95 backdrop-blur-md z-40 pb-4 pt-2 -mx-1 px-1">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">Payment Methods</h2>
                <InfoTooltip position="bottom" text="Payment Methods represent how you pay — like UPI, Credit Card, or Cash. When you add a transaction, selecting a method auto-fills the linked account. A default method is created automatically for every new account." />
              </div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active Methods ({active.length})</p>
            </div>
            <Button size="sm" onClick={openAdd} className="h-9 gap-2">
              <Plus className="h-4 w-4" /> Add Method
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {active.map((m) => (
            <Card key={m.id} className="group border-border hover:border-primary/30 transition-all shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 shrink-0 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm tracking-tight truncate">{m.name}</p>
                      {m.linkedAccountId && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <ArrowRight className="h-2 w-2 text-muted-foreground" />
                          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                            {accounts.find((s) => s.id === m.linkedAccountId)?.name || 'Unknown'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(m)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10" onClick={() => archiveMethod(m.id)}>
                      <Archive className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {archived.length > 0 && (
          <div className="pt-8 space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 px-1">Archived Methods</h4>
            <div className="grid grid-cols-1 gap-2">
              {archived.map((m) => (
                <div key={m.id}>
                  <div className="flex items-center justify-between p-3 px-4 rounded-lg bg-accent/20 border border-transparent opacity-60">
                    <span className="text-xs font-bold text-muted-foreground">{m.name}</span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-wider" onClick={() => { setDeleteError(prev => { const n = {...prev}; delete n[m.id]; return n; }); updateMethod(m.id, { isActive: true }); }}>
                        Restore
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-wider text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => {
                        const result = deleteMethod(m.id);
                        if (!result.success) setDeleteError(prev => ({ ...prev, [m.id]: result.reason || 'Cannot delete.' }));
                        else setDeleteError(prev => { const n = {...prev}; delete n[m.id]; return n; });
                      }}>
                        <Trash2 className="h-3 w-3 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                  {deleteError[m.id] && (
                    <p className="text-[10px] font-medium text-destructive mt-1 ml-4">{deleteError[m.id]}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight">{editing ? 'Edit Method' : 'New Method'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center">
                Display Name
                <InfoTooltip text="A recognizable name for this payment method (e.g., UPI, HDFC Debit Card). Used to identify it when adding transactions." />
              </Label>
              <Input 
                placeholder="e.g., UPI, HDFC Card" 
                value={form.name} 
                onChange={(e) => { setForm({ ...form, name: e.target.value }); setError(''); }}
                className="h-10 border-border/50 focus:border-primary/30"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center">
                Linked Account
                <InfoTooltip text="Link this method to an account. When you select this method during a transaction, the linked account will be auto-filled, saving you a step." />
              </Label>
              <Select 
                value={form.linkedAccountId || undefined} 
                onValueChange={(val) => { setForm({ ...form, linkedAccountId: val }); setError(''); }}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.filter((s) => s.isActive).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <p className="text-sm font-medium text-destructive">{error}</p>
            )}
          </div>
          
          <DialogFooter className="pt-4">
            <Button variant="ghost" onClick={() => setModalOpen(false)} className="h-10 px-6 font-bold uppercase text-[10px] tracking-widest">
              Cancel
            </Button>
            <Button onClick={handleSave} className="h-10 px-8 font-bold uppercase text-[10px] tracking-widest">
              {editing ? 'Update Method' : 'Create Method'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsLayout>
  );
}
