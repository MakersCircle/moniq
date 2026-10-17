import { useEffect, useRef, useState, type RefObject } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { Plus, Pencil, Archive, Trash2, Tag, GripVertical } from 'lucide-react';
import { useDataStore } from '@/store/dataStore';
import { CategoryForm, type CategoryFormData } from '@/components/Forms/CategoryForm';
import { useTranslation } from '@/hooks/useTranslation';
import type { Category, CategoryGroup, UserSettings } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ResponsiveModal } from '@/components/ui/responsive-modal';
import { cn } from '@/lib/utils';
import SettingsLayout from '@/components/Layout/SettingsLayout';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { useAllBalances } from '@/hooks/useComputed';
import { formatCurrency } from '@/utils/format';
import { useIsMobile } from '@/hooks/useIsMobile';
import { boundDragScroll } from '@/lib/boundedDragScroll';

const GROUPS: CategoryGroup[] = ['Income', 'Needs', 'Wants', 'Invest', 'Lend', 'Borrow'];

const GROUP_STYLES: Record<string, string> = {
  Income: 'text-indigo-500 bg-indigo-500/10',
  Needs: 'text-rose-500 bg-rose-500/10',
  Wants: 'text-amber-500 bg-amber-500/10',
  Invest: 'text-blue-500 bg-blue-500/10',
  Lend: 'text-slate-500 bg-slate-500/10',
  Borrow: 'text-slate-500 bg-slate-500/10',
};

