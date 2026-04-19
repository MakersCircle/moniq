import { NavLink } from 'react-router-dom';
import { 
  Settings, 
  Landmark, 
  CreditCard, 
  Tag, 
  Database, 
  ChevronRight,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDataStore } from '@/store/dataStore';

const SETTINGS_NAV = [
  { icon: Settings, label: 'General', to: '/settings' },
  { icon: Landmark, label: 'Accounts', to: '/settings/accounts' },
  { icon: CreditCard, label: 'Pay Methods', to: '/settings/methods' },
  { icon: Tag, label: 'Categories', to: '/settings/categories' },
  { icon: Trash2, label: 'Recently Deleted', to: '/settings/trash' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { accounts, methods, categories, transactions } = useDataStore();

  const getCount = (label: string) => {
    if (label === 'Accounts') return accounts.filter(s => s.isActive).length;
    if (label === 'Pay Methods') return methods.filter(m => m.isActive).length;
    if (label === 'Categories') return categories.filter(c => c.isActive).length;
    if (label === 'Recently Deleted') return transactions.filter(t => t.isDeleted).length;
    return null;
  };

  return (
    <div className="flex gap-10 h-[calc(100vh-112px)] overflow-hidden -mt-2">
      {/* Settings Internal Sidebar */}
      <aside className="w-[200px] shrink-0 overflow-y-auto custom-scrollbar pr-2 pb-6 pt-2">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground mb-6 px-4">
          Settings
        </h2>
        <div className="space-y-1">
          {SETTINGS_NAV.map((item) => {
            const count = getCount(item.label);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/settings'}
                className={({ isActive }) => cn(
                  "flex items-center justify-between px-4 py-2 rounded-lg text-sm font-medium transition-all group",
                  isActive 
                    ? "bg-primary/10 text-primary shadow-sm" 
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
                {count !== null && (
                  <span className="text-[10px] font-bold bg-accent/50 group-hover:bg-primary/20 px-1.5 py-0.5 rounded text-muted-foreground transition-colors">
                    {count}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

      </aside>

      {/* Settings Content Area Area */}
      <div className="flex-1 min-w-0 max-w-[800px] overflow-y-auto custom-scrollbar pr-6 pb-6">
        {children}
      </div>
    </div>
  );
}
