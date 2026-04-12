import { type ReactNode } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface LayoutShellProps {
  children: ReactNode;
  onNewTransaction: () => void;
}

export default function LayoutShell({ children, onNewTransaction }: LayoutShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="pl-[220px]">
        <TopBar onNewTransaction={onNewTransaction} />
        <main className="mt-[48px] p-8 max-w-[1248px] mx-auto min-h-[calc(100vh-48px)]">
          {children}
        </main>
      </div>
    </div>
  );
}
