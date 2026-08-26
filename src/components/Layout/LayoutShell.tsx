import { useEffect, type ReactNode } from 'react';
import { type TransactionType } from '@/types';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useDataStore } from '@/store/dataStore';
import SessionExpiredBanner from './SessionExpiredBanner';
import DemoBanner from './DemoBanner';

interface LayoutShellProps {
  children: ReactNode;
  onNewTransaction: (type?: TransactionType) => void;
}

export default function LayoutShell({ children, onNewTransaction }: LayoutShellProps) {
  const { isCloudInitialized, accessToken, isDemoMode, lastSyncedAt } = useDataStore();

  const isSessionExpired = !accessToken && isCloudInitialized && !isDemoMode && !!lastSyncedAt;

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
    <div className="h-screen bg-background text-foreground overflow-hidden">
      <Sidebar onNewTransaction={() => onNewTransaction()} />
      <TopBar onNewTransaction={() => onNewTransaction()} />
      <div className="lg:pl-[220px] pt-14 lg:pt-16 pb-[60px] lg:pb-0 h-[100dvh]">
        <main
          id="main-scroll-container"
          className="h-full w-full overflow-y-auto custom-scrollbar flex flex-col"
        >
          {isDemoMode && <DemoBanner />}
          {isSessionExpired && <SessionExpiredBanner />}
          <div className="p-8 max-w-[1248px] mx-auto min-h-full flex flex-col w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
