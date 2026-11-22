import { useEffect, type ReactNode } from 'react';
import { type TransactionType } from '@/types';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useDataStore } from '@/store/dataStore';
import { hasLocalWorkspace } from '@/lib/localWorkspace';
import SessionExpiredBanner from './SessionExpiredBanner';
import DemoBanner from './DemoBanner';

interface LayoutShellProps {
  children: ReactNode;
  onNewTransaction: (type?: TransactionType) => void;
  syncError?: string | null;
  onRetrySync?: () => void;
}

export default function LayoutShell({
  children,
  onNewTransaction,
  syncError,
  onRetrySync,
}: LayoutShellProps) {
  const localWorkspaceReady = useDataStore(hasLocalWorkspace);
  const { accessToken, isDemoMode } = useDataStore();

  const isSessionExpired = (!accessToken || !!syncError) && localWorkspaceReady && !isDemoMode;

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (isTyping) return;

      // Alt + N for New Transaction
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        onNewTransaction();
      }

      // Shift + I, E, T (only if no modifiers like Alt/Ctrl are present)
      if (e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey) {
        if (e.key === 'I') {
          e.preventDefault();
          onNewTransaction('income');
        } else if (e.key === 'E') {
          e.preventDefault();
          onNewTransaction('expense');
        } else if (e.key === 'T') {
          e.preventDefault();
          onNewTransaction('transfer');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNewTransaction]);

  return (
    <div className="h-[100dvh] bg-background text-foreground overflow-hidden">
      <Sidebar onNewTransaction={() => onNewTransaction()} />
      <TopBar onNewTransaction={() => onNewTransaction()} />
      <div className="lg:pl-[220px] pt-14 lg:pt-16 pb-[var(--mobile-nav-total-height)] lg:pb-0 h-[100dvh]">
        <main
          id="main-scroll-container"
          className="h-full w-full overflow-y-auto custom-scrollbar flex flex-col relative"
        >
          {isDemoMode && <DemoBanner />}
          {isSessionExpired && (
            <SessionExpiredBanner onRetry={accessToken && syncError ? onRetrySync : undefined} />
          )}
          <div className="relative flex-1 min-h-0 p-4 md:p-8 [@media(max-height:500px)]:p-3 max-w-[1248px] mx-auto flex flex-col w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
