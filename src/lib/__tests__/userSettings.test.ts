import { describe, expect, it } from 'vitest';
import { createDefaultSettings, restoreUserSettings, serializeSettings } from '../userSettings';

describe('regional settings defaults (#108)', () => {
  it.each([
    ['en-US', 'USD', 'MM/dd/yyyy'],
    ['en-GB', 'GBP', 'dd/MM/yyyy'],
    ['en-AU', 'AUD', 'dd/MM/yyyy'],
    ['en-IN', 'INR', 'dd/MM/yyyy'],
    ['ja-JP', 'JPY', 'yyyy-MM-dd'],
    ['zh-Hant-TW', 'TWD', 'yyyy-MM-dd'],
  ])('detects %s without using currency to guess date order', (locale, currency, dateFormat) => {
    expect(createDefaultSettings([locale])).toMatchObject({
      currency,
      dateFormat,
      numberLocale: locale,
    });
  });
  it('uses a regional language preference when the primary language omits its region', () => {
    expect(createDefaultSettings(['en', 'en-IN'])).toMatchObject({
      currency: 'INR',
      numberLocale: 'en-IN',
    });
  });
  it('preserves canonical saved preferences on a device with different regional defaults', () => {
    const saved = createDefaultSettings(['en-GB']);
    expect(restoreUserSettings(serializeSettings(saved), createDefaultSettings(['en-US']))).toEqual(
      saved
    );
  });
  it('ignores malformed language tags and can restore a legacy currency without a symbol', () => {
    const defaults = createDefaultSettings(['not_a_locale', 'en-GB']);
    expect(restoreUserSettings({ currency: 'INR' }, defaults)).toMatchObject({
      currency: 'INR',
      currencySymbol: '₹',
      dateFormat: 'dd/MM/yyyy',
    });
  });
});
