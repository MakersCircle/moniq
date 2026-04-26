import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const InputGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('relative flex w-full h-9', className)} {...props} />
  )
);
InputGroup.displayName = 'InputGroup';

const InputGroupInput = React.forwardRef<HTMLInputElement, React.ComponentProps<typeof Input>>(
  ({ className, ...props }, ref) => (
    <Input
      ref={ref}
      className={cn(
        'h-full pr-10 bg-muted/40 border-transparent focus:border-primary/30 transition-all font-mono',
        className
      )}
      {...props}
    />
  )
);
InputGroupInput.displayName = 'InputGroupInput';

const InputGroupAddon = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { align?: 'inline-start' | 'inline-end' }
>(({ className, align = 'inline-start', ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'absolute top-0 flex h-full items-center justify-center',
      align === 'inline-start' ? 'left-0 pl-3' : 'right-0 pr-1',
      className
    )}
    {...props}
  />
));
InputGroupAddon.displayName = 'InputGroupAddon';

const InputGroupButton = React.forwardRef<
  React.ElementRef<typeof Button>,
  React.ComponentPropsWithoutRef<typeof Button>
>(({ className, variant = 'ghost', size = 'icon', ...props }, ref) => (
  <Button
    ref={ref}
    variant={variant}
    size={size}
    className={cn(
      'h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-transparent',
      className
    )}
    {...props}
  />
));
InputGroupButton.displayName = 'InputGroupButton';

export { InputGroup, InputGroupInput, InputGroupAddon, InputGroupButton };
