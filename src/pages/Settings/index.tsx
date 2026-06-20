import {
  LogOut,
  RefreshCw,
  Globe,
  AlertCircle,
  CloudOff,
  Trash2,
  AlertTriangle,
  ShieldCheck,
  History,
} from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { googleLogout } from '@react-oauth/google';
import { useDataStore } from '@/store/dataStore';
import { SyncEngine } from '@/sync/SyncEngine';
import { getAllSyncQueue } from '@/lib/db';
import type { SyncOperation } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import SettingsLayout from '@/components/Layout/SettingsLayout';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { getAllCurrencies, COMMON_LOCALES } from '@/constants/currencies';
import { formatCurrency } from '@/utils/format';
import { format } from 'date-fns';

export default function SettingsIndex() {
  const {
    settings,
    updateSettings,
    userProfile,
    lastSyncedAt,
    syncStatus,
    pendingCount,
    lastSyncError,
    accessToken,
    spreadsheetId,
    hydrateFromSync,
    transactions,
    accounts,
    methods,
    categories,
    budgets,
  } = useDataStore();

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [logoutPendingCount, setLogoutPendingCount] = useState(0);
  const [pendingOps, setPendingOps] = useState<SyncOperation[]>([]);

  useEffect(() => {
    let active = true;
    if (pendingCount > 0) {
      getAllSyncQueue()
        .then(ops => {
          if (active) setPendingOps(ops);
        })
        .catch(console.error);
    } else {
      Promise.resolve().then(() => {
        if (active) setPendingOps([]);
      });
    }
    return () => {
      active = false;
    };
  }, [pendingCount]);

  const confirmAndLogout = () => {
    googleLogout();
    SyncEngine.reset();
    const { resetData } = useDataStore.getState();
    resetData();
    setIsLoggingOut(false);
    setLogoutConfirmOpen(false);
    sessionStorage.removeItem('skipOnboarding');
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      if (pendingCount > 0) {
        const engine = SyncEngine.getInstance();
        await engine.forceSync();
      }
      confirmAndLogout();
    } catch (err) {
      console.error('Failed to sync before logout', err);
      setLogoutPendingCount(pendingCount);
      setLogoutConfirmOpen(true);
    }
  };

  const handleManualSync = async () => {
    if (!accessToken || !spreadsheetId) return;
    try {
      const engine = SyncEngine.getInstance();
      
      // Fix #11: "Sync Now" button runs a full pull instead of a targeted push
      // If there are pending operations, just do a fast push (forceSync).
      // Only do a full pull (initialize) if everything is already synced.
      if (pendingCount > 0) {
        await engine.forceSync();
      } else {
        const reconciledData = await engine.initialize(spreadsheetId);
        if (reconciledData) {
          hydrateFromSync(reconciledData);
        }
      }
    } catch (err) {
      console.error('Manual sync failed:', err);
    }
  };

  const RESET_PHRASE = 'I UNDERSTAND THIS WILL PERMANENTLY WIPE ALL MY DATA';

  const handleHardReset = async () => {
    if (resetConfirmText !== RESET_PHRASE) return;

    setIsResetting(true);
    try {
      const engine = SyncEngine.getInstance();
      await engine.performHardReset();
      setResetModalOpen(false);
      // Force a full page reload to ensure all memory state is cleared
      window.location.href = '/';
    } catch (err) {
      console.error('Hard reset failed:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const currencies = useMemo(
    () => getAllCurrencies(settings.numberLocale),
    [settings.numberLocale]
  );

  const currentCurrency = useMemo(
    () =>
      currencies.find(c => c.code === settings.currency) || {
        code: settings.currency,
        name: settings.currency,
        symbol: settings.currencySymbol,
      },
    [currencies, settings.currency, settings.currencySymbol]
  );

  return (
    <SettingsLayout>
      <div className="space-y-10">
        <div className="sticky top-0 bg-background/95 backdrop-blur-md z-40 pb-4 pt-2 -mx-1 px-1">
          <h2 className="text-xl font-bold tracking-tight">General</h2>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Preferences & Sync
          </p>
        </div>
        {/* Profile */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">
            Profile
          </h3>
          <Card className="border-border shadow-sm overflow-hidden">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <img
                  src={userProfile?.picture}
                  alt="Profile"
                  className="h-14 w-14 rounded-xl ring-2 ring-primary/10 object-cover border border-border"
                />
                <div>
                  <p className="text-base font-bold tracking-tight">{userProfile?.name}</p>
                  <p className="text-xs text-muted-foreground">{userProfile?.email}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="text-destructive hover:bg-destructive/10 border-destructive/20 h-9 gap-2"
              >
                {isLoggingOut ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                {isLoggingOut ? 'Signing out...' : 'Sign out'}
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Cloud Persistence */}
        <section id="tour-target-sync" className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">
            Cloud Sync
          </h3>
          <Card className="border-border shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'h-10 w-10 rounded-full flex items-center justify-center',
                      syncStatus === 'idle' && 'bg-emerald-500/10 text-emerald-500',
                      syncStatus === 'syncing' && 'bg-blue-500/10 text-blue-500',
                      syncStatus === 'pulling' && 'bg-blue-500/10 text-blue-500',
                      syncStatus === 'error' && 'bg-red-500/10 text-red-500',
                      syncStatus === 'offline' && 'bg-zinc-500/10 text-zinc-500'
                    )}
                  >
                    {syncStatus === 'error' ? (
                      <AlertCircle className="h-5 w-5" />
                    ) : syncStatus === 'offline' ? (
                      <CloudOff className="h-5 w-5" />
                    ) : (
                      <RefreshCw
                        className={cn(
                          'h-5 w-5',
                          (syncStatus === 'syncing' || syncStatus === 'pulling') && 'animate-spin'
                        )}
                      />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold tracking-tight">Google Sheets Database</p>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                      {syncStatus === 'syncing'
                        ? 'Syncing changes…'
                        : syncStatus === 'pulling'
                          ? 'Pulling from sheets…'
                          : syncStatus === 'error'
                            ? 'Sync error'
                            : syncStatus === 'offline'
                              ? 'Offline'
                              : lastSyncedAt
                                ? `Last synced ${new Date(lastSyncedAt).toLocaleString()}`
                                : 'No sync recorded'}
                    </p>
                    {pendingCount > 0 && (
                      <div className="flex items-center mt-0.5">
                        <p className="text-[10px] text-amber-500 font-medium">
                          {pendingCount} change{pendingCount > 1 ? 's' : ''} pending
                        </p>
                        <InfoTooltip
                          position="bottom"
                          text={
                            <ul className="space-y-1 text-left list-disc list-inside">
                              {pendingOps.map(op => {
                                let details = op.entityId;
                                if (op.entity === 'settings') details = 'App Settings';
                                else if (op.action === 'delete') details = 'Deleted item';
                                else {
                                  if (op.entity === 'transaction') {
                                    const t = transactions.find(x => x.id === op.entityId);
                                    if (t) {
                                      let name = t.note;
                                      if (!name) {
                                        if (t.uiType === 'transfer') name = 'Transfer';
                                        else {
                                          const catEntry = t.entries.find(e =>
                                            categories.some(c => c.id === e.accountId)
                                          );
                                          if (catEntry) {
                                            const cat = categories.find(
                                              c => c.id === catEntry.accountId
                                            );
                                            name = cat
                                              ? cat.subHead
                                                ? `${cat.head} - ${cat.subHead}`
                                                : cat.head
                                              : 'Transaction';
                                          } else {
                                            name = 'Transaction';
                                          }
                                        }
                                      }
                                      details = `${name} (${formatCurrency(t.amount, settings)})`;
                                    }
                                  } else if (op.entity === 'account') {
                                    const a = accounts.find(x => x.id === op.entityId);
                                    if (a) details = a.name;
                                  } else if (op.entity === 'method') {
                                    const m = methods.find(x => x.id === op.entityId);
                                    if (m) details = m.name;
                                  } else if (op.entity === 'category') {
                                    const c = categories.find(x => x.id === op.entityId);
                                    if (c)
                                      details = c.subHead ? `${c.head} - ${c.subHead}` : c.head;
                                  } else if (op.entity === 'budget') {
                                    const b = budgets.find(x => x.id === op.entityId);
                                    if (b) {
                                      const c = categories.find(x => x.id === b.categoryId);
                                      details = c
                                        ? `${c.subHead ? `${c.head} - ${c.subHead}` : c.head} Budget`
                                        : 'Budget';
                                    }
                                  }
                                }

                                return (
                                  <li key={op.id} className="whitespace-nowrap">
                                    <span className="font-semibold text-[9px] text-muted-foreground">
                                      {op.action.toUpperCase()} {op.entity.toUpperCase()}
                                    </span>
                                    <br />
                                    <span className="font-medium text-popover-foreground">
                                      {details}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  onClick={handleManualSync}
                  disabled={syncStatus === 'syncing' || syncStatus === 'pulling'}
                  size="sm"
                  className="h-9 px-6 font-bold uppercase text-[10px] tracking-widest"
                >
                  Sync Now
                </Button>
              </div>
              {lastSyncError && syncStatus === 'error' && (
                <div className="p-3 bg-red-500/5 rounded-lg border border-red-500/20 mb-4">
                  <p className="text-[10px] text-red-400 leading-relaxed font-medium">
                    {lastSyncError}
                  </p>
                </div>
              )}
              <div className="p-3 bg-accent/30 rounded-lg border border-border/50">
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Your financial data is 100% private. Moniq does not have a central database;
                  instead, all your transactions and settings are securely backed up to a dedicated
                  spreadsheet inside your personal Google Drive.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Backups */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">
            Automated Backups
          </h3>
          <Card className="border-border shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold tracking-tight">Tiered Retention System</p>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                      Snapshots stored in "Moniq Backups" folder
                    </p>
                  </div>
                </div>
                <Button
                  onClick={async () => {
                    setIsBackingUp(true);
                    try {
                      const { BackupManager } = await import('@/sync/BackupManager');
                      await BackupManager.getInstance().runBackupCycle(true);
                    } finally {
                      setIsBackingUp(false);
                    }
                  }}
                  disabled={isBackingUp}
                  variant="outline"
                  size="sm"
                  className="h-8 px-4 font-bold uppercase text-[9px] tracking-widest min-w-25"
                >
                  {isBackingUp ? <RefreshCw className="h-3 w-3 animate-spin mr-2" /> : null}
                  {isBackingUp ? 'Backing up...' : 'Backup Now'}
                </Button>
              </div>

              <div className="p-3 bg-accent/30 rounded-lg border border-border/50 mb-6">
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Moniq automatically creates snapshots of your data at specific intervals. Clicking{' '}
                  <strong>Backup Now</strong> immediately forces a full backup across all tiers
                  (daily, weekly, monthly, yearly) regardless of schedule. Each backup is saved as a
                  new copy in the &quot;Moniq Backups&quot; folder in your Google Drive — existing
                  backups are never overwritten.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Daily', date: settings.lastDailyBackup, limit: '7 Days' },
                  { label: 'Weekly', date: settings.lastWeeklyBackup, limit: '5 Weeks' },
                  { label: 'Monthly', date: settings.lastMonthlyBackup, limit: '12 Months' },
                  { label: 'Yearly', date: settings.lastYearlyBackup, limit: 'Infinite' },
                ].map(tier => (
                  <div
                    key={tier.label}
                    className="p-3 bg-accent/30 rounded-xl border border-border/50 flex flex-col gap-1"
                  >
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      {tier.label}
                    </p>
                    <p className="text-xs font-bold truncate">{tier.date || 'Never'}</p>
                    <div className="flex items-center gap-1 mt-1 text-[8px] text-muted-foreground/70 font-medium uppercase tracking-tighter">
                      <History className="h-2 w-2" />
                      <span>Retain: {tier.limit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Regional Preferences */}
        <section className="space-y-4">
          <div className="px-1">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Regional Preferences
            </h3>
          </div>
          <Card className="border-border shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                    Currency
                  </Label>
                  <Select
                    value={settings.currency}
                    onValueChange={val => updateSettings({ currency: val })}
                  >
                    <SelectTrigger className="h-10 border-border/50 focus:ring-primary/20">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map(c => (
                        <SelectItem key={c.code} value={c.code}>
                          <span className="font-medium">{c.code}</span>
                          <span className="mx-2 text-muted-foreground/50">—</span>
                          <span className="text-xs text-muted-foreground">{c.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[9px] text-muted-foreground italic">
                      Selected: {currentCurrency.symbol} ({currentCurrency.name})
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                    Number Format
                  </Label>
                  <Select
                    value={settings.numberLocale}
                    onValueChange={val => updateSettings({ numberLocale: val })}
                  >
                    <SelectTrigger className="h-10 border-border/50 focus:ring-primary/20">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_LOCALES.map(l => (
                        <SelectItem key={l.code} value={l.code}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[9px] text-muted-foreground italic pt-1">
                    Preview: {formatCurrency(1234567.89, settings)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                    Date Format
                  </Label>
                  <Select
                    value={settings.dateFormat || 'MMM d, yyyy'}
                    onValueChange={val => updateSettings({ dateFormat: val })}
                  >
                    <SelectTrigger className="h-10 border-border/50 focus:ring-primary/20">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        'MMM d, yyyy',
                        'dd/MM/yyyy',
                        'MM/dd/yyyy',
                        'yyyy-MM-dd'
                      ].map(fmt => (
                        <SelectItem key={fmt} value={fmt}>
                          {format(new Date(), fmt)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[9px] text-muted-foreground italic pt-1">
                    Default date format across the app
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-between opacity-80">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wider text-[10px]">
                    Locale Info
                  </span>
                </div>
                <span className="text-xs font-bold text-primary bg-primary/5 px-2 py-0.5 rounded text-[10px]">
                  {settings.numberLocale}
                </span>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Danger Zone */}
        <section className="space-y-4 pt-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-destructive/70 px-1">
            Danger Zone
          </h3>
          <Card className="border-destructive/20 bg-destructive/5 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-6">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-destructive">Reset All Data</p>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
                    Permanently wipe all transactions, accounts, and categories from this device and
                    your Google Sheet. This action cannot be undone.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setResetConfirmText('');
                    setResetModalOpen(true);
                  }}
                  className="h-9 px-4 shrink-0 shadow-sm"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Reset Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Hard Reset Modal */}
      <Dialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
        <DialogContent className="max-w-md border-none shadow-2xl p-0 overflow-hidden bg-background">
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-4 text-destructive">
              <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-tight">Are you absolutely sure?</h3>
                <p className="text-sm text-muted-foreground">This action is irreversible.</p>
              </div>
            </div>

            <div className="space-y-4 rounded-xl bg-muted/50 p-4 border border-border">
              <ul className="text-xs space-y-2 text-muted-foreground list-disc list-inside">
                <li>
                  All <span className="text-foreground font-medium">local data</span> will be wiped.
                </li>
                <li>
                  All data in your <span className="text-foreground font-medium">Google Sheet</span>{' '}
                  will be cleared.
                </li>
                <li>
                  The app will return to the{' '}
                  <span className="text-foreground font-medium">onboarding</span> state.
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Type the following exactly to confirm:
                <div className="mt-1 text-destructive font-mono select-none bg-destructive/5 p-2 rounded border border-destructive/10 text-[11px] normal-case">
                  {RESET_PHRASE}
                </div>
              </Label>
              <Input
                value={resetConfirmText}
                onChange={e => setResetConfirmText(e.target.value)}
                placeholder="Type the exact phrase here..."
                className="h-11 border-border focus-visible:ring-destructive text-sm"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-11 font-medium"
                onClick={() => setResetModalOpen(false)}
                disabled={isResetting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1 h-11 font-bold shadow-lg shadow-destructive/20"
                disabled={resetConfirmText !== RESET_PHRASE || isResetting}
                onClick={handleHardReset}
              >
                {isResetting ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Delete Everything'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <DialogContent className="max-w-md p-6 bg-[#09090b] border border-red-500/20 shadow-2xl">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h3 className="text-zinc-100 text-lg font-medium mb-2">Unsaved Changes</h3>
              <p className="text-zinc-400 text-sm">
                You have {logoutPendingCount} changes that couldn't be saved to Google Drive due to
                a network error. If you sign out now, these changes will be lost.
              </p>
            </div>
            <div className="flex gap-3 w-full mt-4">
              <Button
                variant="outline"
                className="flex-1 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                onClick={() => {
                  setLogoutConfirmOpen(false);
                  setIsLoggingOut(false);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={confirmAndLogout}
              >
                Sign Out Anyway
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </SettingsLayout>
  );
}
