import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { useDataStore } from '@/store/dataStore';
import { useTranslation } from '@/hooks/useTranslation';
import type { AccountType } from '@/types';

const ACCOUNT_CLASSES: AccountType[] = ['Asset', 'Liability'];

export interface AccountFormData {
  name: string;
  type: AccountType;
  description: string;
  initialBalance: number;
  isSavings: boolean;
  excludeFromNet: boolean;
  isActive: boolean;
}

interface AccountFormProps {
  initialData?: Partial<AccountFormData>;
  onSave: (data: AccountFormData) => void;
  onCancel: () => void;
  submitLabel?: string;
  cancelLabel?: string;
}

export function AccountForm({
  initialData,
  onSave,
  onCancel,
  submitLabel = 'Save',
}: AccountFormProps) {
  const { settings } = useDataStore();
  const { t } = useTranslation();

  const [form, setForm] = useState({
    name: initialData?.name || '',
    type: initialData?.type || 'Asset',
    description: initialData?.description || '',
    initialBalance:
      initialData?.initialBalance !== undefined ? String(initialData.initialBalance) : '',
    isSavings: initialData?.isSavings || false,
    excludeFromNet: initialData?.excludeFromNet || false,
  });

  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setError(t('account.displayNameRequired'));
      return;
    }

    const parsedInitial = parseFloat(form.initialBalance);
    const validInitial = isNaN(parsedInitial) ? 0 : parsedInitial;

    onSave({
      name: form.name.trim(),
      type: form.type,
      description: form.description.trim(),
      initialBalance: validInitial,
      isSavings: form.isSavings,
      excludeFromNet: form.excludeFromNet,
      isActive: initialData?.isActive ?? true,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center">
            {t('account.displayName')}
          </Label>
          <Input
            placeholder={t('account.displayNamePlaceholder')}
            value={form.name}
            onChange={e => {
              setForm({ ...form, name: e.target.value });
              setError('');
            }}
            className="h-10 border-border/50 focus:border-primary/30"
            autoFocus={!initialData?.name}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center">
            {t('account.class')}
            <InfoTooltip
              text={
                <div className="space-y-1">
                  <p>
                    <span className="font-bold text-foreground">
                      {t('account.assetTooltipPrefix')}
                    </span>{' '}
                    {t('account.assetTooltipText')}
                  </p>
                  <p>
                    <span className="font-bold text-foreground">
                      {t('account.liabilityTooltipPrefix')}
                    </span>{' '}
                    {t('account.liabilityTooltipText')}
                  </p>
                </div>
              }
            />
          </Label>
          <Select
            value={form.type}
            onValueChange={val => {
              const newType = val as AccountType;
              setForm({
                ...form,
                type: newType,
                isSavings: newType === 'Liability' ? false : form.isSavings,
              });
            }}
          >
            <SelectTrigger className="h-10 border-border/50 focus:border-primary/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACCOUNT_CLASSES.map(type => (
                <SelectItem key={type} value={type}>
                  {type === 'Asset' ? t('account.asset') : t('account.liability')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center">
            {t('account.description')}
          </Label>
          <textarea
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            className="flex min-h-[80px] w-full rounded-md border border-border/50 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4">
          <div
            className={cn(
              'flex items-center space-x-2 border rounded-lg p-3 border-border/50 transition-opacity',
              form.type === 'Liability' && 'opacity-50 pointer-events-none'
            )}
          >
            <Checkbox
              id="isSavings"
              checked={form.isSavings}
              disabled={form.type === 'Liability'}
              onCheckedChange={(val: boolean | 'indeterminate') =>
                setForm({ ...form, isSavings: !!val })
              }
              className="shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <label
                htmlFor="isSavings"
                className="text-xs font-medium cursor-pointer text-muted-foreground flex items-center gap-1 leading-tight"
              >
                <span>{t('account.savingsAccount')}</span>
                <InfoTooltip text={t('account.savingsAccountTooltip')} />
              </label>
            </div>
          </div>
          <div className="flex items-center space-x-2 border rounded-lg p-3 border-border/50">
            <Checkbox
              id="formExcludeFromNet"
              checked={form.excludeFromNet}
              onCheckedChange={(val: boolean | 'indeterminate') =>
                setForm({ ...form, excludeFromNet: !!val })
              }
              className="shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <label
                htmlFor="formExcludeFromNet"
                className="text-xs font-medium cursor-pointer text-muted-foreground flex items-center gap-1 leading-tight"
              >
                <span>{t('account.excludeFromNetWorth')}</span>
                <InfoTooltip text={t('account.excludeFromNetWorthTooltip')} />
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center">
            {t('account.openingBalance')}
            <InfoTooltip text={t('account.openingBalanceTooltip')} />
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
              {settings.currencySymbol}
            </span>
            <Input
              type="number"
              value={form.initialBalance}
              onChange={e => {
                setForm({ ...form, initialBalance: e.target.value });
                setError('');
              }}
              placeholder="0"
              className="h-12 pl-8 border-border/50 focus:border-primary/30 text-lg font-bold mono"
              inputMode="decimal"
              step="any"
            />
          </div>
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
          {t('common.cancel')}
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
