import { useState } from 'react';
import { Plus, Pencil, Archive, Check, X } from 'lucide-react';
import PageShell from '../../components/PageShell';
import { useDataStore } from '../../store/dataStore';
import type { Category, CategoryGroup } from '../../types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const GROUPS: CategoryGroup[] = ['Needs', 'Wants', 'Savings', 'Investment', 'Debt', 'Income', 'Custom'];

export default function Categories() {
  const { categories, addCategory, updateCategory, archiveCategory } = useDataStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ group: 'Needs' as CategoryGroup, head: '', subHead: '' });

  const openAdd = () => { setEditing(null); setForm({ group: 'Needs', head: '', subHead: '' }); setModalOpen(true); };
  const openEdit = (c: Category) => { setEditing(c); setForm({ group: c.group, head: c.head, subHead: c.subHead || '' }); setModalOpen(true); };

  const handleSave = () => {
    if (!form.head.trim()) return;
    const data = { group: form.group, head: form.head.trim(), subHead: form.subHead.trim() || undefined, isActive: true };
    if (editing) updateCategory(editing.id, data);
    else addCategory(data);
    setModalOpen(false);
  };

  const active = categories.filter((c) => c.isActive);
  const archived = categories.filter((c) => !c.isActive);

  // Group by category group
  const grouped = GROUPS.reduce<Record<string, Category[]>>((acc, g) => {
    const cats = active.filter((c) => c.group === g);
    if (cats.length) acc[g] = cats;
    return acc;
  }, {});

  return (
    <PageShell
      title="Categories"
      subtitle="Why money moves"
      hasBack

      headerRight={
        <Button size="sm" onClick={openAdd} id="add-category-btn">
          <Plus className="mr-2 h-4 w-4" /> Add
        </Button>
      }
    >
      <div className="space-y-6">
        {Object.entries(grouped).map(([group, cats]) => (
          <div key={group}>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3 px-1">{group}</p>
            <div className="flex flex-col gap-2">
              {cats.map((c) => (
                <Card key={c.id} className="flex items-center gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[0.9375rem]">
                      {c.head}{c.subHead && <span className="text-muted-foreground font-normal"> · {c.subHead}</span>}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => archiveCategory(c.id)}>
                    <Archive className="h-4 w-4" />
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        ))}

        {archived.length > 0 && (
          <div className="mt-8">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3 px-1">Archived</p>
            <div className="flex flex-col gap-2">
              {archived.map((c) => (
                <Card key={c.id} className="flex items-center gap-3 p-4 opacity-50">
                  <span className="flex-1 text-[0.9375rem]">{c.head}{c.subHead ? ` · ${c.subHead}` : ''}</span>
                  <Button variant="ghost" size="sm" onClick={() => updateCategory(c.id, { isActive: true })}>
                    Restore
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Category' : 'Add Category'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cat-group">Group</Label>
              <Select 
                value={form.group} 
                onValueChange={(val) => setForm({ ...form, group: val as CategoryGroup })}
              >
                <SelectTrigger id="cat-group">
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  {GROUPS.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cat-head">Head</Label>
              <Input 
                id="cat-head" 
                placeholder="e.g., Food" 
                value={form.head} 
                onChange={(e) => setForm({ ...form, head: e.target.value })} 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cat-subhead">Sub-head (optional)</Label>
              <Input 
                id="cat-subhead" 
                placeholder="e.g., Groceries" 
                value={form.subHead} 
                onChange={(e) => setForm({ ...form, subHead: e.target.value })} 
              />
            </div>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Check className="mr-2 h-4 w-4" /> Save Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

