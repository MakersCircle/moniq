import { useState } from 'react';
import { Plus, Pencil, Archive, Check, Tag } from 'lucide-react';
import { useDataStore } from '../../store/dataStore';
import type { Category, CategoryGroup } from '../../types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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
import { cn } from '@/lib/utils';
import SettingsLayout from '@/components/Layout/SettingsLayout';

const GROUPS: CategoryGroup[] = ['Needs', 'Wants', 'Savings', 'Investment', 'Debt', 'Income', 'Custom'];

const GROUP_STYLES: Record<string, string> = {
  Needs: 'text-rose-500 bg-rose-500/10',
  Wants: 'text-amber-500 bg-amber-500/10',
  Savings: 'text-emerald-500 bg-emerald-500/10',
  Investment: 'text-blue-500 bg-blue-500/10',
  Debt: 'text-slate-500 bg-slate-500/10',
  Income: 'text-indigo-500 bg-indigo-500/10',
  Custom: 'text-muted-foreground bg-muted/20',
};

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
    <SettingsLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Categories</h2>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Expense & Income Classification</p>
          </div>
          <Button size="sm" onClick={openAdd} className="h-9 gap-2">
            <Plus className="h-4 w-4" /> Add Category
          </Button>
        </div>

        <div className="space-y-10">
          {Object.entries(grouped).map(([group, cats]) => (
            <section key={group} className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                 <div className={cn("h-1.5 w-1.5 rounded-full", GROUP_STYLES[group]?.split(' ')[0])} />
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{group}</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cats.map((c) => (
                  <Card key={c.id} className="group border-border hover:border-primary/30 transition-all shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                       <div className="flex items-center gap-3 min-w-0">
                          <div className={cn("h-8 w-8 shrink-0 rounded-lg flex items-center justify-center", GROUP_STYLES[group])}>
                             <Tag className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                             <p className="font-bold text-sm tracking-tight truncate">{c.head}</p>
                             {c.subHead && <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">{c.subHead}</p>}
                          </div>
                       </div>
                       <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10" onClick={() => archiveCategory(c.id)}>
                            <Archive className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>

        {archived.length > 0 && (
          <div className="pt-8 space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 px-1">Archived Categories</h4>
            <div className="grid grid-cols-1 gap-2">
              {archived.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 px-4 rounded-lg bg-accent/20 border border-transparent opacity-60">
                  <span className="text-xs font-bold text-muted-foreground">{c.head} {c.subHead ? `· ${c.subHead}` : ''}</span>
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-wider" onClick={() => updateCategory(c.id, { isActive: true })}>
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight">{editing ? 'Edit Category' : 'New Category'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Category Group</Label>
              <Select 
                value={form.group} 
                onValueChange={(val) => setForm({ ...form, group: val as CategoryGroup })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GROUPS.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Main Head</Label>
                <Input 
                  placeholder="e.g., Food" 
                  value={form.head} 
                  onChange={(e) => setForm({ ...form, head: e.target.value })} 
                  className="h-10 border-border/50 focus:border-primary/30 font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sub Head</Label>
                <Input 
                  placeholder="e.g., Groceries" 
                  value={form.subHead} 
                  onChange={(e) => setForm({ ...form, subHead: e.target.value })} 
                  className="h-10 border-border/50 focus:border-primary/30"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter className="pt-4">
            <Button variant="ghost" onClick={() => setModalOpen(false)} className="h-10 px-6 font-bold uppercase text-[10px] tracking-widest">
              Cancel
            </Button>
            <Button onClick={handleSave} className="h-10 px-8 font-bold uppercase text-[10px] tracking-widest">
              {editing ? 'Update Category' : 'Create Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsLayout>
  );
}
