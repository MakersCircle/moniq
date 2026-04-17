import type { Transaction, Account, Category, PaymentMethod, UserSettings } from '../types';

// ── Format currency ──────────────────────────────────────────
export function formatCurrency(amount: number, settings: UserSettings): string {
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);
  return `${settings.currencySymbol}${formatted}`;
}

// ── Format short currency (no decimals if whole number) ──────
export function formatCurrencyShort(amount: number, symbol = '₹'): string {
  if (amount >= 10_00_000) return `${symbol}${(amount / 10_00_000).toFixed(1)}L`;
  if (amount >= 1000)      return `${symbol}${(amount / 1000).toFixed(1)}K`;
  return `${symbol}${amount.toFixed(0)}`;
}

// ── Format date ──────────────────────────────────────────────
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export function formatMonth(iso: string): string {
  const d = new Date(iso + '-01');
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// ── CSV export ───────────────────────────────────────────────
export function exportToCSV(
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[],
  methods: PaymentMethod[],
  filename = 'moniq-export.csv'
) {
  const accMap = Object.fromEntries(accounts.map((s) => [s.id, s.name]));
  const catMap = Object.fromEntries(categories.map((c) => [c.id, `${c.head}${c.subHead ? ' / ' + c.subHead : ''}`]));
  const metMap = Object.fromEntries(methods.map((m) => [m.id, m.name]));

  const header = ['Date', 'Type', 'Amount', 'Primary Account', 'Target (Category/Account)', 'Method', 'Note'];
  const rows = transactions
    .filter((t) => !t.isDeleted)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((t) => {
      const isIncome = t.uiType === 'income';
      const isTransfer = t.uiType === 'transfer';
      
      const accEntry = t.entries.find(e => accounts.some(a => a.id === e.accountId) && (isIncome ? e.type === 'DEBIT' : e.type === 'CREDIT'));
      const targetEntry = t.entries.find(e => e.accountId !== accEntry?.accountId);

      let targetLabel = '';
      if (isTransfer) {
        targetLabel = accMap[targetEntry?.accountId || ''] || 'Unknown';
      } else {
        targetLabel = catMap[targetEntry?.accountId || ''] || 'Unknown';
      }

      return [
        t.date,
        t.uiType,
        t.amount.toFixed(2),
        accMap[accEntry?.accountId || ''] || 'Unknown',
        targetLabel,
        t.methodId ? metMap[t.methodId] || t.methodId : '',
        `"${(t.note || '').replace(/"/g, '""')}"`,
      ];
    });

  const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Group transactions by date ───────────────────────────────
export function groupByDate<T extends { date: string }>(items: T[]): { label: string; items: T[] }[] {
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    const key = item.date.slice(0, 10);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return Object.entries(groups)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => ({ label: formatDate(date), items }));
}
