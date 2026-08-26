import { Search, Plus, RefreshCw, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDataStore } from '@/store/dataStore';
import { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { BetaTag } from '../ui/BetaTag';

interface TopBarProps {
  onNewTransaction: () => void;
}

export default function TopBar({ onNewTransaction }: TopBarProps) {
  const { syncStatus } = useDataStore();
  const searchRef = useRef<HTMLInputElement>(null);

  const isSyncing = syncStatus === 'syncing' || syncStatus === 'pulling';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="h-14 lg:h-16 fixed top-0 right-0 left-0 lg:left-[220px] bg-background/80 backdrop-blur-md border-b border-border z-40 flex items-center px-4 lg:px-6 justify-between">
      {/* Mobile Logo */}
      <div className="flex lg:hidden items-center mr-4">
        <NavLink to="/" className="flex items-center gap-1.5 group">
          <img src="/moniq-wordmark.svg" alt="moniq logo" className="h-6 object-contain" />
          <BetaTag className="ml-0.5 scale-75 origin-left" />
        </NavLink>
      </div>

      {/* Search area - center aligned in the available space */}
      <div className="flex-1 flex justify-end min-[400px]:justify-center px-2 lg:px-0">
        <div className="relative w-10 min-[400px]:w-full min-[400px]:max-w-[200px] lg:max-w-[400px] h-10 lg:h-9 group transition-all duration-300">
          <Search
            className="absolute left-2.5 min-[400px]:left-2.5 lg:left-3 top-1/2 -translate-y-1/2 h-5 w-5 min-[400px]:h-4 min-[400px]:w-4 lg:h-4 lg:w-4 text-muted-foreground group-focus-within:text-primary transition-colors cursor-pointer z-10"
            onClick={() => searchRef.current?.focus()}
          />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search... (/)"
            className="w-full h-full bg-transparent min-[400px]:bg-accent/30 focus:bg-accent/50 border border-transparent focus:border-primary/30 rounded-lg pl-9 lg:pl-10 pr-3 text-sm lg:text-xs outline-none transition-all cursor-pointer min-[400px]:cursor-text opacity-0 min-[400px]:opacity-100 focus:opacity-100 absolute min-[400px]:relative right-0 focus:w-[200px] lg:focus:w-full z-20 focus:cursor-text focus:bg-background min-[400px]:focus:bg-accent/50"
            onClick={() => {
              /* TODO: Global search palette */
            }}
          />
          <div className="hidden lg:block absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded border border-border bg-background text-[10px] text-muted-foreground font-mono pointer-events-none z-10">
            /
          </div>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 lg:gap-3">
        {isSyncing && (
          <div className="flex items-center gap-1.5 px-2 py-1.5 lg:py-1 rounded-md bg-accent/30 border border-border/50 text-muted-foreground animate-pulse">
            <RefreshCw className="h-4 w-4 lg:h-3.5 lg:w-3.5 animate-spin" />
            <span className="hidden lg:inline text-[10px] font-medium tracking-wide uppercase">
              Syncing
            </span>
          </div>
        )}

        {/* Desktop New Transaction */}
        <Button
          id="tour-target-new-tx"
          size="sm"
          className="hidden lg:flex h-9 gap-1.5 text-sm px-4 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all active:scale-95"
          onClick={() => onNewTransaction()}
        >
          <Plus className="h-4 w-4" />
          <span>New Transaction</span>
        </Button>

        {/* Mobile Settings Icon */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `lg:hidden flex h-10 w-10 items-center justify-center rounded-md ${
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`
          }
        >
          <Settings className="h-5 w-5" />
        </NavLink>
      </div>
    </header>
  );
}
