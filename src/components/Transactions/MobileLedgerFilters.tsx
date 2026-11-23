import { useMemo, useState } from 'react';
import { ListFilter } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Account, Category } from '@/types';

type TransactionType = 'income' | 'expense' | 'transfer';

interface MobileLedgerFiltersProps {
  accounts: Account[];
  categories: Category[];
  selectedAccountIds: string[];
  selectedCategoryIds: string[];
  selectedTypes: TransactionType[];
  typeOptions: readonly { value: TransactionType; label: string }[];
  onAccountsChange: (ids: string[]) => void;
  onCategoriesChange: (ids: string[]) => void;
  onTypeChange: (type: TransactionType, checked: boolean) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

export function MobileLedgerFilters({
  accounts,
  categories,
  selectedAccountIds,
  selectedCategoryIds,
  selectedTypes,
  typeOptions,
  onAccountsChange,
  onCategoriesChange,
  onTypeChange,
  t,
}: MobileLedgerFiltersProps) {
  const [open, setOpen] = useState(false);
  const [accountSearch, setAccountSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const selectedAccounts = useMemo(() => new Set(selectedAccountIds), [selectedAccountIds]);
  const selectedCategories = useMemo(() => new Set(selectedCategoryIds), [selectedCategoryIds]);
  const queryAccounts = accountSearch.trim().toLocaleLowerCase();
  const queryCategories = categorySearch.trim().toLocaleLowerCase();
  const visibleAccounts = accounts
    .filter(
      account => !account.isDeleted && account.name.toLocaleLowerCase().includes(queryAccounts)
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  const categoryGroups = useMemo(() => {
    const groups = new Map<string, Category[]>();
    categories
      .filter(category => !category.isDeleted)
      .forEach(category =>
        groups.set(category.head, [...(groups.get(category.head) || []), category])
      );
    return [...groups.entries()]
      .map(([head, items]) => ({
        head,
        items: items.sort((a, b) => (a.subHead || '').localeCompare(b.subHead || '')),
      }))
      .filter(
        group =>
          !queryCategories ||
          group.head.toLocaleLowerCase().includes(queryCategories) ||
          group.items.some(item =>
            (item.subHead || '').toLocaleLowerCase().includes(queryCategories)
          )
      )
      .sort((a, b) => a.head.localeCompare(b.head));
  }, [categories, queryCategories]);
  const activeCount =
    selectedAccountIds.length +
    selectedCategoryIds.length +
    (typeOptions.length - selectedTypes.length);

  const toggleId = (
    selected: Set<string>,
    id: string,
    checked: boolean,
    onChange: (next: string[]) => void
  ) => {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    onChange([...next]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={activeCount ? 'secondary' : 'ghost'}
          size="icon"
          aria-label={t('ledger.filters')}
          aria-expanded={open}
          title={t('ledger.filters')}
          className="h-10 w-10 shrink-0 border-0 bg-transparent p-0 shadow-none hover:bg-accent md:hidden"
        >
          <ListFilter className="h-4 w-4" />
          {activeCount > 0 ? <span className="sr-only">{activeCount}</span> : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={6}
        className="max-h-[min(80dvh,36rem)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto p-3"
      >
        <div className="space-y-4">
          <fieldset className="space-y-1">
            <legend className="mb-1 text-xs font-semibold text-muted-foreground">
              {t('ledger.filterByType')}
            </legend>
            {typeOptions.map(option => (
              <label
                key={option.value}
                className="flex min-h-9 cursor-pointer items-center gap-3 rounded-md px-2 text-sm hover:bg-accent"
              >
                <Checkbox
                  aria-label={option.label}
                  checked={selectedTypes.includes(option.value)}
                  onCheckedChange={checked => onTypeChange(option.value, checked === true)}
                />
                {option.label}
              </label>
            ))}
          </fieldset>

          <fieldset className="space-y-1 border-t border-border pt-3">
            <legend className="mb-2 text-xs font-semibold text-muted-foreground">
              {t('ledger.filterByAccount')}
            </legend>
            <Input
              aria-label={t('ledger.searchAccounts')}
              placeholder={t('ledger.searchAccounts')}
              value={accountSearch}
              onChange={event => setAccountSearch(event.target.value)}
              className="h-9 text-sm"
            />
            <div className="max-h-36 overflow-y-auto">
              {visibleAccounts.length ? (
                visibleAccounts.map(account => (
                  <label
                    key={account.id}
                    className="flex min-h-9 cursor-pointer items-center gap-3 rounded-md px-2 text-sm hover:bg-accent"
                  >
                    <Checkbox
                      aria-label={account.name}
                      checked={selectedAccounts.has(account.id)}
                      onCheckedChange={checked =>
                        toggleId(selectedAccounts, account.id, checked === true, onAccountsChange)
                      }
                    />
                    <span className="truncate">{account.name}</span>
                  </label>
                ))
              ) : (
                <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                  {t('ledger.noAccountsFound')}
                </p>
              )}
            </div>
          </fieldset>

          <fieldset className="space-y-1 border-t border-border pt-3">
            <legend className="mb-2 text-xs font-semibold text-muted-foreground">
              {t('ledger.filterByCategory')}
            </legend>
            <Input
              aria-label={t('ledger.searchCategories')}
              placeholder={t('ledger.searchCategories')}
              value={categorySearch}
              onChange={event => setCategorySearch(event.target.value)}
              className="h-9 text-sm"
            />
            <div className="max-h-48 overflow-y-auto">
              {categoryGroups.length ? (
                categoryGroups.map(group => {
                  const ids = group.items.map(item => item.id);
                  const count = ids.filter(id => selectedCategories.has(id)).length;
                  const checked = count === ids.length ? true : count ? 'indeterminate' : false;
                  const matchingItems = group.items.filter(
                    item =>
                      !queryCategories ||
                      group.head.toLocaleLowerCase().includes(queryCategories) ||
                      (item.subHead || '').toLocaleLowerCase().includes(queryCategories)
                  );
                  return (
                    <div key={group.head}>
                      <label className="flex min-h-9 cursor-pointer items-center gap-3 rounded-md px-2 text-sm font-medium hover:bg-accent">
                        <Checkbox
                          aria-label={group.head}
                          checked={checked}
                          onCheckedChange={value => {
                            const next = new Set(selectedCategories);
                            ids.forEach(id => (value === false ? next.delete(id) : next.add(id)));
                            onCategoriesChange([...next]);
                          }}
                        />
                        <span className="truncate">{group.head}</span>
                      </label>
                      {matchingItems
                        .filter(item => item.subHead || group.items.some(child => child.subHead))
                        .map(item => (
                          <label
                            key={item.id}
                            className="ml-5 flex min-h-9 cursor-pointer items-center gap-3 rounded-md px-2 text-sm hover:bg-accent"
                          >
                            <Checkbox
                              aria-label={`${group.head} ${item.subHead || t('ledger.noSubcategory')}`}
                              checked={selectedCategories.has(item.id)}
                              onCheckedChange={value =>
                                toggleId(
                                  selectedCategories,
                                  item.id,
                                  value === true,
                                  onCategoriesChange
                                )
                              }
                            />
                            <span className="truncate">
                              {item.subHead || t('ledger.noSubcategory')}
                            </span>
                          </label>
                        ))}
                    </div>
                  );
                })
              ) : (
                <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                  {t('ledger.noCategoriesFound')}
                </p>
              )}
            </div>
          </fieldset>
        </div>
      </PopoverContent>
    </Popover>
  );
}
