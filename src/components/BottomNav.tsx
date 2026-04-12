import { useLocation, Link } from 'react-router-dom';
import { LayoutDashboard, List, Plus, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/transactions', icon: List, label: 'Ledger' },
  { to: '/add', icon: Plus, label: 'Add', accent: true },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 pb-6 pt-2 bg-background/95 backdrop-blur-lg border-t border-border" role="navigation" aria-label="Main navigation">

      {navItems.map(({ to, icon: Icon, label, accent }) => {
        const isActive = to === '/' ? pathname === '/' : pathname.startsWith(to);
        
        if (accent) {
          return (
            <Link
              key={to}
              to={to}
              className="relative -top-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95"
              aria-label={label}
            >
              <Icon className="h-8 w-8" strokeWidth={3} />
            </Link>
          );
        }

        return (
          <Link
            key={to}
            to={to}
            className={cn(
              "flex flex-col items-center gap-1 transition-colors duration-200 py-1 px-3 rounded-lg",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

