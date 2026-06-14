import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
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
import DocsPage from './pages/Docs';
import PrivacyPolicy from './pages/Legal/PrivacyPolicy';
import TermsOfService from './pages/Legal/TermsOfService';
import LayoutShell from './components/Layout/LayoutShell';
import { useDataStore } from './store/dataStore';
import { fetchUserProfile, initializeDatabase } from './api/google';
import { SyncEngine } from './sync/SyncEngine';
import { googleService } from './lib/google';
import { getMeta, setMeta } from './lib/db';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { googleLogout } from '@react-oauth/google';

import AddTransactionModal from './components/Transactions/AddTransactionModal';
import type { Transaction, TransactionType } from './types';

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

  const [initError, setInitError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showSyncToast, setShowSyncToast] = useState(false);

  const handleDisconnect = useCallback(() => {
    googleLogout();
    useDataStore.getState().setAccessToken(null);
    useDataStore.getState().setUserProfile(null);
    SyncEngine.reset();
  }, []);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    initialData?: Transaction;
    isDuplicate?: boolean;
    defaultType?: TransactionType;
  }>({ isOpen: false });

  const openNew = useCallback((type?: TransactionType | React.MouseEvent | React.KeyboardEvent) => {
    // If called as an event handler (e.g. onClick), the first arg is an event object.
    // We only want to set defaultType if it's a valid string.
    const actualType = typeof type === 'string' ? type : undefined;
    setModalState({ isOpen: true, defaultType: actualType });
  }, []);
  const openEdit = useCallback(
    (data: Transaction) => setModalState({ isOpen: true, initialData: data }),
    []
  );
  const openDuplicate = useCallback(
    (data: Transaction) => setModalState({ isOpen: true, initialData: data, isDuplicate: true }),
    []
  );

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

  // 3. SyncEngine Subscription
  useEffect(() => {
    if (!accessToken) return;

    const engine = SyncEngine.getInstance();
    const unsubscribe = engine.subscribe((status, pendingCount, error) => {
      setSyncStatus(status, pendingCount, error);
    });

    return () => unsubscribe();
  }, [accessToken, setSyncStatus]);

  // 4. Cloud initialization (Google Sheets)
  useEffect(() => {
    if (!accessToken || !isHydrated) return;

    async function initCloud() {
      setInitError(null);
      try {
        // If token is expired or near expiry, try silent refresh first
        if (tokenExpiresAt && Date.now() > tokenExpiresAt - 300000) {
          console.log('[App] Token expired or near expiry, refreshing...');
          const newToken = await googleService.silentRefresh();
          if (!newToken) {
            // Cannot refresh — unblock the spinner and surface the error so the
            // user sees the Session Expired banner rather than a frozen screen.
            console.warn('[App] Silent refresh failed — unblocking spinner.');
            setCloudInitialized(true);
            return;
          }
        }

        const profile = await fetchUserProfile();

        // ── Account-switch detection ──────────────────────────────────
        // If a different Google account logs in on this device, clear the
        // stored Drive IDs so we don't accidentally connect them to a
        // previous user's spreadsheet.
        const storedEmail = await getMeta('userEmail');
        if (storedEmail && storedEmail !== profile.email) {
          console.log('[App] Different Google account detected — clearing Drive IDs.');
          const store = useDataStore.getState();
          store.setSpreadsheetId(null);
          store.setFolderId(null);
          store.setBackupFolderId(null);
        }
        // Persist the current user's email for future account-switch checks.
        await setMeta('userEmail', profile.email);

        setUserProfile(profile);

        const sheetId = await initializeDatabase();
        setSpreadsheetId(sheetId);

        const engine = SyncEngine.getInstance();
        const reconciledData = await engine.initialize(sheetId);
        if (reconciledData) {
          const wasAlreadyInitialized = useDataStore.getState().isCloudInitialized;
          hydrateFromSync(reconciledData);
          if (wasAlreadyInitialized) {
            setShowSyncToast(true);
            setTimeout(() => setShowSyncToast(false), 3500);
          }
        } else {
          setCloudInitialized(true);
        }
      } catch (err) {
        console.error('Failed to initialize cloud database:', err);
        setInitError(err instanceof Error ? err.message : 'Unknown connection error');
        // Do not call setCloudInitialized(true) here! The app should not proceed into a broken state.
      }
    }

    initCloud();
  }, [
    accessToken,
    tokenExpiresAt,
    isHydrated,
    setUserProfile,
    setSpreadsheetId,
    hydrateFromSync,
    setCloudInitialized,
    retryCount,
  ]);

  const hasCompletedOnboarding = settings.hasCompletedOnboarding;

  useEffect(() => {
    if (accessToken) {
      window.openTransactionModal = { openNew, openEdit, openDuplicate };
    }
  }, [accessToken, openNew, openEdit, openDuplicate]);

  if (!isHydrated || (accessToken && !isCloudInitialized)) {
    if (initError) {
      return (
        <div className="fixed inset-0 bg-zinc-950 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center max-w-md px-6">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-zinc-100 text-lg font-medium">Connection Error</h3>
            <p className="text-zinc-400 text-sm mb-4">
              We couldn't connect to your Google Drive. {initError}
            </p>
            <Button onClick={() => setRetryCount(c => c + 1)} variant="secondary" className="w-full sm:w-auto">
              Retry Connection
            </Button>
            <Button onClick={handleDisconnect} variant="ghost" className="text-zinc-500 hover:text-zinc-300 w-full sm:w-auto">
              Sign Out
            </Button>
          </div>
        </div>
      );
    }

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
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/docs" element={<Navigate to="/docs/user/getting-started" replace />} />
        <Route
          path="/docs/:category/*"
          element={
            accessToken || isCloudInitialized ? (
              <LayoutShell onNewTransaction={openNew}>
                <DocsPage />
              </LayoutShell>
            ) : (
              <div className="min-h-screen bg-[#09090b] text-slate-200 selection:bg-primary/30">
                <div className="max-w-[1248px] mx-auto p-6 md:p-12 pt-20">
                  <DocsPage />
                </div>
              </div>
            )
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
              defaultType={modalState.defaultType}
              onClose={() => setModalState({ isOpen: false })}
            />
          </DialogContent>
        </Dialog>
      )}

      {showSyncToast && (
        <div className="fixed bottom-6 right-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 z-[100] pointer-events-none">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-sm font-medium">Data synced from cloud</span>
        </div>
      )}
    </BrowserRouter>
  );
}
