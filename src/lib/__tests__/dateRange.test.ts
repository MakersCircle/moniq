import { describe, expect, it } from 'vitest';
import { normalizeDateRange } from '../dateRange';

describe('normalizeDateRange', () => {
  it('keeps complete ranges in chronological order', () => {
    const range = { startDate: '2026-11-01', endDate: '2026-11-30' };
    expect(normalizeDateRange(range)).toEqual(range);
  });

  it('orders endpoints chronologically when selected in reverse', () => {
    expect(normalizeDateRange({ startDate: '2026-11-30', endDate: '2026-11-01' })).toEqual({
      startDate: '2026-11-01',
      endDate: '2026-11-30',
    });
  });

  it('returns null until both endpoints are present', () => {
    expect(normalizeDateRange({ startDate: '2026-11-01', endDate: '' })).toBeNull();
    expect(normalizeDateRange(null)).toBeNull();
  });
});
