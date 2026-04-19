import { LogOut, RefreshCw, Smartphone, Palette, Globe, Target, Zap, AlertCircle, Cloud, CloudOff, Trash2, AlertTriangle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { googleLogout } from '@react-oauth/google';
import { useDataStore } from '@/store/dataStore';
import { SyncEngine } from '@/sync/SyncEngine';
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
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import SettingsLayout from '@/components/Layout/SettingsLayout';
import { getAllCurrencies, COMMON_LOCALES, detectLocalSettings } from '@/constants/currencies';
import { formatCurrency } from '@/utils/format';

export default function SettingsIndex() {
  const { 
    settings, updateSettings, 
    userProfile, lastSyncedAt, syncStatus, pendingCount, lastSyncError,
    setAccessToken, setUserProfile, setSpreadsheetId, resetData,
    accessToken, spreadsheetId, hydrateFromSync
  } = useDataStore();

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleLogout = () => {
    googleLogout();
    SyncEngine.reset();
    setAccessToken(null);
    setUserProfile(null);
    setSpreadsheetId(null);
  };

  const handleManualSync = async () => {
    if (!accessToken || !spreadsheetId) return;
    try {
      // Execute a full two-way pull + push and hydrate store with any remote updates
      const engine = SyncEngine.getInstance();
      const reconciledData = await engine.initialize(accessToken, spreadsheetId);
      if (reconciledData) {
        hydrateFromSync(reconciledData);
      }
    } catch (err) {
      console.error('Manual sync failed:', err);
    }
  };

  const handleHardReset = async () => {
    if (resetConfirmText !== 'RESET') return;
    
    setIsResetting(true);
    try {
      const engine = SyncEngine.getInstance();
      await engine.performHardReset();
      setResetModalOpen(false);
      // Redirect happens automatically because hasCompletedOnboarding becomes false
    } catch (err) {
      console.error('Hard reset failed:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const currencies = useMemo(() => getAllCurrencies(settings.numberLocale), [settings.numberLocale]);

  const currentCurrency = useMemo(() => 
    currencies.find(c => c.code === settings.currency) || { code: settings.currency, name: settings.currency, symbol: settings.currencySymbol },
    [currencies, settings.currency, settings.currencySymbol]
  );

  return (
    <SettingsLayout>
      <div className="space-y-10">
        <div className="sticky top-0 bg-background/95 backdrop-blur-md z-40 pb-4 pt-2 -mx-1 px-1">
          <h2 className="text-xl font-bold tracking-tight">General</h2>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Preferences & Sync</p>
        </div>
        {/* Profile */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Profile</h3>
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
                <Button variant="outline" size="sm" onClick={handleLogout} className="text-destructive hover:bg-destructive/10 border-destructive/20 h-9 gap-2">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
             </CardContent>
          </Card>
        </section>

        {/* Cloud Persistence */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Cloud Sync</h3>
          <Card className="border-border shadow-sm">
             <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center",
                      syncStatus === 'idle' && "bg-emerald-500/10 text-emerald-500",
                      syncStatus === 'syncing' && "bg-blue-500/10 text-blue-500",
                      syncStatus === 'pulling' && "bg-blue-500/10 text-blue-500",
                      syncStatus === 'error' && "bg-red-500/10 text-red-500",
                      syncStatus === 'offline' && "bg-zinc-500/10 text-zinc-500",
                    )}>
                      {syncStatus === 'error' ? (
                        <AlertCircle className="h-5 w-5" />
                      ) : syncStatus === 'offline' ? (
                        <CloudOff className="h-5 w-5" />
                      ) : (
                        <RefreshCw className={cn("h-5 w-5", (syncStatus === 'syncing' || syncStatus === 'pulling') && "animate-spin")} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold tracking-tight">Google Sheets Database</p>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                         {syncStatus === 'syncing' ? 'Syncing changes…' 
                           : syncStatus === 'pulling' ? 'Pulling from sheets…'
                           : syncStatus === 'error' ? 'Sync error'
                           : syncStatus === 'offline' ? 'Offline'
                           : lastSyncedAt ? `Last synced ${new Date(lastSyncedAt).toLocaleString()}` : 'No sync recorded'}
                      </p>
                      {pendingCount > 0 && syncStatus === 'idle' && (
                        <p className="text-[10px] text-amber-500 font-medium mt-0.5">{pendingCount} change{pendingCount > 1 ? 's' : ''} pending</p>
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
                    <p className="text-[10px] text-red-400 leading-relaxed font-medium">{lastSyncError}</p>
                  </div>
                )}
                <div className="p-3 bg-accent/30 rounded-lg border border-border/50">
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Your financial data is 100% private. Moniq does not have a central database; instead, all your transactions and settings are securely backed up to a dedicated spreadsheet inside your personal Google Drive.
                  </p>
                </div>
             </CardContent>
          </Card>
        </section>

        {/* Regional Preferences */}
        <section className="space-y-4">
          <div className="px-1">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Regional Preferences</h3>
          </div>
          <Card className="border-border shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Currency</Label>
                  <Select 
                    value={settings.currency} 
                    onValueChange={(val) => updateSettings({ currency: val })}
                  >
                    <SelectTrigger className="h-10 border-border/50 focus:ring-primary/20">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
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
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Number Format (Separators)</Label>
                  <Select 
                    value={settings.numberLocale} 
                    onValueChange={(val) => updateSettings({ numberLocale: val })}
                  >
                    <SelectTrigger className="h-10 border-border/50 focus:ring-primary/20">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_LOCALES.map((l) => (
                        <SelectItem key={l.code} value={l.code}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[9px] text-muted-foreground italic">
                    Preview: {formatCurrency(1234567.89, settings)}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-between opacity-80">
                 <div className="flex items-center gap-2 text-muted-foreground">
                    <Globe className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wider text-[10px]">Locale Info</span>
                 </div>
                 <span className="text-xs font-bold text-primary bg-primary/5 px-2 py-0.5 rounded text-[10px]">{settings.numberLocale}</span>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Danger Zone */}
        <section className="space-y-4 pt-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-destructive/70 px-1">Danger Zone</h3>
          <Card className="border-destructive/20 bg-destructive/5 shadow-sm">
             <CardContent className="p-6">
                <div className="flex items-center justify-between gap-6">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-destructive">Reset All Data</p>
                    <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
                      Permanently wipe all transactions, accounts, and categories from this device and your Google Sheet. This action cannot be undone.
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
                <li>All <span className="text-foreground font-medium">local data</span> will be wiped.</li>
                <li>All data in your <span className="text-foreground font-medium">Google Sheet</span> will be cleared.</li>
                <li>The app will return to the <span className="text-foreground font-medium">onboarding</span> state.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Type <span className="text-destructive underline decoration-2 underline-offset-4">RESET</span> to confirm</Label>
              <Input 
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value.toUpperCase())}
                placeholder="Type RESET here..."
                className="h-11 border-border focus-visible:ring-destructive"
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
                disabled={resetConfirmText !== 'RESET' || isResetting}
                onClick={handleHardReset}
              >
                {isResetting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  "Delete Everything"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </SettingsLayout>
  );
}
