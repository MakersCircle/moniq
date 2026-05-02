import { useEffect, type ReactNode } from 'react';
import { type TransactionType } from '@/types';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useDataStore } from '@/store/dataStore';
import OnboardingModal from '@/components/Onboarding/OnboardingModal';
import SessionExpiredBanner from './SessionExpiredBanner';

interface LayoutShellProps {
  children: ReactNode;
  onNewTransaction: (type?: TransactionType) => void;
}

export default function LayoutShell({ children, onNewTransaction }: LayoutShellProps) {
  const { settings, accounts, isCloudInitialized, accessToken } = useDataStore();
  const showOnboarding =
    isCloudInitialized && accounts.length === 0 && !settings.hasCompletedOnboarding;
  const isSessionExpired = !accessToken && isCloudInitialized;

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
      {showOnboarding && <OnboardingModal />}
      <Sidebar />
      <TopBar onNewTransaction={onNewTransaction} />
      <div className="pl-[220px] pt-[48px] h-screen">
        <main
          id="main-scroll-container"
          className="h-full w-full overflow-y-auto custom-scrollbar flex flex-col"
        >
          {isSessionExpired && <SessionExpiredBanner />}
          <div className="p-8 max-w-[1248px] mx-auto min-h-full flex flex-col w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
