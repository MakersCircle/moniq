import { LogOut, RefreshCw, Smartphone, Palette, Globe, Target, Zap } from 'lucide-react';
import { useMemo } from 'react';
import { googleLogout } from '@react-oauth/google';
import { useDataStore } from '@/store/dataStore';
import { syncDataToGoogleSheets } from '@/api/google';
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
import SettingsLayout from '@/components/Layout/SettingsLayout';
import { getAllCurrencies, COMMON_LOCALES, detectLocalSettings } from '@/constants/currencies';
import { formatCurrency } from '@/utils/format';

export default function SettingsIndex() {
  const { 
    settings, updateSettings, 
    userProfile, lastSyncedAt, isSyncing, setAccessToken, 
    setUserProfile, setSpreadsheetId, setSyncState, 
    accessToken, spreadsheetId 
  } = useDataStore();

  const handleLogout = () => {
    googleLogout();
    setAccessToken(null);
    setUserProfile(null);
    setSpreadsheetId(null);
  };

  const handleManualSync = async () => {
    if (!accessToken || !spreadsheetId) return;
    setSyncState(lastSyncedAt, true);
    
    try {
      const fullState = useDataStore.getState();
      await syncDataToGoogleSheets(accessToken, spreadsheetId, fullState);
      setSyncState(new Date().toISOString(), false);
    } catch (err) {
      console.error(err);
      setSyncState(lastSyncedAt, false);
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
                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                      <RefreshCw className={cn("h-5 w-5", isSyncing && "animate-spin")} />
                    </div>
                    <div>
                      <p className="text-sm font-bold tracking-tight">Google Sheets Database</p>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                         {lastSyncedAt ? `Last active ${new Date(lastSyncedAt).toLocaleString()}` : 'No sync recorded'}
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={handleManualSync}
                    disabled={isSyncing}
                    size="sm"
                    className="h-9 px-6 font-bold uppercase text-[10px] tracking-widest"
                  >
                    Sync Now
                  </Button>
                </div>
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
      </div>
    </SettingsLayout>
  );
}
