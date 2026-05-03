import React from 'react';
import { cn } from '@/lib/utils';

interface BetaTagProps {
  className?: string;
}

export function BetaTag({ className }: BetaTagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-[0.1em]',
        'bg-primary/10 text-primary border border-primary/20',
        'shadow-[0_0_12px_-2px_rgba(134,59,255,0.3)]',
        'backdrop-blur-md',
        className
      )}
    >
      Beta
    </span>
  );
}
