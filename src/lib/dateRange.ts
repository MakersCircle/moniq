export interface DateRange {
  startDate: string;
  endDate: string;
}

/** Return complete date bounds in chronological order, regardless of input order. */
export function normalizeDateRange<T extends DateRange>(range: T | null): T | null {
  if (!range?.startDate || !range.endDate) return null;
  if (range.startDate <= range.endDate) return range;
  return { ...range, startDate: range.endDate, endDate: range.startDate };
}
