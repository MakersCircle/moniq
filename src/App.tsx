import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState, useCallback, useRef, Suspense, lazy } from 'react';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Insights = lazy(() => import('./pages/Insights'));
const Budget = lazy(() => import('./pages/Budget'));
const SettingsIndex = lazy(() => import('./pages/Settings/index'));
const Accounts = lazy(() => import('./pages/Settings/Accounts'));
const Methods = lazy(() => import('./pages/Settings/Methods'));
const Categories = lazy(() => import('./pages/Settings/Categories'));
const SettingsTrash = lazy(() => import('./pages/Settings/Trash'));
import Home from './pages/Home';
const DocsPage = lazy(() => import('./pages/Docs'));
const PrivacyPolicy = lazy(() => import('./pages/Legal/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/Legal/TermsOfService'));
import LayoutShell from './components/Layout/LayoutShell';
import { useDataStore } from './store/dataStore';
import { fetchUserProfile, initializeDatabase } from './api/google';
import { SyncEngine } from './sync/SyncEngine';
import AccountUnlockScreen from './components/AccountUnlockScreen';
import { hasLocalWorkspace, hasStoredWorkspace } from './lib/localWorkspace';
import { getMeta, setMeta } from './lib/db';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { googleLogout } from '@react-oauth/google';

import TransactionForm from './components/Transactions/TransactionForm';
import type { Transaction, TransactionType } from './types';

