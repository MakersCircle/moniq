import type { UserSettings } from '../types';

// ── Format currency ──────────────────────────────────────────
export function formatCurrency(amount: number, settings: UserSettings): string {
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat(settings.numberLocale || 'en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);
  const sign = amount < 0 ? '-' : '';
  return `${sign}${settings.currencySymbol}${formatted}`;
}

// ── Format short currency (no decimals if whole number) ──────
export function formatCurrencyShort(amount: number, symbol = '₹'): string {
  const isLakh = Intl.NumberFormat().resolvedOptions().locale === 'en-IN' || symbol === '₹';

  if (isLakh) {
    if (amount >= 10_00_000) return `${symbol}${(amount / 10_00_000).toFixed(1)}L`;
    if (amount >= 1000) return `${symbol}${(amount / 1000).toFixed(1)}K`;
  } else {
    if (amount >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1000) return `${symbol}${(amount / 1000).toFixed(1)}K`;
  }

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

// ── Group transactions by date ───────────────────────────────
export function groupByDate<T extends { date: string }>(
  items: T[]
): { label: string; items: T[] }[] {
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
