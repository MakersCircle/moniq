import React, { useState, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { useDataStore } from '@/store/dataStore';
import type { CategoryGroup } from '@/types';

const GROUPS: CategoryGroup[] = ['Income', 'Needs', 'Wants', 'Invest', 'Lend', 'Borrow'];

export interface CategoryFormData {
  group: CategoryGroup;
  head: string;
  subHead: string;
  isActive: boolean;
}

interface CategoryFormProps {
  initialData?: Partial<CategoryFormData>;
  onSave: (data: CategoryFormData) => void;
  onCancel: () => void;
  submitLabel?: string;
  cancelLabel?: string;
}

export function CategoryForm({
  initialData,
  onSave,
  onCancel,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
}: CategoryFormProps) {
  const { categories } = useDataStore();

  const [form, setForm] = useState({
    group: initialData?.group || 'Needs',
    head: initialData?.head || '',
    subHead: initialData?.subHead || '',
  });

  const [error, setError] = useState('');
  const [headDropdownOpen, setHeadDropdownOpen] = useState(false);

  const activeCategories = useMemo(
    () => categories.filter(c => c.isActive && !c.isDeleted),
    [categories]
  );
  const existingHeads = useMemo(
    () => Array.from(new Set(activeCategories.map(c => c.head))).sort(),
    [activeCategories]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.head.trim()) {
      setError('Head is required.');
      return;
    }

    const exists = activeCategories.some(
      c =>
        c.head.toLowerCase() === form.head.trim().toLowerCase() &&
        (c.subHead || '').toLowerCase() === form.subHead.trim().toLowerCase()
    );

    if (
      exists &&
      !(
        initialData?.head?.toLowerCase() === form.head.trim().toLowerCase() &&
        (initialData?.subHead || '').toLowerCase() === form.subHead.trim().toLowerCase()
      )
    ) {
      setError('This category already exists.');
      return;
    }

    onSave({
      group: form.group,
      head: form.head.trim(),
      subHead: form.subHead.trim(),
      isActive: initialData?.isActive ?? true,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center">
            Group
            <InfoTooltip text="Needs: Essential. Wants: Discretionary. Savings: Future." />
          </Label>
          <Select
            value={form.group}
            onValueChange={val => setForm({ ...form, group: val as CategoryGroup })}
          >
            <SelectTrigger className="h-10 border-border/50 focus:border-primary/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GROUPS.map(g => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center">
            Head (Main Category)
            <InfoTooltip text="e.g. Housing, Food, Transportation." />
          </Label>
          <div className="relative">
            <Input
              placeholder="e.g., Housing, Food, Utilities"
              value={form.head}
              onChange={e => {
                setForm({ ...form, head: e.target.value });
                setError('');
                setHeadDropdownOpen(true);
              }}
              onFocus={() => setHeadDropdownOpen(true)}
              onBlur={() => setTimeout(() => setHeadDropdownOpen(false), 200)}
              className="h-10 border-border/50 focus:border-primary/30"
              autoFocus={!initialData?.head}
            />
            {headDropdownOpen && existingHeads.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-popover border border-border/50 rounded-md shadow-lg max-h-40 overflow-y-auto">
                {existingHeads
                  .filter(h => h.toLowerCase().includes(form.head.toLowerCase()))
                  .map(h => (
                    <div
                      key={h}
                      className="px-3 py-2 text-sm cursor-pointer hover:bg-muted"
                      onClick={() => {
                        setForm({ ...form, head: h });
                        setHeadDropdownOpen(false);
                      }}
                    >
                      {h}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center">
            Sub-head (Optional)
            <InfoTooltip text="e.g. Rent, Groceries, Gas." />
          </Label>
          <Input
            placeholder="e.g., Rent, Groceries, Internet"
            value={form.subHead}
            onChange={e => {
              setForm({ ...form, subHead: e.target.value });
              setError('');
            }}
            className="h-10 border-border/50 focus:border-primary/30"
          />
        </div>

        {error && <p className="text-sm font-medium text-destructive">{error}</p>}
      </div>

      <div className="px-6 py-4 border-t border-border/50 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 shrink-0">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="h-10 px-6 font-bold uppercase text-[10px] tracking-widest w-full sm:w-auto"
        >
          {cancelLabel}
        </Button>
        <Button
          type="submit"
          className="h-10 px-8 font-bold uppercase text-[10px] tracking-widest w-full sm:w-auto"
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
