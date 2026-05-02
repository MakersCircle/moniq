import { Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useRef } from 'react';

interface TopBarProps {
  onNewTransaction: () => void;
}

export default function TopBar({ onNewTransaction }: TopBarProps) {
  const searchRef = useRef<HTMLInputElement>(null);

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
    <header className="h-[48px] fixed top-0 right-0 left-[220px] bg-background/80 backdrop-blur-md border-b border-border z-40 flex items-center px-6 justify-between">
      {/* Search area - center aligned in the available space */}
      <div className="flex-1 flex justify-center">
        <div className="relative w-full max-w-[400px] h-8 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search transactions, sources... (/)"
            className="w-full h-full bg-accent/30 hover:bg-accent/50 focus:bg-accent/50 border border-transparent focus:border-primary/30 rounded-lg pl-9 pr-3 text-xs outline-none transition-all"
            onClick={() => {
              /* TODO: Global search palette */
            }}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded border border-border bg-background text-[10px] text-muted-foreground font-mono pointer-events-none">
            /
          </div>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          className="h-8 gap-1.5 text-xs px-3 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all active:scale-95"
          onClick={() => onNewTransaction()}
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Transaction</span>
        </Button>
      </div>
    </header>
  );
}