export default function Categories() {
  const {
    categories,
    settings,
    addCategory,
    updateCategory,
    archiveCategory,
    deleteCategory,
    reorderCategories,
  } = useDataStore();
  const balances = useAllBalances();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleteError, setDeleteError] = useState<Record<string, string>>({});
  const dragScrollCleanup = useRef<(() => void) | null>(null);

  useEffect(() => () => dragScrollCleanup.current?.(), []);

  const stopGroupDrag = () => {
    dragScrollCleanup.current?.();
    dragScrollCleanup.current = null;
  };

  const startGroupDrag = (groupRef: RefObject<HTMLUListElement | null>) => {
    stopGroupDrag();
    if (!isMobile) return;

    const list = groupRef.current;
    const scroller = list?.closest<HTMLElement>('[data-settings-scroll-container]');
    if (!list || !scroller) return;

    dragScrollCleanup.current = boundDragScroll(list, scroller);
  };

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (c: Category) => {
    setEditing(c);
    setModalOpen(true);
  };

  const handleSave = (data: CategoryFormData) => {
    const payload = {
      group: data.group,
      head: data.head,
      subHead: data.subHead || undefined,
      isActive: data.isActive,
      initialBalance: data.initialBalance,
    };
    if (editing) updateCategory(editing.id, payload);
    else addCategory(payload);
    setModalOpen(false);
  };

  const active = categories
    .filter(c => c.isActive && !c.isDeleted)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const archived = categories.filter(c => !c.isActive && !c.isDeleted);

  // Group by category group
  const grouped = GROUPS.reduce<Record<string, Category[]>>((acc, g) => {
    const cats = active.filter(c => c.group === g);
    if (cats.length) acc[g] = cats;
    return acc;
  }, {});

  const persistReorder = (group: string, newOrder: Category[]) => {
    const otherCats = active.filter(c => c.group !== group);
    const fullNewOrder = [...otherCats, ...newOrder];
    reorderCategories(fullNewOrder.map(c => c.id));
  };

  return (
    <SettingsLayout>
      <div id="tour-target-categories-page" className="space-y-6">
        <div className="sticky top-0 bg-background/95 backdrop-blur-md z-40 pb-4 pt-2 -mx-1 px-1">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">{t('common.categories')}</h2>
                <InfoTooltip position="bottom" text={t('category.tooltip')} />
              </div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                {t('category.subtitle')}
              </p>
            </div>
            <Button size="sm" onClick={openAdd} className="h-9 gap-2">
              <Plus className="h-4 w-4" /> {t('category.addCategory')}
            </Button>
          </div>
        </div>

        <div className="space-y-10">
          {Object.entries(grouped).map(([group, cats]) => (
            <CategoryGroupList
              key={group}
              group={group}
              categories={cats}
              balances={balances}
              settings={settings}
              onEdit={openEdit}
              onArchive={archiveCategory}
              onDragStart={startGroupDrag}
              onDragEnd={newOrder => {
                stopGroupDrag();
                if (newOrder) persistReorder(group, newOrder);
              }}
              onMove={newOrder => persistReorder(group, newOrder)}
            />
          ))}
        </div>

        {archived.length > 0 && (
          <div className="pt-8 space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 px-1">
              {t('category.archivedCategories')}
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {archived.map(c => (
                <div key={c.id}>
                  <div className="flex items-center justify-between p-3 px-4 rounded-lg bg-accent/20 border border-transparent opacity-60">
                    <span className="text-xs font-bold text-muted-foreground">
                      {c.head} {c.subHead ? `· ${c.subHead}` : ''}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[10px] font-bold uppercase tracking-wider"
                        onClick={() => {
                          setDeleteError(prev => {
                            const n = { ...prev };
                            delete n[c.id];
                            return n;
                          });
                          updateCategory(c.id, { isActive: true });
                        }}
                      >
                        {t('common.restore')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[10px] font-bold uppercase tracking-wider text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          const result = deleteCategory(c.id);
                          if (!result.success)
                            setDeleteError(prev => ({
                              ...prev,
                              [c.id]: result.reason || t('common.cannotDelete'),
                            }));
                          else
                            setDeleteError(prev => {
                              const n = { ...prev };
                              delete n[c.id];
                              return n;
                            });
                        }}
                      >
                        <Trash2 className="h-3 w-3 mr-1" /> {t('common.delete')}
                      </Button>
                    </div>
                  </div>
                  {deleteError[c.id] && (
                    <p className="text-[10px] font-medium text-destructive mt-1 ml-4">
                      {deleteError[c.id]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <ResponsiveModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? t('category.editCategory') : t('category.newCategory')}
      >
        {modalOpen && (
          <CategoryForm
            initialData={
              editing
                ? {
                    group: editing.group,
                    head: editing.head,
                    subHead: editing.subHead,
                    isActive: editing.isActive,
                    initialBalance: editing.initialBalance,
                  }
                : undefined
            }
            onSave={handleSave}
            onCancel={() => setModalOpen(false)}
            submitLabel={editing ? t('common.saveChanges') : t('category.createCategory')}
          />
        )}
      </ResponsiveModal>
    </SettingsLayout>
  );
}

interface CategoryGroupListProps {
  group: string;
  categories: Category[];
  balances: Record<string, number>;
  settings: UserSettings;
  onEdit: (category: Category) => void;
  onArchive: (id: string) => void;
  onDragStart: (groupRef: RefObject<HTMLUListElement | null>) => void;
  onDragEnd: (categories: Category[] | null) => void;
  onMove: (categories: Category[]) => void;
}

function CategoryGroupList({
  group,
  categories,
  balances,
  settings,
  onEdit,
  onArchive,
  onDragStart,
  onDragEnd,
  onMove,
}: CategoryGroupListProps) {
  const groupRef = useRef<HTMLUListElement>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const isDragging = draggedId !== null;
  const [draftOrderIds, setDraftOrderIds] = useState<string[] | null>(null);
  const draftOrderRef = useRef<string[] | null>(null);
  const positions = draftOrderIds ? new Map(draftOrderIds.map((id, index) => [id, index])) : null;
  const displayedCategories = positions
    ? [...categories].sort(
        (a, b) => (positions.get(a.id) ?? Infinity) - (positions.get(b.id) ?? Infinity)
      )
    : categories;

  const previewReorder = (nextOrder: Category[]) => {
    const ids = nextOrder.map(category => category.id);
    if (ids.every((id, index) => id === draftOrderRef.current?.[index])) return;
    draftOrderRef.current = ids;
    setDraftOrderIds(ids);
  };

  const finishDrag = () => {
    setDraggedId(null);
    const ids = draftOrderRef.current;
    draftOrderRef.current = null;
    setDraftOrderIds(null);
    if (!ids || ids.every((id, index) => id === categories[index]?.id)) {
      onDragEnd(null);
      return;
    }
    const byId = new Map(categories.map(category => [category.id, category]));
    onDragEnd(ids.map(id => byId.get(id)).filter((category): category is Category => !!category));
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <div className={cn('h-1.5 w-1.5 rounded-full', GROUP_STYLES[group]?.split(' ')[0])} />
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          {group}
        </h3>
      </div>

      <Reorder.Group
        ref={groupRef}
        axis="y"
        values={displayedCategories}
        onReorder={previewReorder}
        className="grid grid-cols-1 gap-2"
      >
        {displayedCategories.map((category, index) => (
          <CategoryReorderRow
            key={category.id}
            category={category}
            group={group}
            groupRef={groupRef}
            balance={balances[category.id] || 0}
            settings={settings}
            isDragging={isDragging}
            isDragged={draggedId === category.id}
            onEdit={() => onEdit(category)}
            onArchive={() => onArchive(category.id)}
            onDragStart={() => {
              setDraggedId(category.id);
              onDragStart(groupRef);
            }}
            onDragEnd={finishDrag}
            onMove={direction => {
              const nextIndex = index + direction;
              if (nextIndex < 0 || nextIndex >= displayedCategories.length) return;
              const nextOrder = [...displayedCategories];
              [nextOrder[index], nextOrder[nextIndex]] = [nextOrder[nextIndex], nextOrder[index]];
              onMove(nextOrder);
            }}
          />
        ))}
      </Reorder.Group>
    </section>
  );
}

interface CategoryReorderRowProps {
  category: Category;
  group: string;
  groupRef: RefObject<HTMLUListElement | null>;
  balance: number;
  settings: UserSettings;
  isDragging: boolean;
  isDragged: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMove: (direction: -1 | 1) => void;
}

function CategoryReorderRow({
  category,
  group,
  groupRef,
  balance,
  settings,
  isDragging,
  isDragged,
  onEdit,
  onArchive,
  onDragStart,
  onDragEnd,
  onMove,
}: CategoryReorderRowProps) {
  const controls = useDragControls();
  const { t } = useTranslation();

  const balanceColor =
    balance === 0
      ? 'text-muted-foreground'
      : group === 'Borrow'
        ? balance > 0
          ? 'text-expense'
          : 'text-income'
        : balance > 0
          ? 'text-income'
          : 'text-expense';

  return (
    <Reorder.Item
      value={category}
      dragListener={false}
      dragControls={controls}
      dragConstraints={groupRef}
      dragElastic={0}
      dragMomentum={false}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      whileDrag={{ zIndex: 1000 }}
      className={cn(
        'group relative border border-border/40 shadow-sm rounded-xl bg-card cursor-default select-none',
        !isDragging && 'hover:border-primary/30 transition-colors'
      )}
    >
      <Card className="border-none shadow-none bg-transparent">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                'h-8 w-8 shrink-0 rounded-lg flex items-center justify-center',
                GROUP_STYLES[group]
              )}
            >
              <Tag className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm tracking-tight truncate">{category.head}</p>
              {category.subHead && (
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                  {category.subHead}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {['Invest', 'Lend', 'Borrow'].includes(group) && (
              <div className="text-right pr-2 min-w-16">
                <p className={cn('font-bold mono text-sm tracking-tight', balanceColor)}>
                  {formatCurrency(balance, settings)}
                </p>
              </div>
            )}
            <div
              data-category-actions
              className={cn(
                'flex items-center gap-1 mr-2',
                isDragging
                  ? cn('pointer-events-none opacity-100', !isDragged && 'md:opacity-0')
                  : 'opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity'
              )}
            >
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                onClick={onArchive}
              >
                <Archive className="h-3.5 w-3.5" />
              </Button>
            </div>
            <button
              type="button"
              aria-label={t('category.reorderHandle', { name: category.head, group })}
              aria-keyshortcuts="ArrowUp ArrowDown"
              onPointerDown={event => {
                if (event.pointerType !== 'mouse' || event.button === 0) controls.start(event);
              }}
              onKeyDown={event => {
                if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
                event.preventDefault();
                onMove(event.key === 'ArrowUp' ? -1 : 1);
              }}
              className="p-2 -mr-2 cursor-grab active:cursor-grabbing touch-none text-muted-foreground/50 group-hover:text-primary/60 transition-colors rounded-lg hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <GripVertical className="h-5 w-5" />
            </button>
          </div>
        </CardContent>
      </Card>
    </Reorder.Item>
  );
}
