import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import AddTransaction from './pages/AddTransaction';
import SettingsIndex from './pages/Settings/index';
import Sources from './pages/Settings/Sources';
import Methods from './pages/Settings/Methods';
import Categories from './pages/Settings/Categories';

export default function App() {
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
