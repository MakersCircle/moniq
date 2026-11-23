import { useState } from 'react';
import { ListFilter } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { UserSettings } from '@/types';
import { formatCurrency } from '@/utils/format';

interface AmountFilterPopoverProps {
  minBound: number;
  maxBound: number;
  contextMin: number;
  contextMax: number;
  minAmount?: number;
  maxAmount?: number;
  settings: UserSettings;
  onChange: (minAmount: number, maxAmount: number) => void;
  onClear: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

export function AmountFilterPopover({
  minBound,
  maxBound,
  contextMin,
  contextMax,
  minAmount,
  maxAmount,
  settings,
  onChange,
  onClear,
  t,
}: AmountFilterPopoverProps) {
  const [activeHandle, setActiveHandle] = useState<'min' | 'max'>('max');
  const isActive = minAmount !== undefined || maxAmount !== undefined;
  const sliderMax = Math.max(maxBound, minBound + 0.01);
  // Keep the range inputs on the global scale so their position communicates
  // the contextual bounds, while clamping their values to the current results.
  const selectedMin = Math.min(contextMax, Math.max(contextMin, minAmount ?? contextMin));
  const selectedMax = Math.max(selectedMin, Math.min(contextMax, maxAmount ?? contextMax));
  const span = sliderMax - minBound || 0.01;
  const selectedStart = Math.max(0, Math.min(100, ((selectedMin - minBound) / span) * 100));
  const selectedEnd = Math.max(0, Math.min(100, ((selectedMax - minBound) / span) * 100));
  const handleRangeChange = (nextMin: number, nextMax: number) => {
    const normalizedMin = Math.min(Math.max(nextMin, contextMin), contextMax);
    const normalizedMax = Math.max(Math.min(nextMax, contextMax), normalizedMin);
    onChange(normalizedMin, normalizedMax);
  };

  const handleMinInput = (value: string) => {
    if (!value) {
      onChange(minBound, maxAmount ?? maxBound);
      return;
    }
    const nextMin = Math.min(Math.max(Number(value), minBound), maxAmount ?? maxBound);
    handleRangeChange(nextMin, maxAmount ?? maxBound);
  };

  const handleMaxInput = (value: string) => {
    if (!value) {
      onChange(minAmount ?? minBound, maxBound);
      return;
    }
    const nextMax = Math.max(Math.min(Number(value), maxBound), minAmount ?? minBound);
    handleRangeChange(minAmount ?? minBound, nextMax);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={isActive ? 'secondary' : 'ghost'}
          size="icon-xs"
          aria-label={t('ledger.filterByAmount')}
          title={t('ledger.filterByAmount')}
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
        >
          <ListFilter className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        className="w-[min(20rem,calc(100vw-2rem))] overflow-hidden p-0"
        onOpenAutoFocus={event => event.preventDefault()}
      >
        <div className="space-y-4 p-4">
          <div className="space-y-1">
            <div className="relative mt-3 h-7 px-2">
              <div className="absolute inset-x-2 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted">
                <div
                  className="absolute inset-y-0 rounded-full bg-primary"
                  style={{ left: `${selectedStart}%`, width: `${selectedEnd - selectedStart}%` }}
                />
              </div>
              <input
                type="range"
                aria-label={t('ledger.minimumAmount')}
                aria-valuetext={formatCurrency(selectedMin, settings)}
                aria-valuemin={contextMin}
                aria-valuemax={contextMax}
                min={minBound}
                max={sliderMax}
                step="0.01"
                value={selectedMin}
                onFocus={() => setActiveHandle('min')}
                onPointerDown={() => setActiveHandle('min')}
                onChange={event => handleRangeChange(Number(event.target.value), selectedMax)}
                className={`amount-range ${activeHandle === 'min' ? 'z-20' : 'z-10'}`}
              />
              <input
                type="range"
                aria-label={t('ledger.maximumAmount')}
                aria-valuetext={formatCurrency(selectedMax, settings)}
                aria-valuemin={contextMin}
                aria-valuemax={contextMax}
                min={minBound}
                max={sliderMax}
                step="0.01"
                value={selectedMax}
                onFocus={() => setActiveHandle('max')}
                onPointerDown={() => setActiveHandle('max')}
                onChange={event => handleRangeChange(selectedMin, Number(event.target.value))}
                className={`amount-range ${activeHandle === 'max' ? 'z-20' : 'z-10'}`}
              />
            </div>
            <div className="flex justify-between px-1 text-[10px] text-muted-foreground">
              <span>{formatCurrency(minBound, settings)}</span>
              <span>{formatCurrency(maxBound, settings)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                type="number"
                min={contextMin}
                max={contextMax}
                step="0.01"
                aria-label={t('ledger.minimumAmount')}
                placeholder={formatCurrency(contextMin, settings)}
                value={minAmount === undefined ? '' : selectedMin}
                onChange={event => handleMinInput(event.target.value)}
                className="h-9 text-sm focus-visible:border-input focus-visible:ring-muted-foreground/40"
              />
            </div>
            <div>
              <Input
                type="number"
                min={contextMin}
                max={contextMax}
                step="0.01"
                aria-label={t('ledger.maximumAmount')}
                placeholder={formatCurrency(contextMax, settings)}
                value={maxAmount === undefined ? '' : selectedMax}
                onChange={event => handleMaxInput(event.target.value)}
                className="h-9 text-sm focus-visible:border-input focus-visible:ring-muted-foreground/40"
              />
            </div>
          </div>
        </div>
        {isActive ? (
          <div className="flex justify-end border-t border-border px-3 py-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={onClear}
            >
              {t('ledger.clearAmountFilter')}
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
