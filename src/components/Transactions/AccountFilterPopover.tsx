import { useMemo, useRef, useState } from 'react';
import { ListFilter } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Account } from '@/types';

interface AccountFilterPopoverProps {
  accounts: Account[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

export function AccountFilterPopover({
  accounts,
  selectedIds,
  onChange,
  t,
}: AccountFilterPopoverProps) {
  const [search, setSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const query = search.trim().toLocaleLowerCase();
  const visibleAccounts = useMemo(
    () =>
      accounts
        .filter(account => !account.isDeleted && account.name.toLocaleLowerCase().includes(query))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [accounts, query]
  );

  const updateSelection = (id: string, shouldSelect: boolean) => {
    const next = new Set(selected);
    if (shouldSelect) next.add(id);
    else next.delete(id);
    onChange([...next]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={selectedIds.length ? 'secondary' : 'ghost'}
          size="icon-xs"
          aria-label={t('ledger.filterByAccount')}
          title={t('ledger.filterByAccount')}
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
        >
          <ListFilter className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        className="w-[min(20rem,calc(100vw-2rem))] overflow-hidden p-0"
        onOpenAutoFocus={event => {
          event.preventDefault();
          if (window.matchMedia('(min-width: 768px)').matches) {
            searchInputRef.current?.focus();
          }
        }}
      >
        <div className="border-b border-border p-3">
          <Input
            ref={searchInputRef}
            aria-label={t('ledger.searchAccounts')}
            placeholder={t('ledger.searchAccounts')}
            value={search}
            onChange={event => setSearch(event.target.value)}
            className="h-9 text-xs focus-visible:border-input focus-visible:ring-muted-foreground/40"
          />
        </div>
        <div className="max-h-72 overflow-y-auto [scrollbar-gutter:stable] p-2">
          {visibleAccounts.length ? (
            visibleAccounts.map(account => {
              const checkboxId = `account-filter-${account.id}`;
              const checked = selected.has(account.id);

              return (
                <label
                  key={account.id}
                  htmlFor={checkboxId}
                  className="group flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 text-sm hover:bg-accent"
                >
                  <span className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center">
                    <Checkbox
                      id={checkboxId}
                      aria-label={account.name}
                      checked={checked}
                      className="border-input transition-colors duration-150 focus-visible:ring-muted-foreground/40 focus-visible:ring-offset-0 group-hover:border-primary data-[state=checked]:border-primary"
                      onCheckedChange={value => updateSelection(account.id, value === true)}
                    />
                  </span>
                  <span className="truncate">{account.name}</span>
                </label>
              );
            })
          ) : (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              {t('ledger.noAccountsFound')}
            </p>
          )}
        </div>
        {selectedIds.length ? (
          <div className="flex items-center justify-between border-t border-border px-3 py-2">
            <span className="text-xs text-muted-foreground">
              {t('ledger.selectedAccountCount', { count: selectedIds.length })}
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => onChange([])}
            >
              {t('ledger.clearAccountFilter')}
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
