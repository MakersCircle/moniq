import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ReceiptText, 
  BarChart3, 
  Target, 
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/' },
  { icon: ReceiptText, label: 'Ledger', to: '/transactions' },
  { icon: BarChart3, label: 'Insights', to: '/insights' },
  { icon: Target, label: 'Budget', to: '/budget' },
];

export default function Sidebar() {

  return (
    <aside className="w-[220px] h-screen flex flex-col fixed left-0 top-0 border-r border-border bg-background z-50">
      {/* Logo */}
      <div className="h-[48px] px-6 flex items-center">
        <NavLink to="/" className="flex items-center gap-2 group">
          <div className="h-6 w-6 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm group-hover:scale-110 transition-transform">
            m
          </div>
          <span className="font-bold tracking-tight text-lg">moniq</span>
        </NavLink>
      </div>

      <div className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive 
                ? "bg-primary/10 text-primary" 
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}

      </div>

      <div className="p-3 border-t border-border/50">
        <NavLink
            to="/settings"
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive 
                ? "bg-primary/10 text-primary" 
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Settings className="h-4 w-4" />
            Settings
          </NavLink>
          <div className="pt-2 px-3 pb-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">moniq v0.1</p>
          </div>
      </div>
    </aside>
  );
}
