import { Info } from 'lucide-react';

interface InfoTooltipProps {
  text: string;
  position?: 'top' | 'bottom';
}

export function InfoTooltip({ text, position = 'top' }: InfoTooltipProps) {
  return (
    <div className="group relative inline-flex items-center justify-center">
      <Info className="h-3.5 w-3.5 text-muted-foreground ml-1.5 flex-shrink-0 cursor-help transition-colors hover:text-foreground" />
      <div
        className={`pointer-events-none absolute left-1/2 z-50 w-64 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100 ${
          position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
        }`}
      >
        <div className="rounded-md bg-popover px-3 py-2 text-[10px] font-medium leading-tight text-popover-foreground shadow-md border border-border">
          {text}
        </div>
      </div>
    </div>
  );
}
