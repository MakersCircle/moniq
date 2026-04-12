import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Check, ChevronDown } from 'lucide-react';
import PageShell from '../components/PageShell';
import { useDataStore } from '../store/dataStore';
import type { TransactionType } from '../types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';

interface SplitLine {
  categoryId: string;
  amount: string;
  note: string;
}

const today = new Date().toISOString().slice(0, 10);

export default function AddTransaction() {
  const navigate = useNavigate();
  const { sources, methods, categories, settings, addTransaction, addTransactionGroup } = useDataStore();

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [sourceId, setSourceId] = useState(sources.find((s) => s.isActive)?.id || '');
  const [toSourceId, setToSourceId] = useState('');
  const [methodId, setMethodId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');

  const [isSplit, setIsSplit] = useState(false);
  const [splits, setSplits] = useState<SplitLine[]>([
    { categoryId: '', amount: '', note: '' },
    { categoryId: '', amount: '', note: '' },
  ]);

  const [showCatPicker, setShowCatPicker] = useState(false);
  const [splitPickerIdx, setSplitPickerIdx] = useState<number | null>(null);

  const activeSources = sources.filter((s) => s.isActive);
  const activeMethods = methods.filter((m) => m.isActive);
  const activeCategories = categories.filter((c) => c.isActive);

  const getCatLabel = (id: string) => {
    const c = activeCategories.find((c) => c.id === id);
    return c ? `${c.head}${c.subHead ? ' · ' + c.subHead : ''}` : 'Select category';
  };

  const totalSplitAmount = splits.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
  const parsedAmount = parseFloat(amount) || 0;
  const remainingForSplits = parsedAmount - totalSplitAmount;

  const handleSubmit = () => {
    if (!parsedAmount || parsedAmount <= 0) return;
    if (!sourceId) return;
    if (type !== 'transfer' && !isSplit && !categoryId) return;
    if (type === 'transfer' && !toSourceId) return;
    if (isSplit && splits.some((s) => !s.categoryId || !parseFloat(s.amount))) return;

    if (!isSplit || type !== 'expense') {
      addTransaction({
        date,
        type,
        amount: parsedAmount,
        sourceId,
        toSourceId: type === 'transfer' ? toSourceId : undefined,
        methodId: methodId || undefined,
        categoryId: type !== 'transfer' ? categoryId || undefined : undefined,
        note,
        tags: [],
      });
    } else {
      addTransactionGroup(
        splits.filter((s) => s.categoryId && parseFloat(s.amount)).map((s) => ({
          date,
          type: 'expense' as TransactionType,
          amount: parseFloat(s.amount),
          sourceId,
          methodId: methodId || undefined,
          categoryId: s.categoryId,
          note: s.note || note,
          tags: [],
        }))
      );
    }
    navigate('/');
  };

  const updateSplit = (idx: number, patch: Partial<SplitLine>) => {
    setSplits((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const addSplitLine = () => setSplits((prev) => [...prev, { categoryId: '', amount: '', note: '' }]);
  const removeSplitLine = (idx: number) => setSplits((prev) => prev.filter((_, i) => i !== idx));

  const catGroups = activeCategories.reduce<Record<string, typeof activeCategories>>((acc, c) => {
    const key = c.group;
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  return (
    <PageShell title="Add Transaction">
      <div className="flex flex-col gap-6 max-w-md mx-auto">
        <Tabs value={type} onValueChange={(v) => { 
          setType(v as TransactionType); 
          setIsSplit(false);
          setAmount('');
          setSplits([{ categoryId: '', amount: '', note: '' }, { categoryId: '', amount: '', note: '' }]);
        }}>

          <TabsList>
            <TabsTrigger value="expense">Expense</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="transfer">Transfer</TabsTrigger>
          </TabsList>
        </Tabs>

        <Card className="p-0 border-none bg-transparent shadow-none">
          <div className="flex flex-col items-center justify-center py-6">
             <div className="flex items-center gap-2">
                <span className="text-3xl font-medium text-muted-foreground">{settings.currencySymbol}</span>
                <input
                  type="number"
                  className="bg-transparent text-6xl font-semibold outline-none text-center w-full min-w-[200px]"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                  autoFocus
                />
             </div>
             {isSplit && (
                <p className={cn(
                  "mt-4 text-sm font-medium",
                  Math.abs(remainingForSplits) < 0.01 ? "text-income" : "text-expense"
                )}>
                  {Math.abs(remainingForSplits) < 0.01 
                    ? "✓ All split" 
                    : `To split: ${settings.currencySymbol}${remainingForSplits.toFixed(2)}`}
                </p>
             )}
          </div>
        </Card>

        <div className="space-y-4 px-1">
          <div className="space-y-2">
            <Label htmlFor="txn-date">Date</Label>
            <Input id="txn-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="txn-source">{type === 'transfer' ? 'From Account' : 'Account'}</Label>
            <Select value={sourceId} onValueChange={setSourceId}>
              <SelectTrigger id="txn-source">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {activeSources.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === 'transfer' && (
            <div className="space-y-2">
              <Label htmlFor="txn-to-source">To Account</Label>
              <Select value={toSourceId} onValueChange={setToSourceId}>
                <SelectTrigger id="txn-to-source">
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  {activeSources.filter(s => s.id !== sourceId).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="txn-method">Payment Method</Label>
            <Select value={methodId} onValueChange={setMethodId}>
              <SelectTrigger id="txn-method">
                <SelectValue placeholder="Select method (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {activeMethods.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type !== 'transfer' && !isSplit && (
            <div className="space-y-2">
              <Label>Category</Label>
              <Button
                variant="outline"
                className="w-full justify-between font-normal"
                onClick={() => setShowCatPicker(true)}
              >
                <span className={categoryId ? 'text-primary font-medium' : 'text-muted-foreground'}>
                  {getCatLabel(categoryId)}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </div>
          )}

          {type === 'expense' && (
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label>Split Expense</Label>
                <p className="text-[0.8rem] text-muted-foreground">Assign to multiple categories</p>
              </div>
              <Button 
                variant={isSplit ? "default" : "outline"}
                size="sm"
                onClick={() => setIsSplit(!isSplit)}
              >
                {isSplit ? "Active" : "Enable"}
              </Button>
            </div>
          )}

          {isSplit && type === 'expense' && (
            <div className="space-y-4">
              {splits.map((s, idx) => (
                <Card key={idx} className="p-4 space-y-3">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 justify-between text-left font-normal h-9 px-3 py-1"
                      onClick={() => { setSplitPickerIdx(idx); setShowCatPicker(true); }}
                    >
                      <span className={s.categoryId ? 'text-primary font-medium truncate' : 'text-muted-foreground truncate'}>
                        {getCatLabel(s.categoryId)}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                    </Button>
                    <Input
                      type="number"
                      className="w-24 h-9"
                      placeholder="Amount"
                      value={s.amount}
                      onChange={(e) => updateSplit(idx, { amount: e.target.value })}
                    />
                    {splits.length > 2 && (
                      <Button variant="ghost" size="icon" onClick={() => removeSplitLine(idx)}>
                        <Trash2 className="h-4 w-4 text-expense" />
                      </Button>
                    )}
                  </div>
                  <Input
                    placeholder="Note for this split (optional)"
                    className="h-8 text-xs"
                    value={s.note}
                    onChange={(e) => updateSplit(idx, { note: e.target.value })}
                  />
                </Card>
              ))}
              <Button variant="outline" className="w-full dashed border-dashed border-2" onClick={addSplitLine}>
                <Plus className="mr-2 h-4 w-4" /> Add Split
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="txn-note">Note</Label>
            <Input
              id="txn-note"
              placeholder="What was this for?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <Button 
            className="w-full mt-4 h-12 text-lg" 
            size="lg"
            onClick={handleSubmit} 
            disabled={!parsedAmount || parsedAmount <= 0}
          >
            <Check className="mr-2 h-5 w-5" /> Save Transaction
          </Button>
        </div>
      </div>

      <Dialog open={showCatPicker} onOpenChange={(o) => { if(!o) { setShowCatPicker(false); setSplitPickerIdx(null); }}}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {Object.entries(catGroups).map(([group, cats]) => (
              <div key={group} className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">{group}</p>
                <div className="grid grid-cols-1 gap-1">
                  {cats.map((c) => (
                    <Button
                      key={c.id}
                      variant="ghost"
                      className="justify-start h-auto py-2.5 px-3 text-sm font-normal"
                      onClick={() => {
                        if (splitPickerIdx !== null) {
                          updateSplit(splitPickerIdx, { categoryId: c.id });
                        } else {
                          setCategoryId(c.id);
                        }
                        setShowCatPicker(false);
                      }}
                    >
                      <span>{c.head}</span>
                      {c.subHead && <span className="text-muted-foreground ml-2">· {c.subHead}</span>}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}


