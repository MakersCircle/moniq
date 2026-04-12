import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface PageShellProps {
  title?: string;
  subtitle?: string;
  headerRight?: ReactNode;
  children: ReactNode;
  noPad?: boolean;
  hasBack?: boolean;
}

export default function PageShell({ title, subtitle, headerRight, children, noPad, hasBack }: PageShellProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 sm:pb-0">
      {(title || headerRight || hasBack) && (
        <header className="px-5 py-6 flex items-center gap-4 sticky top-0 bg-background/80 backdrop-blur-md z-40">
          {hasBack && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(-1)} 
              className="-ml-2 shrink-0 h-9 w-9"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="flex-1 min-w-0">
            {title && <h1 className="text-2xl font-bold tracking-tight">{title}</h1>}
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {headerRight && <div className="ml-4 shrink-0">{headerRight}</div>}
        </header>
      )}
      <main className={cn(
        "px-5",
        noPad && "px-0"
      )}>
        {children}
      </main>
    </div>
  );
}


