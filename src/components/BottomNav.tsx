import { useLocation, Link } from 'react-router-dom';
import { LayoutDashboard, List, PlusCircle, Settings } from 'lucide-react';
import './BottomNav.css';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: List, label: 'Ledger' },
  { to: '/add', icon: PlusCircle, label: 'Add', accent: true },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
      {navItems.map(({ to, icon: Icon, label, accent }) => {
        const isActive = to === '/' ? pathname === '/' : pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            className={`nav-item${isActive ? ' active' : ''}${accent ? ' nav-accent' : ''}`}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon size={accent ? 28 : 22} strokeWidth={accent ? 2.5 : isActive ? 2 : 1.5} />
            {!accent && <span className="nav-label">{label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
