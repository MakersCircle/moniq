import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';

interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  /** Extra classes for the header section */
  headerClassName?: string;
}

/**
 * Renders a centered Dialog on desktop (≥640px) and a bottom Sheet on mobile (<640px).
 * Drop-in replacement for Dialog in Settings pages.
 */
export function ResponsiveModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  headerClassName,
}: ResponsiveModalProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="flex flex-col p-0 rounded-t-2xl border-t shadow-2xl overflow-hidden max-h-[calc(100dvh-3rem)] h-auto"
        >
          {(title || description) && (
            <SheetHeader
              className={cn(
                'px-6 py-4 border-b border-border/50 shrink-0 space-y-1',
                headerClassName
              )}
            >
              {title && (
                <SheetTitle className="text-xl font-bold tracking-tight">{title}</SheetTitle>
              )}
              {description && (
                <SheetDescription className="text-xs">{description}</SheetDescription>
              )}
            </SheetHeader>
          )}
          <div className="flex-1 overflow-y-auto min-h-0">{children}</div>
          {footer && (
            <SheetFooter className="px-6 py-4 border-t border-border/50 shrink-0 flex-col-reverse sm:flex-row gap-2">
              {footer}
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md flex flex-col p-0 overflow-hidden border-none shadow-2xl">
        {(title || description) && (
          <DialogHeader
            className={cn(
              'px-6 py-4 border-b border-border/50 shrink-0 space-y-1',
              headerClassName
            )}
          >
            {title && (
              <DialogTitle className="text-xl font-bold tracking-tight">{title}</DialogTitle>
            )}
            {description && (
              <DialogDescription className="text-xs">{description}</DialogDescription>
            )}
          </DialogHeader>
        )}
        <div className="flex-1 overflow-y-auto min-h-0">{children}</div>
        {footer && (
          <DialogFooter className="px-6 py-4 border-t border-border/50 shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
