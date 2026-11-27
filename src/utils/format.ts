import type { UserSettings } from '../types';

const currencyFormatters = new Map<string, Intl.NumberFormat>();
const defaultUsesLakhs = new Intl.NumberFormat().resolvedOptions().locale === 'en-IN';
const fullDateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});
const shortDateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
});
const yearFormatter = new Intl.DateTimeFormat('en-IN', { year: 'numeric' });

// ── Format currency ──────────────────────────────────────────
export function formatCurrency(amount: number, settings: UserSettings): string {
  const locale = settings.numberLocale || 'en-IN';
  let formatter = currencyFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    currencyFormatters.set(locale, formatter);
  }
  const formatted = formatter.format(Math.abs(amount));
  const sign = amount < 0 ? '-' : '';
  return `${sign}${settings.currencySymbol}${formatted}`;
}

// ── Format short currency (no decimals if whole number) ──────
export function formatCurrencyShort(amount: number, symbol = '₹'): string {
  const isLakh = defaultUsesLakhs || symbol === '₹';

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
function formatWithDateFormatter(value: string | Date, formatter: Intl.DateTimeFormat): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? 'Invalid Date' : formatter.format(date);
}

export function formatDate(value: string | Date): string {
  return formatWithDateFormatter(value, fullDateFormatter);
}

export function formatDateShort(value: string | Date): string {
  return formatWithDateFormatter(value, shortDateFormatter);
}

export function formatDateYear(value: Date): string {
  return formatWithDateFormatter(value, yearFormatter);
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
