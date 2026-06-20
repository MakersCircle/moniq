import { useState } from 'react';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDataStore } from '@/store/dataStore';
import defaults from '@/data/defaults.json';
import { Tag, ArrowRight, Plus, Trash2 } from 'lucide-react';
import type { Category, CategoryGroup } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DraftCategory {
  group: CategoryGroup;
  head: string;
  subHead: string;
}

const GROUPS: CategoryGroup[] = ['Income', 'Needs', 'Wants', 'Invest', 'Lend', 'Borrow'];

export default function CategoriesSetupStep() {
  const setTourStepFn = useDataStore(s => s.setTourStep);
  const completeOnboardingFn = useDataStore(s => s.completeOnboarding);

  const [categories, setCategories] = useState<DraftCategory[]>(
    (defaults.categories as any[]).map(cat => ({
      group: cat.group as CategoryGroup,
      head: cat.head,
      subHead: cat.subHead || '',
    }))
  );

  const updateCategory = (index: number, patch: Partial<DraftCategory>) => {
    setCategories(prev => prev.map((c, i) => i === index ? { ...c, ...patch } : c));
  };

  const addCategory = () => {
    setCategories(prev => [{ group: 'Needs', head: '', subHead: '' }, ...prev]);
  };

  const removeCategory = (index: number) => {
    setCategories(prev => prev.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    const { addCategory: storeAdd } = useDataStore.getState();
    categories
      .filter(c => c.head.trim())
      .forEach(cat => {
        storeAdd({
          group: cat.group,
          head: cat.head.trim(),
          subHead: cat.subHead.trim() || undefined,
          isActive: true,
        } as Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>);
      });
    setTimeout(() => setTourStepFn('view_categories'), 100);
  };

  const handleSkip = () => {
    completeOnboardingFn([], []);
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="max-w-xl overflow-hidden p-0 border-none shadow-2xl [&>button]:hidden">
        {/* Header */}
        <div className="bg-primary/5 p-6 border-b border-border/50">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 shrink-0 mt-0.5">
              <Tag className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight mb-1">
                Set Up Categories
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
                Moniq relies on categories to track your spending accurately. Review these pre-filled defaults, edit them, or add your own.
              </DialogDescription>
            </div>
          </div>

          {/* Explanation Cards */}
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-indigo-500/8 border border-indigo-500/20 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">1. Group</span>
                <InfoTooltip 
                  text="Needs: Essential expenses (Rent, Food)
Wants: Lifestyle expenses (Dining out, Entertainment)
Income: Money earned
Invest: Wealth creation (Stocks, Mutual Funds)
Lend: Money you gave to others
Borrow: Money you took from others"
                  position="bottom"
                />
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">
                Top-level classification: <b className="text-foreground">Needs, Wants, Income, Invest, Lend,</b> or <b className="text-foreground">Borrow</b>.
              </p>
            </div>
            <div className="rounded-lg bg-blue-500/8 border border-blue-500/20 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">2. Category</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">
                The primary bucket for your transaction (e.g., <b className="text-foreground">Food</b>, <b className="text-foreground">Transport</b>).
              </p>
            </div>
            <div className="rounded-lg bg-sky-500/8 border border-sky-500/20 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded">3. Sub-Category</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">
                A specific breakdown (e.g., <b className="text-foreground">Groceries</b>, <b className="text-foreground">Fuel</b>). This is optional.
              </p>
            </div>
          </div>
        </div>

        {/* Categories Rows */}
        <div className="p-6 space-y-2 max-h-[45vh] overflow-y-auto custom-scrollbar">
          <button
            type="button"
            onClick={addCategory}
            className="w-full flex items-center justify-center gap-2 py-2 mb-4 rounded-lg border border-dashed border-border text-[11px] font-semibold text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add New Category
          </button>

          {categories.map((cat, i) => (
            <div key={i} className="flex items-center gap-2 mb-2 bg-card p-1 rounded-lg border border-border/50">
              <Select value={cat.group} onValueChange={v => updateCategory(i, { group: v as CategoryGroup })}>
                <SelectTrigger className="w-[100px] h-9 text-xs font-medium bg-background border-border/50 focus:ring-0 shrink-0">
                  <SelectValue placeholder="Group" />
                </SelectTrigger>
                <SelectContent className="z-[100] border-border/50 bg-background/95 backdrop-blur-md">
                  {GROUPS.map(g => (
                    <SelectItem key={g} value={g} className="text-xs focus:bg-primary/10 focus:text-primary">{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                value={cat.head}
                onChange={e => updateCategory(i, { head: e.target.value })}
                placeholder="Head (e.g. Food)"
                className="h-9 flex-1 text-xs bg-background border-border/50 focus-visible:ring-1"
              />

              <Input
                value={cat.subHead}
                onChange={e => updateCategory(i, { subHead: e.target.value })}
                placeholder="Subhead (Optional)"
                className="h-9 flex-1 text-xs bg-background border-border/50 focus-visible:ring-1"
              />

              <button
                type="button"
                onClick={() => removeCategory(i)}
                className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded shrink-0 ml-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-5 bg-accent/20 border-t border-border flex items-center justify-between">
          <Button
            variant="ghost"
            className="text-muted-foreground font-bold tracking-widest uppercase text-xs"
            onClick={handleSkip}
          >
            Skip Tour
          </Button>
          <Button
            className="gap-2 px-8 font-bold tracking-widest uppercase text-xs"
            onClick={handleNext}
          >
            Save & Continue <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
