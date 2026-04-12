import { LogOut, RefreshCw, Smartphone, Palette, Globe } from 'lucide-react';
import { googleLogout } from '@react-oauth/google';
import { useDataStore } from '@/store/dataStore';
import { syncDataToGoogleSheets } from '@/api/google';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import SettingsLayout from '@/components/Layout/SettingsLayout';

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
                    All your data is stored in a private spreadsheet in your Google Drive. 
                    Moniq only manages the <strong>{spreadsheetId?.substring(0, 8)}...</strong> workbook.
                  </p>
                </div>
             </CardContent>
          </Card>
        </section>

        {/* Preferences */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Regional Preferences</h3>
          <Card className="border-border shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Currency Symbol</Label>
                  <Input
                    value={settings.currencySymbol}
                    onChange={(e) => updateSettings({ currencySymbol: e.target.value })}
                    className="h-10 border-border/50 focus:border-primary/30"
                  />
                  <p className="text-[9px] text-muted-foreground">e.g. ₹, $, €</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Currency Code</Label>
                  <Input
                    value={settings.currency}
                    onChange={(e) => updateSettings({ currency: e.target.value })}
                    className="h-10 border-border/50 focus:border-primary/30"
                  />
                  <p className="text-[9px] text-muted-foreground">ISO code (e.g. INR, USD)</p>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-between opacity-50 pointer-events-none">
                 <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <span className="text-xs font-medium">Language</span>
                 </div>
                 <span className="text-xs text-muted-foreground">English (India)</span>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </SettingsLayout>
  );
}
