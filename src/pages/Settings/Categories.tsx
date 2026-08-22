import { useState } from 'react';
import { Reorder } from 'framer-motion';
import { Plus, Pencil, Archive, Trash2, Tag, GripVertical } from 'lucide-react';
import { useDataStore } from '@/store/dataStore';
import { CategoryForm, type CategoryFormData } from '@/components/Forms/CategoryForm';
import type { Category, CategoryGroup } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import SettingsLayout from '@/components/Layout/SettingsLayout';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { useTranslation } from '@/hooks/useTranslation';

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
    addCategory,
    updateCategory,
    archiveCategory,
    deleteCategory,
    reorderCategories,
  } = useDataStore();
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleteError, setDeleteError] = useState<Record<string, string>>({});

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

  const handleReorder = (group: string, newOrder: Category[]) => {
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
                <h2 className="text-xl font-bold tracking-tight">Categories</h2>
                <InfoTooltip
                  position="bottom"
                  text="Categories organize your income and expenses into a hierarchy. Drag to reorder within groups."
                />
              </div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Expense & Income Classification
              </p>
            </div>
            <Button size="sm" onClick={openAdd} className="h-9 gap-2">
              <Plus className="h-4 w-4" /> Add Category
            </Button>
          </div>
        </div>

        <div className="space-y-10">
          {Object.entries(grouped).map(([group, cats]) => (
            <section key={group} className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <div
                  className={cn('h-1.5 w-1.5 rounded-full', GROUP_STYLES[group]?.split(' ')[0])}
                />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  {group}
                </h3>
              </div>

              <Reorder.Group
                axis="y"
                values={cats}
                onReorder={val => handleReorder(group, val)}
                className="grid grid-cols-1 gap-2"
              >
                {cats.map(c => (
                  <Reorder.Item
                    key={c.id}
                    value={c}
                    whileDrag={{
                      boxShadow: '0 20px 50px -12px rgba(0,0,0,0.5)',
                      zIndex: 1000,
                      backgroundColor: '#18181b',
                    }}
                    className="group relative border border-border/40 hover:border-primary/30 transition-colors shadow-sm rounded-xl bg-card cursor-default select-none"
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
                            <p className="font-bold text-sm tracking-tight truncate">{c.head}</p>
                            {c.subHead && (
                              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                                {c.subHead}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity mr-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEdit(c)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                              onClick={() => archiveCategory(c.id)}
                            >
                              <Archive className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="p-2 -mr-2 cursor-grab active:cursor-grabbing text-muted-foreground/20 group-hover:text-primary/40 transition-colors rounded-lg hover:bg-primary/5">
                            <GripVertical className="h-5 w-5" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            </section>
          ))}
        </div>

        {archived.length > 0 && (
          <div className="pt-8 space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 px-1">
              Archived Categories
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
                        Restore
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
                              [c.id]: result.reason || 'Cannot delete.',
                            }));
                          else
                            setDeleteError(prev => {
                              const n = { ...prev };
                              delete n[c.id];
                              return n;
                            });
                        }}
                      >
                        <Trash2 className="h-3 w-3 mr-1" /> Delete
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

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border/50 shrink-0">
            <DialogTitle className="text-xl font-bold tracking-tight">
              {editing ? t('category.editCategory') : t('category.newCategory')}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editing ? t('category.editDescription') : t('category.createDescription')}
            </DialogDescription>
          </DialogHeader>

          {modalOpen && (
            <CategoryForm
              initialData={
                editing
                  ? {
                      group: editing.group,
                      head: editing.head,
                      subHead: editing.subHead,
                      isActive: editing.isActive,
                    }
                  : undefined
              }
              onSave={handleSave}
              onCancel={() => setModalOpen(false)}
              submitLabel={editing ? t('common.saveChanges') : t('category.createCategory')}
            />
          )}
        </DialogContent>
      </Dialog>
    </SettingsLayout>
  );
}
