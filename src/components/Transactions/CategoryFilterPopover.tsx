import { useMemo, useState } from 'react';
import { ChevronDown, ListFilter } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Category } from '@/types';

interface CategoryFilterPopoverProps {
  categories: Category[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

export function CategoryFilterPopover({
  categories,
  selectedIds,
  onChange,
  t,
}: CategoryFilterPopoverProps) {
  const [search, setSearch] = useState('');
  const [expandedHeads, setExpandedHeads] = useState<Set<string>>(() => new Set());
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const query = search.trim().toLocaleLowerCase();

  const categoryGroups = useMemo(() => {
    const groups = new Map<string, Category[]>();
    categories
      .filter(category => !category.isDeleted)
      .forEach(category => {
        const items = groups.get(category.head) || [];
        items.push(category);
        groups.set(category.head, items);
      });

    return [...groups.entries()]
      .map(([head, items]) => ({
        head,
        items: items.sort((a, b) => (a.subHead || '').localeCompare(b.subHead || '')),
        ids: items.map(category => category.id),
      }))
      .sort((a, b) => a.head.localeCompare(b.head));
  }, [categories]);

  const visibleGroups = categoryGroups
    .map(group => {
      const headMatches = group.head.toLocaleLowerCase().includes(query);
      const children = group.items.filter(category => category.subHead);
      const hasHeadOnlyCategory = group.items.some(category => !category.subHead);
      const childOptions = [
        ...children.map(category => ({ id: category.id, label: category.subHead! })),
        ...(hasHeadOnlyCategory && children.length
          ? [
              {
                id: group.items.find(category => !category.subHead)!.id,
                label: t('ledger.noSubcategory'),
              },
            ]
          : []),
      ];
      const matchingChildren = query
        ? headMatches
          ? childOptions
          : childOptions.filter(option => option.label.toLocaleLowerCase().includes(query))
        : childOptions;

      return {
        ...group,
        childOptions,
        matchingChildren,
        expandable: childOptions.length > 0,
        visible: !query || headMatches || matchingChildren.length > 0,
      };
    })
    .filter(group => group.visible);

  const updateSelection = (ids: string[], shouldSelect: boolean) => {
    const next = new Set(selected);
    ids.forEach(id => (shouldSelect ? next.add(id) : next.delete(id)));
    onChange([...next]);
  };

  const toggleExpanded = (head: string) => {
    setExpandedHeads(current => {
      const next = new Set(current);
      if (next.has(head)) next.delete(head);
      else next.add(head);
      return next;
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={selectedIds.length ? 'secondary' : 'ghost'}
          size="icon-xs"
          aria-label={t('ledger.filterByCategory')}
          title={t('ledger.filterByCategory')}
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
        >
          <ListFilter className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        className="w-[min(20rem,calc(100vw-2rem))] p-0 overflow-hidden"
      >
        <div className="border-b border-border p-3">
          <Input
            aria-label={t('ledger.searchCategories')}
            placeholder={t('ledger.searchCategories')}
            value={search}
            onChange={event => setSearch(event.target.value)}
            className="h-9 text-xs focus-visible:border-input focus-visible:ring-muted-foreground/40"
          />
        </div>
        <div className="max-h-72 overflow-y-auto [scrollbar-gutter:stable] p-2">
          {visibleGroups.length ? (
            visibleGroups.map(group => {
              const selectedCount = group.ids.filter(id => selected.has(id)).length;
              const checked =
                selectedCount === group.ids.length
                  ? true
                  : selectedCount > 0
                    ? 'indeterminate'
                    : false;
              const isExpanded = query.length > 0 || expandedHeads.has(group.head);
              const parentId = `category-filter-${group.ids[0]}`;

              return (
                <div key={group.head}>
                  <div
                    className="group flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 hover:bg-accent"
                    onClick={() => group.expandable && toggleExpanded(group.head)}
                  >
                    <div
                      className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center"
                      onClick={event => {
                        event.stopPropagation();
                        updateSelection(group.ids, checked !== true);
                      }}
                    >
                      <Checkbox
                        id={parentId}
                        aria-label={group.head}
                        checked={checked}
                        className="border-input transition-colors duration-150 focus-visible:ring-muted-foreground/40 focus-visible:ring-offset-0 group-hover:border-primary data-[state=checked]:border-primary data-[state=indeterminate]:border-primary"
                        onClick={event => event.stopPropagation()}
                        onCheckedChange={value => updateSelection(group.ids, value !== false)}
                      />
                    </div>
                    {group.expandable ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={t(
                          isExpanded ? 'ledger.collapseCategory' : 'ledger.expandCategory',
                          { category: group.head }
                        )}
                        aria-expanded={isExpanded}
                        className="h-9 min-w-0 flex-1 justify-between px-1 text-left font-medium hover:bg-transparent"
                        onClick={event => {
                          event.stopPropagation();
                          toggleExpanded(group.head);
                        }}
                      >
                        <span className="truncate">{group.head}</span>
                        {group.expandable ? (
                          <ChevronDown
                            className={`h-4 w-4 shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                          />
                        ) : null}
                      </Button>
                    ) : (
                      <span className="flex-1 truncate text-sm font-medium">{group.head}</span>
                    )}
                  </div>
                  {group.expandable ? (
                    <div
                      aria-hidden={!isExpanded}
                      inert={!isExpanded}
                      className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                    >
                      <div className="min-h-0 overflow-hidden">
                        <div className="ml-5 border-l border-border pl-2">
                          {group.matchingChildren.map(option => {
                            const childId = `${parentId}-${option.id}`;
                            return (
                              <label
                                key={option.id}
                                htmlFor={childId}
                                className="group flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 text-sm hover:bg-accent"
                              >
                                <Checkbox
                                  id={childId}
                                  aria-label={option.label}
                                  checked={selected.has(option.id)}
                                  className="border-input transition-colors duration-150 focus-visible:ring-muted-foreground/40 focus-visible:ring-offset-0 group-hover:border-primary data-[state=checked]:border-primary"
                                  onCheckedChange={value =>
                                    updateSelection([option.id], value !== false)
                                  }
                                />
                                <span className="truncate">{option.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          ) : (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              {t('ledger.noCategoriesFound')}
            </p>
          )}
        </div>
        {selectedIds.length ? (
          <div className="flex items-center justify-between border-t border-border px-3 py-2">
            <span className="text-xs text-muted-foreground">
              {t('ledger.selectedCategoryCount', { count: selectedIds.length })}
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => onChange([])}
            >
              {t('ledger.clearCategoryFilter')}
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
