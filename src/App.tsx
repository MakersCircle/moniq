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
import SettingsTrash from './pages/Settings/Trash';
import Home from './pages/Home';
import LayoutShell from './components/Layout/LayoutShell';
import { useDataStore } from './store/dataStore';
import { fetchUserProfile, initializeDatabase } from './api/google';
import { SyncEngine } from './sync/SyncEngine';
import { googleService } from './lib/google';
import { Dialog, DialogContent } from '@/components/ui/dialog';

import AddTransactionModal from './components/Transactions/AddTransactionModal';
import type { Transaction } from './types';

export default function App() {
  const accessToken = useDataStore(s => s.accessToken);
  const tokenExpiresAt = useDataStore(s => s.tokenExpiresAt);
  const setUserProfile = useDataStore(s => s.setUserProfile);
  const setSpreadsheetId = useDataStore(s => s.setSpreadsheetId);
  const setSyncStatus = useDataStore(s => s.setSyncStatus);
  const hydrateFromSync = useDataStore(s => s.hydrateFromSync);
  const settings = useDataStore(s => s.settings);
  const isHydrated = useDataStore(s => s.isHydrated);
  const isCloudInitialized = useDataStore(s => s.isCloudInitialized);
  const setCloudInitialized = useDataStore(s => s.setCloudInitialized);
  const syncStatus = useDataStore(s => s.syncStatus);
  const initializeFromDB = useDataStore(s => s.initializeFromDB);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    initialData?: Transaction;
    isDuplicate?: boolean;
  }>({ isOpen: false });

  const openNew = () => setModalState({ isOpen: true });
  const openEdit = (data: Transaction) => setModalState({ isOpen: true, initialData: data });
  const openDuplicate = (data: Transaction) =>
    setModalState({ isOpen: true, initialData: data, isDuplicate: true });

  // 1. Initial hydration from IndexedDB (structured)
  useEffect(() => {
    initializeFromDB();
  }, [initializeFromDB]);

  // 2. Proactive Token Refresh (checks every 5 minutes)
  useEffect(() => {
    if (!accessToken) return;

    const check = () => {
      const fiveMinutes = 5 * 60 * 1000;
      const isAboutToExpire = tokenExpiresAt && Date.now() > tokenExpiresAt - fiveMinutes;

      if (isAboutToExpire) {
        console.log('[App] Token about to expire, triggering proactive refresh...');
        googleService.silentRefresh();
      }
    };

    check(); // Check immediately on mount or dependency change
    const interval = setInterval(check, 60 * 1000); // And then every minute

    return () => clearInterval(interval);
  }, [accessToken, tokenExpiresAt]);

  // 3. Cloud initialization (Google Sheets)
  useEffect(() => {
    if (!accessToken || !isHydrated) return;

    async function initCloud() {
      try {
        // If token is expired or near expiry, try silent refresh first
        if (tokenExpiresAt && Date.now() > tokenExpiresAt - 300000) {
          console.log('[App] Token expired or near expiry, refreshing...');
          const newToken = await googleService.silentRefresh();
          if (!newToken) return; // Will redirect to home via token=null change
        }

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

        const reconciledData = await engine.initialize(sheetId);
        if (reconciledData) {
          hydrateFromSync(reconciledData);
        } else {
          setCloudInitialized(true);
        }

        // Cleanup subscription on unmount
        return () => unsubscribe();
      } catch (err) {
        console.error('Failed to initialize cloud database:', err);
        setCloudInitialized(true);
        // Unauthorized/Expired handled by googleService clearing the token
      }
    }

    initCloud();
  }, [
    accessToken,
    tokenExpiresAt,
    isHydrated,
    setUserProfile,
    setSpreadsheetId,
    setSyncStatus,
    hydrateFromSync,
  ]);

  const hasCompletedOnboarding = settings.hasCompletedOnboarding;

  useEffect(() => {
    if (accessToken) {
      window.openTransactionModal = { openNew, openEdit, openDuplicate };
    }
  }, [accessToken, openNew, openEdit, openDuplicate]);

  if (!isHydrated || (accessToken && !isCloudInitialized)) {
    const message = !isHydrated
      ? 'Loading your space...'
      : syncStatus === 'pulling'
        ? 'Pulling your data from Google Drive...'
        : 'Syncing your data...';

    return (
      <div className="fixed inset-0 bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-zinc-800 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-zinc-400 font-medium animate-pulse">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Landing/Home page - No Sidebar/TopBar */}
        <Route
          path="/"
          element={
            accessToken && hasCompletedOnboarding ? <Navigate to="/dashboard" replace /> : <Home />
          }
        />

        {/* Application routes - Wrapped in LayoutShell */}
        <Route
          path="*"
          element={
            accessToken || isCloudInitialized ? (
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
                  <Route path="settings/trash" element={<SettingsTrash />} />
                  <Route
                    path="*"
                    element={<Navigate to={hasCompletedOnboarding ? '/dashboard' : '/'} replace />}
                  />
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
          onOpenChange={open => setModalState(prev => ({ ...prev, isOpen: open }))}
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
