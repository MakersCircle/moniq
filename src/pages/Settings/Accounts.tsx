import { useState } from 'react';
import { Info, Plus, Pencil, Archive, Trash2, Landmark, Wallet, IndianRupee, PieChart, Bookmark, CreditCard } from 'lucide-react';
import { useDataStore } from '../../store/dataStore';
import type { Account, AccountType } from '../../types';

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
import { Checkbox } from '@/components/ui/checkbox';
import SettingsLayout from '@/components/Layout/SettingsLayout';

const ACCOUNT_CLASSES: AccountType[] = ['Asset', 'Liability'];

interface AccountForm {
  name: string;
  type: AccountType;
  description: string;
  initialBalance: string;
  isSavings: boolean;
  excludeFromNet: boolean;
}

const emptyForm: AccountForm = {
  name: '',
  type: 'Asset',
  description: '',
  initialBalance: '0',
  isSavings: false,
  excludeFromNet: false
};

export default function Accounts() {
  const { accounts, settings, addAccount, updateAccount, archiveAccount, deleteAccount } = useDataStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState<AccountForm>(emptyForm);
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState<Record<string, string>>({});

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (a: Account) => {
    setEditing(a);
    setForm({
      name: a.name,
      type: a.type,
      description: a.description || '',
      initialBalance: String(a.initialBalance),
      isSavings: a.isSavings,
      excludeFromNet: !!a.excludeFromNet
    });
    setError('');
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      setError('Display Name is required.');
      return;
    }
    if (form.initialBalance === '') {
      setError('Opening Balance is required. Enter 0 if none.');
      return;
    }
    setError('');
    const data = {
      name: form.name.trim(),
      type: form.type,
      description: form.description.trim() || undefined,
      initialBalance: parseFloat(form.initialBalance) || 0,
      isSavings: form.isSavings,
      excludeFromNet: form.excludeFromNet,
      isActive: true,
    };
    if (editing) {
      updateAccount(editing.id, data);
    } else {
      addAccount(data);
    }
    setModalOpen(false);
  };

  const activeAccounts = accounts.filter((s) => s.isActive);
  const archivedAccounts = accounts.filter((s) => !s.isActive);

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <div className="sticky top-0 bg-background/95 backdrop-blur-md z-40 pb-4 pt-2 -mx-1 px-1">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">Accounts</h2>
                <InfoTooltip position="bottom" text="Accounts are the core of Moniq. They represent places where your money lives (like Bank Accounts or Wallets) or money you owe (like Credit Cards or Loans). Every transaction requires an account. You shoudl create an account for each place where your money lives or where you owe money like individual bank accounts, individual credit cards etc." />
              </div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Financial Entities ({activeAccounts.length})</p>
            </div>
            <Button size="sm" onClick={openAdd} className="h-9 gap-2">
              <Plus className="h-4 w-4" /> Add Account
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {activeAccounts.map((a) => {
            const Icon = a.type === 'Asset' ? Landmark : CreditCard;
            return (
              <Card key={a.id} className="group border-border hover:border-primary/30 transition-all shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-center gap-4 p-4">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-accent flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm tracking-tight">{a.name}</p>
                        {a.isSavings && <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-black uppercase tracking-widest">Savings</span>}
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{a.type}{a.description ? ` • ${a.description}` : ''}</p>
                    </div>
                    <div className="text-right pr-2">
                      <p className="text-xs font-bold mono">{settings.currencySymbol}{a.initialBalance.toLocaleString()}</p>
                      <p className="text-[9px] text-muted-foreground font-medium uppercase">Opening</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-10 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10" onClick={() => archiveAccount(a.id)}>
                        <Archive className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {archivedAccounts.length > 0 && (
          <div className="pt-8 space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 px-1">Archived Accounts</h4>
            <div className="grid grid-cols-1 gap-2">
              {archivedAccounts.map((a) => (
                <div key={a.id}>
                  <div className="flex items-center justify-between p-3 px-4 rounded-lg bg-accent/20 border border-transparent opacity-60">
                    <span className="text-xs font-bold text-muted-foreground">{a.name}</span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-wider" onClick={() => { setDeleteError(prev => { const n = {...prev}; delete n[a.id]; return n; }); updateAccount(a.id, { isActive: true }); }}>
                        Restore
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-wider text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => {
                        const result = deleteAccount(a.id);
                        if (!result.success) setDeleteError(prev => ({ ...prev, [a.id]: result.reason || 'Cannot delete.' }));
                        else setDeleteError(prev => { const n = {...prev}; delete n[a.id]; return n; });
                      }}>
                        <Trash2 className="h-3 w-3 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                  {deleteError[a.id] && (
                    <p className="text-[10px] font-medium text-destructive mt-1 ml-4">{deleteError[a.id]}</p>
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
            <DialogTitle className="text-xl font-bold tracking-tight">{editing ? 'Edit Account' : 'New Account'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center">
                Display Name
                <InfoTooltip text="The name of your account (e.g., Main Checking, Cash Wallet). Used to identify it in transactions." />
              </Label>
              <Input
                placeholder="e.g., Bank Account, Cash Wallet, Credit Card"
                value={form.name}
                onChange={(e) => { setForm({ ...form, name: e.target.value }); setError(''); }}
                className="h-10 border-border/50 focus:border-primary/30"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center">
                Class
                <InfoTooltip text="Asset: Money you own. Liability: Money you owe." />
              </Label>
              <Select
                value={form.type}
                onValueChange={(val) => setForm({ ...form, type: val as AccountType })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_CLASSES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center">
                Description
                <InfoTooltip text="An optional note. Used only for your own identification. Not used for any calculation." />
              </Label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="flex min-h-[80px] w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start space-x-2 border rounded-lg p-3 border-border/50">
                <Checkbox
                  id="isSavings"
                  checked={form.isSavings}
                  onCheckedChange={(val: boolean | 'indeterminate') => setForm({ ...form, isSavings: !!val })}
                  className="mt-0.5"
                />
                <div className="flex flex-col">
                  <label htmlFor="isSavings" className="text-xs font-bold cursor-pointer flex items-center">
                    Savings Account
                    <InfoTooltip text="Mark this if this is your dedicated savings account." />
                  </label>
                </div>
              </div>
              <div className="flex items-start space-x-2 border rounded-lg p-3 border-border/50">
                <Checkbox
                  id="excludeFromNet"
                  checked={form.excludeFromNet}
                  onCheckedChange={(val: boolean | 'indeterminate') => setForm({ ...form, excludeFromNet: !!val })}
                  className="mt-0.5"
                />
                <div className="flex flex-col">
                  <label htmlFor="excludeFromNet" className="text-xs font-bold cursor-pointer text-muted-foreground flex items-center whitespace-nowrap">
                    Exclude Net Worth
                    <InfoTooltip text="Exclude this balance from your total Net Worth calculation." />
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center">
                Opening Balance
                <InfoTooltip text="The balance this account had when you started tracking in Moniq." />
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">{settings.currencySymbol}</span>
                <Input
                  type="number"
                  value={form.initialBalance}
                  onChange={(e) => { setForm({ ...form, initialBalance: e.target.value }); setError(''); }}
                  className="h-12 pl-8 border-border/50 focus:border-primary/30 text-lg font-bold mono"
                  inputMode="decimal"
                  step="any"
                />
              </div>
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
              {editing ? 'Update Account' : 'Create Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsLayout>
  );
}
