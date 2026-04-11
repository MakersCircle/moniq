import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import BottomNav from './components/BottomNav';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import AddTransaction from './pages/AddTransaction';
import SettingsIndex from './pages/Settings/index';
import Sources from './pages/Settings/Sources';
import Methods from './pages/Settings/Methods';
import Categories from './pages/Settings/Categories';
import Login from './pages/Login';
import { useDataStore } from './store/dataStore';
import { fetchUserProfile, initializeDatabase } from './api/google';

export default function App() {
  const accessToken = useDataStore((s) => s.accessToken);
  const setUserProfile = useDataStore((s) => s.setUserProfile);
  const setSpreadsheetId = useDataStore((s) => s.setSpreadsheetId);

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

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/add" element={<AddTransaction />} />
        <Route path="/settings" element={<SettingsIndex />} />
        <Route path="/settings/sources" element={<Sources />} />
        <Route path="/settings/methods" element={<Methods />} />
        <Route path="/settings/categories" element={<Categories />} />
      </Routes>
      <BottomNav />
    </BrowserRouter>
  );
}
