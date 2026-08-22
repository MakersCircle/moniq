import { useState } from 'react';
import { Plus, Pencil, Archive, Trash2, Landmark, CreditCard } from 'lucide-react';
import { useDataStore } from '@/store/dataStore';
import { AccountForm, type AccountFormData } from '@/components/Forms/AccountForm';
import type { Account } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';

import { InfoTooltip } from '@/components/ui/info-tooltip';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import SettingsLayout from '@/components/Layout/SettingsLayout';

export default function Accounts() {
  const { accounts, settings, addAccount, updateAccount, archiveAccount, deleteAccount } =
    useDataStore();
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [deleteError, setDeleteError] = useState<Record<string, string>>({});

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (a: Account) => {
    setEditing(a);
    setModalOpen(true);
  };

  const handleSave = (data: AccountFormData) => {
    const payload = {
      name: data.name,
      type: data.type,
      description: data.description || undefined,
      initialBalance: data.initialBalance,
      isSavings: data.isSavings,
      excludeFromNet: data.excludeFromNet,
      isActive: true,
    };
    if (editing) {
      updateAccount(editing.id, payload);
    } else {
      addAccount(payload, data.methodName);
    }
    setModalOpen(false);
  };

  const activeAccounts = accounts.filter(s => s.isActive && !s.isDeleted);
  const archivedAccounts = accounts.filter(s => !s.isActive && !s.isDeleted);

  return (
    <SettingsLayout>
      <div id="tour-target-accounts-page" className="space-y-6">
        <div className="sticky top-0 bg-background/95 backdrop-blur-md z-40 pb-4 pt-2 -mx-1 px-1">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">Accounts</h2>
                <InfoTooltip
                  position="bottom"
                  text="Accounts are the core of Moniq. They represent places where your money lives (like Bank Accounts or Wallets) or money you owe (like Credit Cards or Loans). Every transaction requires an account. You shoudl create an account for each place where your money lives or where you owe money like individual bank accounts, individual credit cards etc."
                />
              </div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Financial Entities ({activeAccounts.length})
              </p>
            </div>
            <Button size="sm" onClick={openAdd} className="h-9 gap-2">
              <Plus className="h-4 w-4" /> Add Account
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {activeAccounts.map(a => {
            const Icon = a.type === 'Asset' ? Landmark : CreditCard;
            return (
              <Card
                key={a.id}
                className="group border-border hover:border-primary/30 transition-all shadow-sm overflow-hidden"
              >
                <CardContent className="p-0">
                  <div className="flex items-center gap-4 p-4">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-accent flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm tracking-tight">{a.name}</p>
                        {a.isSavings && (
                          <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-black uppercase tracking-widest">
                            Savings
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                        {a.type}
                        {a.description ? ` • ${a.description}` : ''}
                      </p>
                    </div>
                    <div className="text-right pr-2">
                      <p className="text-xs font-bold mono">
                        {settings.currencySymbol}
                        {a.initialBalance.toLocaleString()}
                      </p>
                      <p className="text-[9px] text-muted-foreground font-medium uppercase">
                        Opening
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-10 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(a)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                        onClick={() => archiveAccount(a.id)}
                      >
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
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 px-1">
              Archived Accounts
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {archivedAccounts.map(a => (
                <div key={a.id}>
                  <div className="flex items-center justify-between p-3 px-4 rounded-lg bg-accent/20 border border-transparent opacity-60">
                    <span className="text-xs font-bold text-muted-foreground">{a.name}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[10px] font-bold uppercase tracking-wider"
                        onClick={() => {
                          setDeleteError(prev => {
                            const n = { ...prev };
                            delete n[a.id];
                            return n;
                          });
                          updateAccount(a.id, { isActive: true });
                        }}
                      >
                        {t('common.restore')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[10px] font-bold uppercase tracking-wider text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          const result = deleteAccount(a.id);
                          if (!result.success)
                            setDeleteError(prev => ({
                              ...prev,
                              [a.id]: result.reason || 'Cannot delete.',
                            }));
                          else
                            setDeleteError(prev => {
                              const n = { ...prev };
                              delete n[a.id];
                              return n;
                            });
                        }}
                      >
                        <Trash2 className="h-3 w-3 mr-1" /> {t('common.delete')}
                      </Button>
                    </div>
                  </div>
                  {deleteError[a.id] && (
                    <p className="text-[10px] font-medium text-destructive mt-1 ml-4">
                      {deleteError[a.id]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md p-0">
          <DialogHeader className="px-6 py-4 border-b border-border/50 shrink-0 space-y-1">
            <DialogTitle className="text-xl font-bold tracking-tight">
              {editing ? 'Edit Account' : 'New Account'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editing ? t('account.editDescription') : t('account.createDescription')}
            </DialogDescription>
          </DialogHeader>

          {modalOpen && (
            <AccountForm
              initialData={
                editing
                  ? {
                      name: editing.name,
                      type: editing.type,
                      description: editing.description,
                      initialBalance: editing.initialBalance,
                      isSavings: editing.isSavings,
                      excludeFromNet: editing.excludeFromNet,
                      isActive: editing.isActive,
                    }
                  : undefined
              }
              onSave={handleSave}
              onCancel={() => setModalOpen(false)}
              submitLabel={editing ? t('common.saveChanges') : t('account.createAccount')}
            />
          )}
        </DialogContent>
      </Dialog>
    </SettingsLayout>
  );
}
