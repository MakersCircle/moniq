import { useState, useMemo, useRef } from 'react';
import { Plus, Trash2, Check, Repeat } from 'lucide-react';
import { useDataStore } from '@/store/dataStore';
import type { Transaction, TransactionType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';
import { DatePicker } from './DatePicker';
import { LedgerEngine } from '@/lib/ledger';

interface SplitLine {
  categoryId: string;
  amount: string;
  note: string;
}

const today = new Date().toISOString().slice(0, 10);

interface AddTransactionModalProps {
  onClose: () => void;
  initialData?: Transaction;
  isDuplicate?: boolean;
  defaultType?: TransactionType;
}

export default function AddTransactionModal({
  onClose,
  initialData,
  isDuplicate,
  defaultType,
}: AddTransactionModalProps) {
  const {
    accounts,
    methods,
    categories,
    settings,
    addTransaction,
    updateTransaction,
    transactions,
  } = useDataStore();

  const lastTransaction = useMemo(() => transactions[0], [transactions]);

  // Helper to find initial account/category from ledger entries
  const initialAccountId = useMemo(() => {
    if (!initialData) return accounts.find(a => a.isActive)?.id || '';
    const isIncome = initialData.uiType === 'income';
    const entry = initialData.entries.find(
      e =>
        accounts.some(a => a.id === e.accountId) &&
        (isIncome ? e.type === 'DEBIT' : e.type === 'CREDIT')
    );
    return entry?.accountId || accounts.find(a => a.isActive)?.id || '';
  }, [initialData, accounts]);

  const initialTargetId = useMemo(() => {
    if (!initialData) return '';
    const isIncome = initialData.uiType === 'income';
    const entry = initialData.entries.find(
      e => e.accountId !== initialAccountId && (isIncome ? e.type === 'CREDIT' : e.type === 'DEBIT')
    );
    return entry?.accountId || '';
  }, [initialData, initialAccountId]);

  const activeAccounts = useMemo(
    () => accounts.filter(s => s.isActive && !s.isDeleted),
    [accounts]
  );
  const activeMethods = useMemo(() => methods.filter(m => m.isActive && !m.isDeleted), [methods]);
  const activeCategories = useMemo(
    () => categories.filter(c => c.isActive && !c.isDeleted),
    [categories]
  );

  // Get unique category heads
  const categoryHeads = useMemo(() => {
    const heads = new Map<string, string>();
    activeCategories.forEach(c => {
      if (!heads.has(c.head)) heads.set(c.head, c.head);
    });
    return Array.from(heads.keys());
  }, [activeCategories]);

  const [type, setType] = useState<TransactionType>(
    initialData?.uiType || defaultType || 'expense'
  );
  const [isSplit, setIsSplit] = useState(false);
  const [splits, setSplits] = useState<SplitLine[]>([
    { categoryId: '', amount: '', note: '' },
    { categoryId: '', amount: '', note: '' },
  ]);

  const [prevDefaultType, setPrevDefaultType] = useState(defaultType);
  if (defaultType !== prevDefaultType && !initialData) {
    setPrevDefaultType(defaultType);
    if (defaultType) {
      setType(defaultType);
      setIsSplit(false);
    }
  }
  const [amount, setAmount] = useState(
    initialData?.entries[0]?.amount ? String(initialData.entries[0].amount) : ''
  );
  const [date, setDate] = useState(isDuplicate ? today : initialData?.date || today);
  const accountId = initialAccountId;
  const [targetId, setTargetId] = useState(initialTargetId);
  const [methodId, setMethodId] = useState(
    initialData?.methodId || lastTransaction?.methodId || activeMethods[0]?.id || ''
  );
  const [note, setNote] = useState(initialData?.note || '');

  const amountRef = useRef<HTMLInputElement>(null);

  // Category head/sub split state
  const initialCategoryHead = useMemo(() => {
    if (!initialData || initialData.uiType === 'transfer') return '';
    const cat = activeCategories.find(c => c.id === initialTargetId);
    return cat?.head || '';
  }, [initialData, initialTargetId, activeCategories]);

  const [selectedHead, setSelectedHead] = useState(initialCategoryHead);

  // Sub-heads filtered by selected head
  const subCategories = useMemo(() => {
    if (!selectedHead) return [];
    return activeCategories.filter(c => c.head === selectedHead);
  }, [selectedHead, activeCategories]);

  // Transfer: From/To using payment methods
  const initialFromMethodId = useMemo(() => {
    if (!initialData || initialData.uiType !== 'transfer') return '';
    const sourceEntry = initialData.entries.find(
      e => e.type === 'CREDIT' && accounts.some(a => a.id === e.accountId)
    );
    if (sourceEntry) {
      const m = activeMethods.find(pm => pm.linkedAccountId === sourceEntry.accountId);
      return m?.id || '';
    }
    return '';
  }, [initialData, accounts, activeMethods]);

  const initialToMethodId = useMemo(() => {
    if (!initialData || initialData.uiType !== 'transfer') return '';
    const destEntry = initialData.entries.find(
      e => e.type === 'DEBIT' && accounts.some(a => a.id === e.accountId)
    );
    if (destEntry) {
      const m = activeMethods.find(pm => pm.linkedAccountId === destEntry.accountId);
      return m?.id || '';
    }
    return '';
  }, [initialData, accounts, activeMethods]);

  const [fromMethodId, setFromMethodId] = useState(initialFromMethodId);
  const [toMethodId, setToMethodId] = useState(initialToMethodId);

  // For transfers: derive account IDs from selected methods
  const fromAccountId = useMemo(() => {
    const m = methods.find(pm => pm.id === fromMethodId);
    return m?.linkedAccountId || '';
  }, [fromMethodId, methods]);

  const toAccountId = useMemo(() => {
    const m = methods.find(pm => pm.id === toMethodId);
    return m?.linkedAccountId || '';
  }, [toMethodId, methods]);

  // Filter "To" methods: exclude methods linked to the same account as "From"
  const toMethodOptions = useMemo(() => {
    if (!fromMethodId) return activeMethods;
    const fromMethod = methods.find(pm => pm.id === fromMethodId);
    if (!fromMethod?.linkedAccountId) return activeMethods;
    return activeMethods.filter(m => m.linkedAccountId !== fromMethod.linkedAccountId);
  }, [fromMethodId, methods, activeMethods]);

  // Derived accountId for Income/Expense based on chosen payment method
  const derivedAccountId = useMemo(() => {
    if (type === 'transfer') return fromAccountId;
    const method = methods.find(pm => pm.id === methodId);
    return method?.linkedAccountId || accountId;
  }, [type, accountId, methodId, methods, fromAccountId]);

  // Derived targetId for transfers
  const derivedTargetId = useMemo(() => {
    if (type === 'transfer') return toAccountId;
    return targetId;
  }, [type, targetId, toAccountId]);

  const parsedAmount = parseFloat(amount) || 0;
  const totalSplitAmount = splits.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
  const remainingForSplits = parsedAmount - totalSplitAmount;
  const isFullyAllocated = Math.abs(remainingForSplits) < 0.01;

  const isValidTransaction = useMemo(() => {
    if (!parsedAmount || parsedAmount <= 0) return false;
    if (!date || isNaN(Date.parse(date))) return false;

    if (type === 'transfer') {
      return !!fromMethodId && !!toMethodId;
    } else {
      if (!methodId) return false;
      if (isSplit) {
        return isFullyAllocated && splits.every(s => s.categoryId && parseFloat(s.amount) > 0);
      }
      return !!targetId;
    }
  }, [
    parsedAmount,
    date,
    type,
    fromMethodId,
    toMethodId,
    methodId,
    isSplit,
    isFullyAllocated,
    splits,
    targetId,
  ]);

  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = async (e?: React.FormEvent, keepOpen = false) => {
    if (e) e.preventDefault();
    if (!isValidTransaction) return;

    const isEditing = !!initialData && !isDuplicate;

    if (!isSplit || type !== 'expense') {
      const payload = {
        date,
        uiType: type,
        amount: parsedAmount,
        accountId: derivedAccountId,
        targetId: derivedTargetId,
        methodId: type !== 'transfer' ? methodId : undefined,
        note,
        tags: [],
      };

      if (isEditing) {
        const entries = LedgerEngine.createEntries({
          type,
          amount: parsedAmount,
          accountId: derivedAccountId,
          targetId: derivedTargetId,
        });
        updateTransaction(initialData!.id, { ...payload, entries });
      } else {
        addTransaction(payload);
      }
    } else {
      splits
        .filter(s => s.categoryId && parseFloat(s.amount))
        .forEach(s => {
          addTransaction({
            date,
            uiType: 'expense',
            amount: parseFloat(s.amount),
            accountId: derivedAccountId,
            targetId: s.categoryId,
            methodId: methodId || undefined,
            note: s.note || note,
            tags: [],
          });
        });
    }

    if (keepOpen) {
      setAmount('');
      setNote('');
      setTargetId('');
      setSelectedHead('');
      setFromMethodId('');
      setToMethodId('');
      setSplits([{ categoryId: '', amount: '', note: '' }]);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
      // Keep date, methodId, type as requested for continuous entry
      setTimeout(() => amountRef.current?.focus(), 10);
    } else {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const isCmdOrCtrl = e.metaKey || e.ctrlKey;
    const isAlt = e.altKey;

    // Tab switching shortcuts
    if ((isAlt || isCmdOrCtrl) && (e.key === '1' || e.key === '2' || e.key === '3')) {
      e.preventDefault();
      const newType = e.key === '1' ? 'expense' : e.key === '2' ? 'income' : 'transfer';
      setType(newType);
      setIsSplit(false);
      return;
    }

    // Shift + I, E, T (switching tabs, only if not typing)
    if (e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey) {
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (!isTyping) {
        if (['I', 'E', 'T'].includes(e.key)) {
          e.preventDefault();
          const newType = e.key === 'E' ? 'expense' : e.key === 'I' ? 'income' : 'transfer';
          setType(newType);
          setIsSplit(false);
          return;
        }
      }
    }

    if (e.key === 'Enter') {
      if (isCmdOrCtrl) {
        // Cmd/Ctrl + Enter = Save & Stay
        e.preventDefault();
        handleSubmit(undefined, true);
      } else if (e.shiftKey && (e.target as HTMLElement).tagName === 'TEXTAREA') {
        // Shift + Enter in textarea = New line (let default happen)
        return;
      } else {
        // Enter = Save & Close (even in textarea)
        e.preventDefault();
        handleSubmit();
      }
    }
  };

  const inputClasses = 'h-9 bg-muted/40 border-transparent focus:border-primary/30 transition-all';

  return (
    <form
      onSubmit={e => handleSubmit(e)}
      onKeyDown={handleKeyDown}
      className="flex flex-col max-h-full overflow-hidden bg-background"
    >
      {/* Header Area */}
      <div className="px-6 py-4 border-b border-border bg-accent/5">
        <div className="flex items-center justify-between mb-4 pr-10">
          <h2 className="text-lg font-bold tracking-tight">
            {initialData && !isDuplicate ? 'Edit' : 'New'} Transaction
          </h2>
          <Tabs
            value={type}
            onValueChange={v => {
              setType(v as TransactionType);
              setIsSplit(false);
            }}
            className="w-auto"
          >
            <TabsList className="bg-transparent border-b rounded-none h-auto p-0 gap-4">
              {['expense', 'income', 'transfer'].map(t => (
                <TabsTrigger
                  key={t}
                  value={t}
                  className={cn(
                    'rounded-none border-b-2 border-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-all',
                    t === 'expense'
                      ? 'data-[state=active]:border-expense data-[state=active]:text-expense'
                      : t === 'income'
                        ? 'data-[state=active]:border-income data-[state=active]:text-income'
                        : 'data-[state=active]:border-primary data-[state=active]:text-foreground'
                  )}
                >
                  {t}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Amount Input */}
        <div className="flex flex-col items-center py-2">
          <div className="relative group flex items-center justify-center">
            <span className="text-3xl font-black text-muted-foreground/40 mr-2 group-focus-within:text-primary transition-colors">
              {settings.currencySymbol}
            </span>
            <input
              ref={amountRef}
              type="number"
              min="0"
              autoFocus
              tabIndex={1}
              className={cn(
                'bg-transparent text-5xl font-black outline-none text-center w-full max-w-[240px] mono tracking-tighter transition-colors',
                type === 'income'
                  ? 'text-income'
                  : type === 'expense'
                    ? 'text-expense'
                    : 'text-foreground'
              )}
              placeholder="0.00"
              value={amount}
              onChange={e => {
                const val = e.target.value;
                // Strip everything except numbers and decimal point
                const sanitized = val.replace(/[^0-9.]/g, '');
                setAmount(sanitized);
              }}
              onKeyDown={e => {
                // Prevent 'e', '+', '-' from being entered
                if (['e', 'E', '+', '-'].includes(e.key)) {
                  e.preventDefault();
                }
              }}
              inputMode="decimal"
              step="any"
            />
          </div>
          {isSplit && (
            <div
              className={cn(
                'mt-2 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-colors',
                isFullyAllocated
                  ? 'bg-income/10 text-income border border-income/20'
                  : 'bg-expense/10 text-expense border border-expense/20'
              )}
            >
              {isFullyAllocated
                ? '✓ All Split'
                : `Allocated ${formatCurrency(totalSplitAmount, settings)} of ${formatCurrency(parsedAmount, settings)}`}
            </div>
          )}
        </div>
      </div>

      {/* Form Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 custom-scrollbar min-h-[400px]">
        {type === 'transfer' ? (
          <>
            {/* Transfer: Date */}
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-0.5">
                  Date
                </Label>
                <DatePicker date={date} onChange={setDate} tabIndex={2} />
              </div>
            </div>

            {/* Transfer: From / To using payment methods */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-0.5">
                  From
                </Label>
                <Select
                  value={fromMethodId || undefined}
                  onValueChange={val => {
                    setFromMethodId(val);
                    if (val === toMethodId) setToMethodId('');
                  }}
                >
                  <SelectTrigger className={inputClasses} tabIndex={3}>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeMethods.map(m => {
                      const acct = activeAccounts.find(a => a.id === m.linkedAccountId);
                      return (
                        <SelectItem key={m.id} value={m.id} textValue={m.name}>
                          {m.name}
                          {acct ? ` · ${acct.name}` : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {fromAccountId && (
                  <p className="text-[9px] text-muted-foreground px-0.5">
                    Account: {activeAccounts.find(a => a.id === fromAccountId)?.name}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-0.5">
                  To
                </Label>
                <Select value={toMethodId || undefined} onValueChange={setToMethodId}>
                  <SelectTrigger className={inputClasses} tabIndex={4}>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {toMethodOptions.map(m => {
                      const acct = activeAccounts.find(a => a.id === m.linkedAccountId);
                      return (
                        <SelectItem key={m.id} value={m.id} textValue={m.name}>
                          {m.name}
                          {acct ? ` · ${acct.name}` : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {toAccountId && (
                  <p className="text-[9px] text-muted-foreground px-0.5">
                    Account: {activeAccounts.find(a => a.id === toAccountId)?.name}
                  </p>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Income/Expense: Date + Payment Method */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-0.5">
                  Date
                </Label>
                <DatePicker date={date} onChange={setDate} tabIndex={2} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-0.5">
                  Payment Method
                </Label>
                <Select value={methodId} onValueChange={setMethodId}>
                  <SelectTrigger className={inputClasses} tabIndex={3}>
                    <SelectValue placeholder="Select Method" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeMethods.map(m => (
                      <SelectItem key={m.id} value={m.id} textValue={m.name}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {derivedAccountId && (
                  <p className="text-[9px] text-muted-foreground px-0.5">
                    Account: {activeAccounts.find(a => a.id === derivedAccountId)?.name}
                  </p>
                )}
              </div>
            </div>

            {/* Category: Head + Sub-head as separate dropdowns */}
            {!isSplit && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-right-2 duration-300">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-0.5">
                    Category
                  </Label>
                  <Select
                    value={selectedHead || undefined}
                    onValueChange={val => {
                      setSelectedHead(val);
                      const subs = activeCategories.filter(c => c.head === val);
                      setTargetId(subs.length === 1 ? subs[0].id : '');
                    }}
                  >
                    <SelectTrigger className={inputClasses} tabIndex={4}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryHeads.map(h => (
                        <SelectItem key={h} value={h} textValue={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-0.5">
                    Sub-category
                  </Label>
                  {subCategories.length <= 1 ? (
                    <div
                      className={cn(
                        inputClasses,
                        'flex items-center px-3 rounded-md text-sm',
                        !selectedHead && 'opacity-50'
                      )}
                    >
                      {subCategories.length === 1 ? (
                        <span className="truncate">
                          {subCategories[0].subHead || subCategories[0].head}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {selectedHead ? '—' : 'Pick category first'}
                        </span>
                      )}
                    </div>
                  ) : (
                    <Select value={targetId || undefined} onValueChange={setTargetId}>
                      <SelectTrigger className={inputClasses} tabIndex={5}>
                        <SelectValue placeholder="Select sub-category" />
                      </SelectTrigger>
                      <SelectContent>
                        {subCategories.map(c => (
                          <SelectItem key={c.id} value={c.id} textValue={c.subHead || c.head}>
                            {c.subHead || c.head}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {type === 'expense' && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setIsSplit(!isSplit)}
              className={cn(
                'flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-colors py-1',
                isSplit ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Repeat className="h-3 w-3" />
              {isSplit ? 'Disable Split' : 'Split this transaction'}
            </button>
          </div>
        )}

        {isSplit && (
          <div className="space-y-2.5 animate-in fade-in duration-300 pb-2">
            {splits.map((s, idx) => (
              <div
                key={idx}
                className="flex gap-2 items-center bg-accent/5 p-1.5 rounded-lg border border-border/10"
              >
                <div className="flex-1">
                  <Select
                    value={s.categoryId}
                    onValueChange={val => {
                      const next = [...splits];
                      next[idx].categoryId = val;
                      setSplits(next);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background border-transparent">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeCategories.map(cat => (
                        <SelectItem
                          key={cat.id}
                          value={cat.id}
                          className="text-xs"
                          textValue={cat.head}
                        >
                          {cat.head}
                          {cat.subHead ? ` · ${cat.subHead}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24">
                  <Input
                    type="number"
                    placeholder="Amt"
                    className="h-8 text-xs mono bg-background border-transparent"
                    value={s.amount}
                    onChange={e => {
                      const next = [...splits];
                      next[idx].amount = e.target.value;
                      setSplits(next);
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-expense hover:bg-expense/10 shrink-0"
                  onClick={() => setSplits(splits.filter((_, i) => i !== idx))}
                  disabled={splits.length <= 1}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full text-[9px] font-bold uppercase tracking-[0.2em] h-7 border-dashed border-muted-foreground/30 text-muted-foreground hover:text-primary hover:border-primary/50 bg-transparent"
              onClick={() => setSplits([...splits, { categoryId: '', amount: '', note: '' }])}
            >
              <Plus className="h-3 w-3 mr-1.5" /> Add Category
            </Button>
          </div>
        )}

        <div className="space-y-1.5 pb-4">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-0.5">
            Note
          </Label>
          <textarea
            placeholder="What was this for?"
            className="w-full min-h-[60px] p-3 rounded-md bg-muted/40 border-transparent focus:ring-1 focus:ring-primary/20 text-xs outline-none resize-none transition-all placeholder:text-muted-foreground/50"
            value={note}
            onChange={e => setNote(e.target.value)}
            tabIndex={6}
          />
          <div className="flex justify-end px-0.5">
            <span className="text-[9px] text-muted-foreground/50 italic font-medium">
              Shift + Enter for new line • Enter to save
            </span>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 border-t border-border bg-accent/5 flex items-center justify-between gap-4">
        {isSaved && (
          <div className="flex items-center gap-2 text-income animate-in fade-in slide-in-from-left-2">
            <div className="w-1.5 h-1.5 rounded-full bg-income animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Saved</span>
          </div>
        )}
        <Button
          type="submit"
          className={cn(
            'flex-1 h-11 text-xs font-bold uppercase tracking-[0.2em] transition-all',
            type === 'income'
              ? 'bg-income hover:bg-income/90 text-white shadow-income/20'
              : type === 'expense'
                ? 'bg-expense hover:bg-expense/90 text-white shadow-expense/20'
                : 'bg-primary hover:bg-primary/90 text-white shadow-primary/20'
          )}
          disabled={!isValidTransaction}
        >
          <Check className="h-4 w-4 mr-2" />
          Save {type}
        </Button>
      </div>
    </form>
  );
}
