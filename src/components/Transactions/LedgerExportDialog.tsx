import { useMemo, useState } from 'react';
import { Download, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Account, Category, Transaction, UserSettings } from '@/types';
import { ResponsiveModal } from '@/components/ui/responsive-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';
import { buildLedgerReport } from '@/lib/ledgerReport';
import { downloadLedgerPdf } from '@/lib/ledgerPdf';

type DatePreset = 'current' | 'previous' | 'all' | 'custom';
type ReportLayout = 'full' | 'category';

interface DateRange {
  startDate: string;
  endDate: string;
}

interface LedgerExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  settings: UserSettings;
}

function monthRange(offset = 0): DateRange {
  const today = new Date();
  const month = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  return {
    startDate: isoDate(month),
    endDate: isoDate(lastDay),
  };
}

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function allTimeRange(transactions: Transaction[], accountId: string): DateRange | null {
  const dates = transactions
    .filter(
      transaction =>
        !transaction.isDeleted &&
        (!accountId || transaction.entries.some(entry => entry.accountId === accountId))
    )
    .map(transaction => transaction.date)
    .sort();
  if (dates.length === 0) return null;
  return { startDate: dates[0], endDate: dates[dates.length - 1] };
}

export function LedgerExportDialog({
  open,
  onOpenChange,
  transactions,
  accounts,
  categories,
  settings,
}: LedgerExportDialogProps) {
  const { t } = useTranslation();
  const [datePreset, setDatePreset] = useState<DatePreset>('current');
  const [dateRange, setDateRange] = useState<DateRange>(() => monthRange());
  const [accountId, setAccountId] = useState('all');
  const [layout, setLayout] = useState<ReportLayout>('full');
  const [isGenerating, setIsGenerating] = useState(false);

  const effectiveRange =
    datePreset === 'all'
      ? allTimeRange(transactions, accountId === 'all' ? '' : accountId)
      : dateRange;
  const reportStartDate = effectiveRange?.startDate;
  const reportEndDate = effectiveRange?.endDate;
  const report = useMemo(() => {
    if (!reportStartDate || !reportEndDate) return null;
    return buildLedgerReport(transactions, accounts, categories, {
      startDate: reportStartDate,
      endDate: reportEndDate,
      accountId: accountId === 'all' ? undefined : accountId,
      layout,
    });
  }, [transactions, accounts, categories, reportStartDate, reportEndDate, accountId, layout]);

  const rangeIsValid =
    !!effectiveRange &&
    effectiveRange.startDate.length > 0 &&
    effectiveRange.startDate <= effectiveRange.endDate;
  const hasReportRows = !!report && report.rows.length > 0;

  const choosePreset = (value: DatePreset) => {
    setDatePreset(value);
    if (value === 'current') setDateRange(monthRange());
    if (value === 'previous') setDateRange(monthRange(-1));
    if (value === 'custom') return;
  };

  const updateCustomRange = (patch: Partial<DateRange>) => {
    setDatePreset('custom');
    setDateRange(current => ({ ...current, ...patch }));
  };

  const handleExport = async () => {
    if (!report || !rangeIsValid || !hasReportRows) return;
    setIsGenerating(true);
    try {
      await downloadLedgerPdf(report, settings);
      onOpenChange(false);
    } catch {
      toast.error(t('ledger.pdfExportFailed'));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={t('ledger.exportReport')}
      description={t('ledger.exportReportDescription')}
      className="max-w-xl"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleExport}
            disabled={!rangeIsValid || !hasReportRows || isGenerating}
          >
            {isGenerating ? <LoaderCircle className="animate-spin" /> : <Download />}
            {isGenerating ? t('ledger.generatingPdf') : t('ledger.downloadPdf')}
          </Button>
        </>
      }
    >
      <div className="space-y-5 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>{t('ledger.reportLayout')}</FieldLabel>
            <Select value={layout} onValueChange={value => setLayout(value as ReportLayout)}>
              <SelectTrigger aria-label={t('ledger.reportLayout')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">{t('ledger.fullList')}</SelectItem>
                <SelectItem value="category">{t('ledger.categoryWise')}</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>{t('common.account')}</FieldLabel>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger aria-label={t('common.account')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('ledger.allAccounts')}</SelectItem>
                {accounts
                  .filter(account => !account.isDeleted)
                  .map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field>
          <FieldLabel>{t('ledger.dateRange')}</FieldLabel>
          <Select value={datePreset} onValueChange={value => choosePreset(value as DatePreset)}>
            <SelectTrigger aria-label={t('ledger.dateRange')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">{t('ledger.currentMonth')}</SelectItem>
              <SelectItem value="previous">{t('ledger.previousMonth')}</SelectItem>
              <SelectItem value="all">{t('ledger.allTime')}</SelectItem>
              <SelectItem value="custom">{t('ledger.customRange')}</SelectItem>
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Field>
              <FieldLabel>{t('ledger.fromDate')}</FieldLabel>
              <Input
                aria-label={t('ledger.fromDate')}
                type="date"
                value={effectiveRange?.startDate ?? ''}
                disabled={datePreset !== 'custom'}
                onChange={event => updateCustomRange({ startDate: event.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel>{t('ledger.toDate')}</FieldLabel>
              <Input
                aria-label={t('ledger.toDate')}
                type="date"
                value={effectiveRange?.endDate ?? ''}
                disabled={datePreset !== 'custom'}
                onChange={event => updateCustomRange({ endDate: event.target.value })}
              />
            </Field>
          </div>
          {!rangeIsValid && (
            <p role="alert" className="pt-2 text-xs text-destructive">
              {t('ledger.invalidDateRange')}
            </p>
          )}
        </Field>

        {effectiveRange && (
          <p className="text-xs text-muted-foreground">
            {hasReportRows
              ? t('ledger.exportTransactionCount', { count: report?.rows.length ?? 0 })
              : t('ledger.noExportTransactions')}
          </p>
        )}
        {datePreset === 'all' && !effectiveRange && (
          <p className="text-xs text-muted-foreground">{t('ledger.noExportTransactions')}</p>
        )}
      </div>
    </ResponsiveModal>
  );
}
