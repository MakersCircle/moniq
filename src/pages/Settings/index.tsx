import { Link } from 'react-router-dom';
import { Landmark, CreditCard, Tag, ChevronRight, Settings2 } from 'lucide-react';
import PageShell from '../../components/PageShell';
import { useDataStore } from '../../store/dataStore';

export default function SettingsIndex() {
  const { sources, methods, categories, settings, updateSettings } = useDataStore();

  const navItems = [
    { to: '/settings/sources',    icon: Landmark,    label: 'Accounts',        count: sources.filter((s) => s.isActive).length },
    { to: '/settings/methods',    icon: CreditCard,  label: 'Payment Methods', count: methods.filter((m) => m.isActive).length },
    { to: '/settings/categories', icon: Tag,         label: 'Categories',      count: categories.filter((c) => c.isActive).length },
  ];

  return (
    <PageShell title="Settings" subtitle="App configuration">
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
