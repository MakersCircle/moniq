import React from 'react';
import { NavLink } from 'react-router-dom';
import { version } from '../../../package.json';
import { LayoutDashboard, ReceiptText, BarChart3, Target, Settings, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BetaTag } from '../ui/BetaTag';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/dashboard' },
  { icon: ReceiptText, label: 'Ledger', to: '/transactions' },
  { icon: BarChart3, label: 'Insights', to: '/insights' },
  { icon: Target, label: 'Budget', to: '/budget' },
];

export default function Sidebar({ onNewTransaction }: { onNewTransaction?: () => void }) {
  return (
    <aside className="w-full h-[60px] lg:w-[220px] lg:h-screen flex flex-row lg:flex-col fixed bottom-0 lg:bottom-auto left-0 lg:top-0 border-t lg:border-t-0 lg:border-r border-border bg-background z-50">
      {/* Logo (Desktop Only) */}
      <div className="hidden lg:flex h-16 px-6 items-center">
        <NavLink to="/" className="flex items-center gap-2 group">
          <img src="/moniq-wordmark.svg" alt="moniq logo" className="h-6 object-contain" />
          <BetaTag className="ml-1.5" />
        </NavLink>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 flex flex-row lg:flex-col items-center justify-around lg:justify-start lg:px-3 lg:py-4 px-2 py-0 lg:space-y-1 w-full h-full">
        {NAV_ITEMS.map((item, index) => (
          <React.Fragment key={item.to}>
            {/* Insert FAB in the middle on mobile */}
            {index === 2 && (
              <div className="flex lg:hidden items-center justify-center -mt-6">
                <button
                  onClick={() => onNewTransaction?.()}
                  className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform"
                >
                  <Plus className="h-6 w-6" />
                </button>
              </div>
            )}

            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-3 py-1.5 lg:px-3 lg:py-2 rounded-lg text-xs lg:text-sm font-medium transition-colors w-[64px] lg:w-full',
                  isActive
                    ? 'text-primary lg:bg-primary/10'
                    : 'text-muted-foreground hover:bg-accent/50 lg:hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              <item.icon className="h-[22px] w-[22px] lg:h-4 lg:w-4" />
              <span className="text-[10px] lg:text-sm tracking-tight">{item.label}</span>
            </NavLink>
          </React.Fragment>
        ))}
      </div>

      {/* Settings & Version (Desktop Only) */}
      <div className="hidden lg:block p-3 border-t border-border/50">
        <NavLink
          id="tour-target-settings-nav"
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )
          }
        >
          <Settings className="h-4 w-4" />
          Settings
        </NavLink>
        <div className="pt-2 px-3 pb-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 flex items-center gap-1.5">
            moniq v{version}{' '}
            <BetaTag className="scale-[0.8] opacity-50 px-1 border-none shadow-none" />
          </p>
        </div>
      </div>
    </aside>
  );
}
