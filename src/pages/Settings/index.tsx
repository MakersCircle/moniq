import { Link } from 'react-router-dom';
import { Landmark, CreditCard, Tag, ChevronRight, Settings2, RefreshCw, LogOut } from 'lucide-react';
import PageShell from '../../components/PageShell';
import { useDataStore } from '../../store/dataStore';
import { googleLogout } from '@react-oauth/google';
import { syncDataToGoogleSheets } from '../../api/google';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function SettingsIndex() {
  const { 
    sources, methods, categories, settings, updateSettings, 
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
      alert('Failed to sync. Please try again or re-authenticate.');
      setSyncState(lastSyncedAt, false);
    }
  };

  const navItems = [
    { to: '/settings/sources',    icon: Landmark,    label: 'Accounts',        count: sources.filter((s) => s.isActive).length, color: "text-blue-500 bg-blue-500/10" },
    { to: '/settings/methods',    icon: CreditCard,  label: 'Payment Methods', count: methods.filter((m) => m.isActive).length, color: "text-emerald-500 bg-emerald-500/10" },
    { to: '/settings/categories', icon: Tag,         label: 'Categories',      count: categories.filter((c) => c.isActive).length, color: "text-amber-500 bg-amber-500/10" },
  ];

  return (
    <PageShell title="Settings" subtitle="App configuration">
      <div className="space-y-6 pb-10">
        {/* Profile Section */}
        {userProfile && (
          <Card className="border-none bg-muted/20">
            <CardContent className="p-4 flex items-center gap-4">
              <img 
                src={userProfile.picture} 
                alt="Profile" 
                className="h-12 w-12 rounded-full ring-2 ring-primary/20 object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold truncate leading-tight">{userProfile.name}</p>
                <p className="text-xs text-muted-foreground truncate">{userProfile.email}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
                <LogOut className="h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Cloud Sync Section */}
        {userProfile && (
          <Card>
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-sm font-bold tracking-tight">Google Sheets Database</p>
                </div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                  {lastSyncedAt ? `Synced ${new Date(lastSyncedAt).toLocaleString()}` : 'Not synced yet'}
                </p>
              </div>
              <Button 
                onClick={handleManualSync}
                disabled={isSyncing}
                size="sm"
                className="h-9 px-4 gap-2"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} />
                {isSyncing ? 'Syncing' : 'Sync'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Navigation List */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground px-1">Library</p>
          <div className="space-y-2">
            {navItems.map(({ to, icon: Icon, label, count, color }) => (
              <Link key={to} to={to} className="block transition-transform active:scale-[0.99]">
                <Card className="hover:bg-accent/50 transition-colors border-muted/50">
                  <CardContent className="p-3 flex items-center gap-4">
                    <div className={cn("h-10 w-10 shrink-0 rounded-xl flex items-center justify-center", color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="flex-1 font-bold text-sm">{label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{count}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Preferences Section */}
        <Card className="border-none bg-muted/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" /> Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pref-currency">Currency Symbol</Label>
                <Input
                  id="pref-currency"
                  value={settings.currencySymbol}
                  onChange={(e) => updateSettings({ currencySymbol: e.target.value })}
                  placeholder="₹"
                  maxLength={3}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pref-currency-code">Currency Code</Label>
                <Input
                  id="pref-currency-code"
                  value={settings.currency}
                  onChange={(e) => updateSettings({ currency: e.target.value })}
                  placeholder="INR"
                  maxLength={5}
                  className="bg-background"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] text-center pt-4 opacity-50">
          Moniq v0.1 • Personal Finance Manager
        </p>
      </div>
    </PageShell>
  );
}

