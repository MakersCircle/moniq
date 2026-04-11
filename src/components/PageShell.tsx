import { type ReactNode } from 'react';
import './PageShell.css';

interface PageShellProps {
  title?: string;
  subtitle?: string;
  headerRight?: ReactNode;
  children: ReactNode;
  noPad?: boolean;
}

export default function PageShell({ title, subtitle, headerRight, children, noPad }: PageShellProps) {
  return (
    <div className="page-shell">
      {(title || headerRight) && (
        <header className="page-header">
          <div className="page-header-text">
            {title && <h1 className="page-title">{title}</h1>}
            {subtitle && <p className="page-subtitle">{subtitle}</p>}
          </div>
          {headerRight && <div className="page-header-right">{headerRight}</div>}
        </header>
      )}
      <main className={`page-content${noPad ? ' no-pad' : ''}`}>
        {children}
      </main>
    </div>
  );
}
