import { type ReactNode } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useDataStore } from '@/store/dataStore';
import OnboardingModal from '@/components/Onboarding/OnboardingModal';
import SessionExpiredBanner from './SessionExpiredBanner';

interface LayoutShellProps {
  children: ReactNode;
  onNewTransaction: () => void;
}

export default function LayoutShell({ children, onNewTransaction }: LayoutShellProps) {
  const { settings, accounts, isCloudInitialized, accessToken } = useDataStore();
  const showOnboarding =
    isCloudInitialized && accounts.length === 0 && !settings.hasCompletedOnboarding;
  const isSessionExpired = !accessToken && isCloudInitialized;

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
