import { Link } from 'react-router-dom';
import { Landmark, CreditCard, Tag, ChevronRight, Settings2, RefreshCw, LogOut } from 'lucide-react';
import PageShell from '../../components/PageShell';
import { useDataStore } from '../../store/dataStore';
import { googleLogout } from '@react-oauth/google';
import { syncDataToGoogleSheets } from '../../api/google';

export default function SettingsIndex() {
  const { sources, methods, categories, settings, updateSettings, userProfile, lastSyncedAt, isSyncing, setAccessToken, setUserProfile, setSpreadsheetId, setSyncState, accessToken, spreadsheetId } = useDataStore();

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
    { to: '/settings/sources',    icon: Landmark,    label: 'Accounts',        count: sources.filter((s) => s.isActive).length },
    { to: '/settings/methods',    icon: CreditCard,  label: 'Payment Methods', count: methods.filter((m) => m.isActive).length },
    { to: '/settings/categories', icon: Tag,         label: 'Categories',      count: categories.filter((c) => c.isActive).length },
  ];

  return (
    <PageShell title="Settings" subtitle="App configuration">
      {/* Profile Section */}
      {userProfile && (
        <div className="card" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img 
            src={userProfile.picture} 
            alt="Profile" 
            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{userProfile.name}</div>
            <div className="text-muted" style={{ fontSize: '0.8125rem' }}>{userProfile.email}</div>
          </div>
          <button className="btn btn-secondary" onClick={handleLogout} style={{ padding: '8px' }} aria-label="Log Out">
            <LogOut size={16} />
          </button>
        </div>
      )}

      {/* Cloud Sync Section */}
      {userProfile && (
        <div className="card" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 500, fontSize: '0.9375rem' }}>Google Sheets</div>
            <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '2px' }}>
              {lastSyncedAt ? `Last synced: ${new Date(lastSyncedAt).toLocaleString()}` : 'Unsynced local changes'}
            </div>
          </div>
          <button 
            className="btn btn-primary" 
            onClick={handleManualSync}
            disabled={isSyncing}
            style={{ padding: '8px 16px', fontSize: '0.8125rem' }}
          >
            <RefreshCw size={14} className={isSyncing ? 'spin' : ''} />
            <span style={{ marginLeft: '8px' }}>{isSyncing ? 'Syncing...' : 'Sync'}</span>
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {navItems.map(({ to, icon: Icon, label, count }) => (
          <Link key={to} to={to} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
              <Icon size={18} />
            </div>
            <span style={{ flex: 1, fontWeight: 500 }}>{label}</span>
            <span className="chip chip-neutral" style={{ fontSize: '0.75rem' }}>{count}</span>
            <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
          </Link>
        ))}
      </div>

      <div className="divider" />

      <div className="card">
        <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Settings2 size={16} style={{ color: 'var(--accent)' }} /> Preferences
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="pref-currency">Currency Symbol</label>
            <input
              id="pref-currency"
              className="form-input"
              value={settings.currencySymbol}
              onChange={(e) => updateSettings({ currencySymbol: e.target.value })}
              placeholder="₹"
              maxLength={3}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="pref-currency-code">Currency Code</label>
            <input
              id="pref-currency-code"
              className="form-input"
              value={settings.currency}
              onChange={(e) => updateSettings({ currency: e.target.value })}
              placeholder="INR"
              maxLength={5}
            />
          </div>
        </div>
      </div>

      <p className="text-secondary" style={{ fontSize: '0.8125rem', textAlign: 'center', marginTop: 8 }}>
        moniq v0.1 · Data stored locally in your browser
      </p>
    </PageShell>
  );
}
