import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, ListFilter } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ResponsiveModal } from '@/components/ui/responsive-modal';
import type { Account, Category } from '@/types';

type TransactionType = 'income' | 'expense' | 'transfer';
type FilterSection = 'type' | 'account' | 'category';

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
  onOpenChange?: (open: boolean) => void;
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
  onOpenChange,
  t,
}: MobileLedgerFiltersProps) {
  const [open, setOpen] = useState(false);
  const [openSection, setOpenSection] = useState<FilterSection>('type');
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
  const showAccountSearch = accounts.filter(account => !account.isDeleted).length > 8;
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
  const showCategorySearch = categories.filter(category => !category.isDeleted).length > 8;
  const typeFilterActive = selectedTypes.length > 0 && selectedTypes.length < typeOptions.length;
  const filtersApplied =
    selectedAccountIds.length > 0 || selectedCategoryIds.length > 0 || typeFilterActive;

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

  const renderSection = (section: FilterSection, label: string, content: ReactNode) => {
    const expanded = openSection === section;
    const contentId = `mobile-ledger-filter-${section}`;
    return (
      <section key={section} className="border-b border-border last:border-b-0">
        <Button
          type="button"
          variant="ghost"
          aria-expanded={expanded}
          aria-controls={contentId}
          className="h-11 w-full justify-between rounded-md px-2 text-sm font-semibold hover:bg-accent"
          onClick={() => setOpenSection(current => (current === section ? 'type' : section))}
        >
          <span>{label}</span>
          <ChevronDown
            aria-hidden="true"
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`}
          />
        </Button>
        <div
          id={contentId}
          aria-hidden={!expanded}
          inert={!expanded}
          className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
        >
          <div className="min-h-0 overflow-hidden pb-2">{content}</div>
        </div>
      </section>
    );
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) setOpenSection('type');
    onOpenChange?.(nextOpen);
  };

  return (
    <>
      <Button
        type="button"
        variant={filtersApplied ? 'secondary' : 'ghost'}
        size="icon"
        aria-label={
          filtersApplied
            ? `${t('ledger.filters')}, ${t('ledger.filtersApplied')}`
            : t('ledger.filters')
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        title={t('ledger.filters')}
        onClick={() => handleOpenChange(!open)}
        className="relative h-10 w-10 shrink-0 border-0 bg-transparent p-0 shadow-none hover:bg-accent md:hidden"
      >
        <ListFilter className="h-4 w-4" />
        {filtersApplied ? (
          <span
            aria-hidden="true"
            data-ledger-filter-indicator
            className="absolute right-2 top-2 size-1.5 rounded-full bg-destructive ring-2 ring-background"
          />
        ) : null}
      </Button>
      <ResponsiveModal
        open={open}
        onOpenChange={handleOpenChange}
        title={t('ledger.filters')}
        overlayClassName="bg-black/45 backdrop-blur-sm"
        className="max-h-[calc(var(--app-viewport-height)-7rem)] sm:max-w-sm"
      >
        <div className="px-4 pb-4">
          {renderSection(
            'type',
            t('ledger.filterByType'),
            <fieldset role="group" aria-label={t('ledger.filterByType')} className="space-y-1 px-1">
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
          )}

          {renderSection(
            'account',
            t('ledger.filterByAccount'),
            <div className="space-y-1 px-1">
              {showAccountSearch ? (
                <Input
                  aria-label={t('ledger.searchAccounts')}
                  placeholder={t('ledger.searchAccounts')}
                  value={accountSearch}
                  onChange={event => setAccountSearch(event.target.value)}
                  className="h-9 text-sm"
                />
              ) : null}
              <div className="max-h-[40dvh] overflow-y-auto">
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
            </div>
          )}

          {renderSection(
            'category',
            t('ledger.filterByCategory'),
            <div className="space-y-1 px-1">
              {showCategorySearch ? (
                <Input
                  aria-label={t('ledger.searchCategories')}
                  placeholder={t('ledger.searchCategories')}
                  value={categorySearch}
                  onChange={event => setCategorySearch(event.target.value)}
                  className="h-9 text-sm"
                />
              ) : null}
              <div className="max-h-[40dvh] overflow-y-auto">
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
            </div>
          )}
        </div>
      </ResponsiveModal>
    </>
  );
}
