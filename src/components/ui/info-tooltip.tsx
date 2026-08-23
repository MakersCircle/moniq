import { Info } from 'lucide-react';
import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface InfoTooltipProps {
  text: React.ReactNode;
  position?: 'top' | 'bottom';
}

export function InfoTooltip({ text, position = 'top' }: InfoTooltipProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center text-muted-foreground ml-1.5 hover:text-foreground transition-colors cursor-help outline-none"
        >
          <Info className="h-3.5 w-3.5" />
          <span className="sr-only">Info</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={position}
        sideOffset={6}
        className="w-64 p-3 text-xs font-medium leading-tight shadow-md"
      >
        {text}
      </PopoverContent>
    </Popover>
  );
}