export default function App() {
  const localWorkspaceReady = useDataStore(hasLocalWorkspace);
  const storedWorkspace = useDataStore(hasStoredWorkspace);
  const trustOnUnlock = useRef(false);
  const accessToken = useDataStore(s => s.accessToken);
  const tokenExpiresAt = useDataStore(s => s.tokenExpiresAt);
  const setUserProfile = useDataStore(s => s.setUserProfile);
  const setSpreadsheetId = useDataStore(s => s.setSpreadsheetId);
  const setSyncStatus = useDataStore(s => s.setSyncStatus);
  const hydrateFromSync = useDataStore(s => s.hydrateFromSync);

  const isHydrated = useDataStore(s => s.isHydrated);
  const isCloudInitialized = useDataStore(s => s.isCloudInitialized);
  const isInitialCloudLoadPending = useDataStore(s => s.isInitialCloudLoadPending);
  const syncStatus = useDataStore(s => s.syncStatus);
  const initializeFromDB = useDataStore(s => s.initializeFromDB);
  const isDemoMode = useDataStore(s => s.isDemoMode);
  const canUseWorkspace = localWorkspaceReady || isCloudInitialized || isDemoMode;

  const [initError, setInitError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const hydrationStarted = useRef(false);

  const handleDisconnect = useCallback(async () => {
    googleLogout();
    useDataStore.getState().setAccessToken(null);
    await useDataStore.getState().setUserProfile(null);
    SyncEngine.reset();
  }, []);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    initialData?: Transaction;
    isDuplicate?: boolean;
    defaultType?: TransactionType;
  }>({ isOpen: false });

  const [initPhase, setInitPhase] = useState<'connecting' | 'creating-folder' | 'creating-sheet'>(
    'connecting'
  );

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
    if (hydrationStarted.current) return;
    hydrationStarted.current = true;
    initializeFromDB();
  }, [initializeFromDB]);

  // Expiry pauses Google sync; local access is independent of this token.
  useEffect(() => {
    if (!accessToken || isDemoMode) return;
    const check = () => {
      const state = useDataStore.getState();
      if (state.tokenExpiresAt && Date.now() >= state.tokenExpiresAt) state.expireSession();
    };
    check();
    const interval = setInterval(check, 30_000);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [accessToken, tokenExpiresAt, isDemoMode]);

  useEffect(() => {
    if (isDemoMode || (!accessToken && !localWorkspaceReady)) return;
    return SyncEngine.getInstance().subscribe(setSyncStatus);
  }, [accessToken, localWorkspaceReady, setSyncStatus, isDemoMode]);

  // Stable ref for hydrateFromSync so it doesn't cause initCloud to re-run on every settings update
  const hydrateFromSyncRef = useRef(hydrateFromSync);
  useEffect(() => {
    hydrateFromSyncRef.current = hydrateFromSync;
  }, [hydrateFromSync]);

  // 4. Cloud initialization (Google Sheets)
  useEffect(() => {
    if (!accessToken || !isHydrated || isDemoMode) return;

    let cancelled = false;
    async function initCloud() {
      setInitError(null);
      try {
        if (tokenExpiresAt && Date.now() >= tokenExpiresAt) {
          useDataStore.getState().expireSession();
          return;
        }

        const cachedProfile = useDataStore.getState().userProfile;
        const profile = await fetchUserProfile();
        if (!profile.picture && cachedProfile?.email === profile.email) {
          profile.picture = cachedProfile.picture;
        }

        // ── Account-switch detection ──────────────────────────────────
        // Reconnection must use the account that owns these local records.
        const storedEmail = await getMeta('userEmail');
        if (cancelled || useDataStore.getState().accessToken !== accessToken) return;
        if (storedEmail && storedEmail !== profile.email) {
          useDataStore.getState().expireSession();
          toast.error(`Reconnect with ${storedEmail} to sync this device's records.`);
          return;
        }
        // Persist the current user's email for future account-switch checks.
        await setMeta('userEmail', profile.email);

        await setUserProfile(profile);
        useDataStore.getState().setVerifiedAccessToken(accessToken!);
        if (trustOnUnlock.current) {
          trustOnUnlock.current = false;
          await useDataStore.getState().setDeviceTrusted(true);
        }

        const sheetId = await initializeDatabase(setInitPhase);
        setSpreadsheetId(sheetId);

        const engine = SyncEngine.getInstance();
        const reconciledData = await engine.initialize(sheetId);
        if (cancelled) return;
        if (reconciledData) {
          const wasAlreadyInitialized = useDataStore.getState().isCloudInitialized;
          hydrateFromSyncRef.current(reconciledData);
          if (wasAlreadyInitialized) {
            toast.success('Data synced from cloud');
          }

          // Trigger the backup check after a successful initial load
          engine.triggerBackupCycle();
        } else {
          throw new Error('Could not reconcile data with Google Sheets');
        }
      } catch (err) {
        if (cancelled) return;
        useDataStore.getState().setInitialCloudLoadPending(false);
        console.error('Failed to initialize cloud database:', err);
        setInitError(err instanceof Error ? err.message : 'Unknown connection error');
        // Returning users continue working locally while cloud access is unavailable.
      }
    }

    void initCloud();
    return () => {
      cancelled = true;
    };
  }, [
    accessToken,
    tokenExpiresAt,
    isHydrated,
    setUserProfile,
    setSpreadsheetId,
    retryCount,
    isDemoMode,
  ]);
  useEffect(() => {
    if (canUseWorkspace) {
      window.openTransactionModal = { openNew, openEdit, openDuplicate };
    }
  }, [canUseWorkspace, openNew, openEdit, openDuplicate]);

  if (isHydrated && storedWorkspace && !canUseWorkspace && !isDemoMode) {
    return (
      <>
        <AccountUnlockScreen
          error={initError}
          onRetry={() => setRetryCount(count => count + 1)}
          onTrustRequested={trusted => {
            trustOnUnlock.current = trusted;
          }}
        />
        <Toaster />
      </>
    );
  }

  const isBlockingCloudLoad =
    !!accessToken &&
    !isCloudInitialized &&
    !isDemoMode &&
    (isInitialCloudLoadPending || !storedWorkspace);

  if (
    !isHydrated ||
    (isBlockingCloudLoad && !initError) ||
    (!canUseWorkspace && !!accessToken && !!initError)
  ) {
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
            <Button
              onClick={() => setRetryCount(c => c + 1)}
              variant="secondary"
              className="w-full sm:w-auto"
            >
              Retry Connection
            </Button>
            <Button
              onClick={handleDisconnect}
              variant="ghost"
              className="text-zinc-500 hover:text-zinc-300 w-full sm:w-auto"
            >
              Sign Out
            </Button>
          </div>
        </div>
      );
    }

    const message = !isHydrated
      ? 'Loading your space...'
      : initPhase === 'creating-folder'
        ? 'Setting up your personal Drive folder...'
        : initPhase === 'creating-sheet'
          ? 'Initializing your Moniq database...'
          : syncStatus === 'pulling'
            ? 'Pulling your data from Google Drive...'
            : 'Connecting to Google Drive...';

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
      <Suspense
        fallback={
          <div className="flex h-[var(--app-viewport-height)] w-screen items-center justify-center text-muted-foreground">
            <div className="size-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        }
      >
        <Routes>
          {/* Landing/Home page - No Sidebar/TopBar */}
          <Route
            path="/"
            element={
              canUseWorkspace || accessToken ? <Navigate to="/dashboard" replace /> : <Home />
            }
          />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/docs" element={<Navigate to="/docs/getting-started" replace />} />
          <Route
            path="/docs/*"
            element={
              canUseWorkspace ? (
                <LayoutShell
                  onNewTransaction={openNew}
                  syncError={initError}
                  onRetrySync={() => setRetryCount(c => c + 1)}
                >
                  <DocsPage />
                </LayoutShell>
              ) : (
                <div className="min-h-[var(--app-viewport-height)] bg-[#09090b] text-slate-200 selection:bg-primary/30">
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
              canUseWorkspace || accessToken ? (
                <LayoutShell
                  onNewTransaction={openNew}
                  syncError={initError}
                  onRetrySync={() => setRetryCount(c => c + 1)}
                >
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
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </LayoutShell>
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
        </Routes>
      </Suspense>

      {canUseWorkspace && (
        <Dialog
          open={modalState.isOpen}
          onOpenChange={open => setModalState(prev => ({ ...prev, isOpen: open }))}
        >
          <DialogContent
            overlayClassName="bg-black/45 backdrop-blur-sm"
            className="w-full max-w-none sm:w-[95vw] sm:max-w-[520px] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-t-2xl sm:rounded-2xl top-auto bottom-0 left-0 right-0 translate-x-0 translate-y-0 sm:top-[50%] sm:left-[50%] sm:bottom-auto sm:right-auto sm:translate-x-[-50%] sm:translate-y-[-50%] h-auto max-h-[var(--app-viewport-height-minus-2rem)] sm:max-h-[var(--app-viewport-height-90)]"
          >
            <TransactionForm
              initialData={modalState.initialData}
              isDuplicate={modalState.isDuplicate}
              defaultType={modalState.defaultType}
              onClose={() => setModalState({ isOpen: false })}
            />
          </DialogContent>
        </Dialog>
      )}

      <Toaster />
    </BrowserRouter>
  );
}
