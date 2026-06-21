import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDataStore } from '@/store/dataStore';
import defaults from '@/data/defaults.json';
import { Wallet, ArrowRight, Plus, Trash2, Landmark, CreditCard } from 'lucide-react';
import type { Account, AccountType } from '@/types';

interface DraftAccount {
  name: string;
  type: AccountType;
  description: string;
}

export default function AccountsSetupStep() {
  const setTourStepFn = useDataStore(s => s.setTourStep);
  const completeOnboardingFn = useDataStore(s => s.completeOnboarding);

  const [accounts, setAccounts] = useState<DraftAccount[]>(
    (defaults.accounts as { name: string, type: string, description?: string }[]).map(acc => ({
      name: acc.name,
      type: acc.type as AccountType,
      description: acc.description || '',
    }))
  );

  const updateAccount = (index: number, patch: Partial<DraftAccount>) => {
    setAccounts(prev => prev.map((a, i) => i === index ? { ...a, ...patch } : a));
  };

  const addAccount = () => {
    setAccounts(prev => [...prev, { name: '', type: 'Asset', description: '' }]);
  };

  const removeAccount = (index: number) => {
    setAccounts(prev => prev.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    const { addAccount: storeAdd } = useDataStore.getState();
    accounts
      .filter(a => a.name.trim())
      .forEach(acc => {
        storeAdd({
          name: acc.name.trim(),
          type: acc.type,
          description: acc.description || undefined,
          initialBalance: 0,
          isSavings: false,
          isActive: true,
        } as Omit<Account, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>);
      });
    setTimeout(() => setTourStepFn('view_accounts'), 100);
  };

  const handleSkip = () => {
    completeOnboardingFn([], []);
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="max-w-xl overflow-hidden p-0 border-none shadow-2xl [&>button]:hidden">
        {/* Header */}
        <div className="bg-primary/5 p-8 border-b border-border/50">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 shrink-0 mt-0.5">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight mb-1">
                Set Up Your Accounts
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
                Accounts are where your money lives or is owed. You only need a few to get started — add more anytime in Settings.
              </DialogDescription>
            </div>
          </div>

          {/* Asset vs Liability explanation */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-emerald-500/8 border border-emerald-500/20 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Landmark className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Asset</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Money you <b className="text-foreground">own</b> — bank accounts, cash wallets, savings. Increases your net worth.
              </p>
            </div>
            <div className="rounded-lg bg-rose-500/8 border border-rose-500/20 p-3">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="h-3.5 w-3.5 text-rose-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">Liability</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Money you <b className="text-foreground">owe</b> — credit cards, loans. Decreases your net worth.
              </p>
            </div>
          </div>
        </div>

        {/* Account rows */}
        <div className="p-6 space-y-2 max-h-[36vh] overflow-y-auto custom-scrollbar">
          {accounts.map((acc, i) => (
            <div key={i} className="flex items-center gap-2">
              {/* Type toggle */}
              <div className="flex rounded-lg overflow-hidden border border-border shrink-0">
                <button
                  type="button"
                  onClick={() => updateAccount(i, { type: 'Asset' })}
                  className={`px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                    acc.type === 'Asset'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  Asset
                </button>
                <button
                  type="button"
                  onClick={() => updateAccount(i, { type: 'Liability' })}
                  className={`px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors border-l border-border ${
                    acc.type === 'Liability'
                      ? 'bg-rose-500/15 text-rose-400'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  Liability
                </button>
              </div>

              {/* Name */}
              <Input
                value={acc.name}
                onChange={e => updateAccount(i, { name: e.target.value })}
                placeholder="e.g. HDFC Savings, Paytm Wallet…"
                className="h-9 flex-1 text-sm"
              />

              {/* Delete */}
              <button
                type="button"
                onClick={() => removeAccount(i)}
                className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addAccount}
            className="w-full flex items-center justify-center gap-2 py-2 mt-1 rounded-lg border border-dashed border-border text-[11px] font-semibold text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add Another Account
          </button>
        </div>

        {/* Footer */}
        <div className="p-5 bg-accent/20 border-t border-border flex items-center justify-between">
          <Button
            variant="ghost"
            className="text-muted-foreground font-bold tracking-widest uppercase text-xs"
            onClick={handleSkip}
          >
            Skip Tour
          </Button>
          <Button
            className="gap-2 px-8 font-bold tracking-widest uppercase text-xs"
            onClick={handleNext}
          >
            Save & Continue <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
