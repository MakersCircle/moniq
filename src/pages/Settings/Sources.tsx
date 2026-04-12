import { useState } from 'react';
import { Plus, Pencil, Archive, Check, Bookmark, Landmark, Wallet, IndianRupee, PieChart } from 'lucide-react';
import { useDataStore } from '../../store/dataStore';
import type { Source, SourceType } from '../../types';

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
import { cn } from '@/lib/utils';
import SettingsLayout from '@/components/Layout/SettingsLayout';

const SOURCE_TYPES: SourceType[] = ['Bank', 'Wallet', 'Cash', 'Investment', 'Receivable', 'Payable', 'Custom'];

const TYPE_ICONS: Record<string, any> = {
  Bank: Landmark,
  Wallet: Wallet,
  Cash: IndianRupee,
  Investment: PieChart,
  Custom: Bookmark,
};

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
    <SettingsLayout>
      <div className="space-y-6">
        <div className="sticky top-0 bg-background/95 backdrop-blur-md z-40 pb-4 pt-2 -mx-1 px-1">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Accounts</h2>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active Entities ({activeSources.length})</p>
            </div>
            <Button size="sm" onClick={openAdd} className="h-9 gap-2">
              <Plus className="h-4 w-4" /> Add Account
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {activeSources.map((s) => {
            const Icon = TYPE_ICONS[s.type] || Bookmark;
            return (
              <Card key={s.id} className="group border-border hover:border-primary/30 transition-all shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-center gap-4 p-4">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-accent flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm tracking-tight">{s.name}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{s.type}</p>
                    </div>
                    <div className="text-right pr-2">
                       <p className="text-xs font-bold mono">{settings.currencySymbol}{s.initialBalance.toLocaleString()}</p>
                       <p className="text-[9px] text-muted-foreground font-medium uppercase">Opening</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-10 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10" onClick={() => archiveSource(s.id)}>
                        <Archive className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {archivedSources.length > 0 && (
          <div className="pt-8 space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 px-1">Archived Accounts</h4>
            <div className="grid grid-cols-1 gap-2">
              {archivedSources.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 px-4 rounded-lg bg-accent/20 border border-transparent opacity-60">
                  <span className="text-xs font-bold text-muted-foreground">{s.name}</span>
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-wider" onClick={() => updateSource(s.id, { isActive: true })}>
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight">{editing ? 'Edit Account' : 'New Account'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Display Name</Label>
              <Input 
                placeholder="e.g., SBI Savings" 
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })} 
                className="h-10 border-border/50 focus:border-primary/30"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Account Type</Label>
                <Select 
                  value={form.type} 
                  onValueChange={(val) => setForm({ ...form, type: val as SourceType })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Currency</Label>
                <Input 
                  value={form.currency} 
                  onChange={(e) => setForm({ ...form, currency: e.target.value })} 
                  className="h-10 border-border/50 focus:border-primary/30 font-bold mono"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Opening Balance</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">{settings.currencySymbol}</span>
                <Input 
                  type="number" 
                  value={form.initialBalance} 
                  onChange={(e) => setForm({ ...form, initialBalance: e.target.value })} 
                  className="h-12 pl-8 border-border/50 focus:border-primary/30 text-lg font-bold mono"
                  inputMode="decimal" 
                  step="any"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter className="pt-4">
            <Button variant="ghost" onClick={() => setModalOpen(false)} className="h-10 px-6 font-bold uppercase text-[10px] tracking-widest">
              Cancel
            </Button>
            <Button onClick={handleSave} className="h-10 px-8 font-bold uppercase text-[10px] tracking-widest">
              {editing ? 'Update Account' : 'Create Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsLayout>
  );
}
