import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Insights from './pages/Insights';
import Budget from './pages/Budget';
import SettingsIndex from './pages/Settings/index';
import Sources from './pages/Settings/Sources';
import Methods from './pages/Settings/Methods';
import Categories from './pages/Settings/Categories';
import Login from './pages/Login';
import LayoutShell from './components/Layout/LayoutShell';
import { useDataStore } from './store/dataStore';
import { fetchUserProfile, initializeDatabase } from './api/google';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import AddTransactionModal from './components/Transactions/AddTransactionModal';

export default function App() {
  const accessToken = useDataStore((s) => s.accessToken);
  const setUserProfile = useDataStore((s) => s.setUserProfile);
  const setSpreadsheetId = useDataStore((s) => s.setSpreadsheetId);
  
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    initialData?: any;
    isDuplicate?: boolean;
  }>({ isOpen: false });

  const openNew = () => setModalState({ isOpen: true });
  const openEdit = (data: any) => setModalState({ isOpen: true, initialData: data });
  const openDuplicate = (data: any) => setModalState({ isOpen: true, initialData: data, isDuplicate: true });

  useEffect(() => {
    if (!accessToken) return;

    async function initCloud() {
      try {
        const profile = await fetchUserProfile(accessToken!);
        setUserProfile(profile);

        const sheetId = await initializeDatabase(accessToken!);
        setSpreadsheetId(sheetId);
        
        // TODO: Initial sync down from sheets to populate store if returning user
      } catch (err) {
        console.error('Failed to initialize cloud database:', err);
      }
    }

    initCloud();
  }, [accessToken, setUserProfile, setSpreadsheetId]);

  if (!accessToken) {
    return <Login />;
  }

  // To allow child pages to trigger the modal, we'll store the trigger functions in a window object 
  // or a better yet, just pass them down or use a global store for UI state. 
  // For now, I'll add them to window for quick access from the Ledger.
  (window as any).openTransactionModal = { openNew, openEdit, openDuplicate };

  return (
    <BrowserRouter>
      <LayoutShell onNewTransaction={openNew}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/budget" element={<Budget />} />
          <Route path="/settings" element={<SettingsIndex />} />
          <Route path="/settings/sources" element={<Sources />} />
          <Route path="/settings/methods" element={<Methods />} />
          <Route path="/settings/categories" element={<Categories />} />
        </Routes>
      </LayoutShell>

      <Dialog 
        open={modalState.isOpen} 
        onOpenChange={(open) => setModalState(prev => ({ ...prev, isOpen: open }))}
      >
        <DialogContent className="max-w-[520px] p-0 overflow-hidden border-none shadow-2xl">
          <AddTransactionModal 
            initialData={modalState.initialData}
            isDuplicate={modalState.isDuplicate}
            onClose={() => setModalState({ isOpen: false })} 
          />
        </DialogContent>
      </Dialog>
    </BrowserRouter>
  );
}
