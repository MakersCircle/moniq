import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDataStore } from '@/store/dataStore';
import defaults from '@/data/defaults.json';
import { Wallet, Settings, ArrowRight, Play } from 'lucide-react';
import type { Account } from '@/types';

export default function OnboardingModal() {
  const completeOnboarding = useDataStore(s => s.completeOnboarding);

  // We omit IDs and createdAt, just handle names
  const [editableAccounts, setEditableAccounts] = useState<Partial<Account>[]>(
    defaults.accounts as any
  );

  const handleUpdateAccount = (index: number, newName: string) => {
    const updated = [...editableAccounts];
    updated[index].name = newName;
    setEditableAccounts(updated);
  };

  const handleStartWithDefaults = () => {
    // Only pass the accounts that actually have a name
    const finalAccounts = editableAccounts.filter(a => a.name?.trim());
    completeOnboarding(finalAccounts as any, defaults.categories as any);
  };

  const handleStartFromScratch = () => {
    completeOnboarding([], []);
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="max-w-xl sm:max-w-2xl overflow-hidden p-0 border-none shadow-2xl [&>button]:hidden">
        <div className="bg-primary/5 p-8 border-b border-border/50 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
            <Play className="h-8 w-8 text-primary ml-1" />
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight mb-2">
            Welcome to Moniq
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            Let's get your ledger ready. Start with standard categories and accounts, or begin from
            a completely blank slate.
          </DialogDescription>
        </div>

        <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Recommended Accounts
            </h3>
            <p className="text-xs text-muted-foreground">
              Rename these starting accounts to match your actual banks and wallets. A corresponding
              Payment Method will be created for each automatically.
            </p>
            <div className="grid gap-3">
              {editableAccounts.map((acc, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-24 text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 text-right">
                    {acc.type}
                  </div>
                  <Input
                    value={acc.name || ''}
                    onChange={e => handleUpdateAccount(i, e.target.value)}
                    placeholder="e.g. Bank Account"
                    className="h-10"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Settings className="h-4 w-4" /> Standard Categories
            </h3>
            <p className="text-xs text-muted-foreground">
              Moniq will generate <b>{defaults.categories.length}</b> essential categories across
              Needs, Wants, and Income to save you time. You can customize these later in Settings.
            </p>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(defaults.categories.map(c => c.head))).map((head, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors border-transparent bg-secondary text-secondary-foreground"
                >
                  {head as string}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 bg-accent/20 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <Button
            variant="ghost"
            className="text-muted-foreground font-bold tracking-widest uppercase text-[10px]"
            onClick={handleStartFromScratch}
          >
            Skip & Start from Scratch
          </Button>
          <Button
            className="gap-2 px-8 font-bold tracking-widest uppercase text-[10px]"
            onClick={handleStartWithDefaults}
          >
            Start with Configuration <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
