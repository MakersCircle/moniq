import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Insights from './pages/Insights';
import Budget from './pages/Budget';
import SettingsIndex from './pages/Settings/index';
import Accounts from './pages/Settings/Accounts';
import Methods from './pages/Settings/Methods';
import Categories from './pages/Settings/Categories';
import Home from './pages/Home';
import LayoutShell from './components/Layout/LayoutShell';
import { useDataStore } from './store/dataStore';
import { fetchUserProfile, initializeDatabase } from './api/google';
import { SyncEngine } from './sync/SyncEngine';
import { Dialog, DialogContent } from '@/components/ui/dialog';

import AddTransactionModal from './components/Transactions/AddTransactionModal';

export default function App() {
  const accessToken = useDataStore((s) => s.accessToken);
  const transactions = useDataStore((s) => s.transactions);
  const setUserProfile = useDataStore((s) => s.setUserProfile);
  const setSpreadsheetId = useDataStore((s) => s.setSpreadsheetId);
  const setSyncStatus = useDataStore((s) => s.setSyncStatus);
  const hydrateFromSync = useDataStore((s) => s.hydrateFromSync);
  
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
        
        // Initialize SyncEngine — pulls from sheets, reconciles, and hydrates store
        const engine = SyncEngine.getInstance();
        
        // Subscribe to sync status changes
        const unsubscribe = engine.subscribe((status, pendingCount, error) => {
          setSyncStatus(status, pendingCount, error);
        });

        const reconciledData = await engine.initialize(accessToken!, sheetId);
        if (reconciledData) {
          hydrateFromSync(reconciledData);
        }

        // Cleanup subscription on unmount
        return () => unsubscribe();
      } catch (err: any) {
        console.error('Failed to initialize cloud database:', err);
        // If the token is invalid/expired (e.g., 401), clear it to return the user to the login state
        if (err.message === 'Failed to fetch user profile' || (err.message && err.message.includes('401'))) {
          useDataStore.getState().setAccessToken(null);
        }
      }
    }

    initCloud();
  }, [accessToken, setUserProfile, setSpreadsheetId, setSyncStatus, hydrateFromSync]);

  const hasTransactions = transactions.length > 0;

  // To allow child pages to trigger the modal, we'll store the trigger functions in a window object 
  // or a better yet, just pass them down or use a global store for UI state. 
  // For now, I'll add them to window for quick access from the Ledger.
  if (accessToken) {
    (window as any).openTransactionModal = { openNew, openEdit, openDuplicate };
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Landing/Home page - No Sidebar/TopBar */}
        <Route 
          path="/" 
          element={
            accessToken && hasTransactions 
              ? <Navigate to="/dashboard" replace /> 
              : <Home />
          } 
        />

        {/* Application routes - Wrapped in LayoutShell */}
        <Route
          path="*"
          element={
            accessToken ? (
              <LayoutShell onNewTransaction={openNew}>
                <Routes>
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="transactions" element={<Transactions />} />
                  <Route path="insights" element={<Insights />} />
                  <Route path="budget" element={<Budget />} />
                  <Route path="settings" element={<SettingsIndex />} />
                  <Route path="settings/accounts" element={<Accounts />} />
                  <Route path="settings/methods" element={<Methods />} />
                  <Route path="settings/categories" element={<Categories />} />
                  <Route path="*" element={<Navigate to={hasTransactions ? "/dashboard" : "/"} replace />} />
                </Routes>
              </LayoutShell>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
      </Routes>

      {accessToken && (
        <Dialog 
          open={modalState.isOpen} 
          onOpenChange={(open) => setModalState(prev => ({ ...prev, isOpen: open }))}
        >
          <DialogContent className="max-w-130 max-h-[90vh] h-auto flex flex-col p-0 overflow-hidden border-none shadow-2xl">
            <AddTransactionModal 
              initialData={modalState.initialData}
              isDuplicate={modalState.isDuplicate}
              onClose={() => setModalState({ isOpen: false })} 
            />
          </DialogContent>
        </Dialog>
      )}
    </BrowserRouter>
  );
}
