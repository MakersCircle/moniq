import type { UserSettings } from '@/types';
import { detectLocalSettings, getCurrencySymbol } from '@/constants/currencies';

export function createDefaultSettings(languages?: readonly string[]): UserSettings {
  const detected = detectLocalSettings(languages);
  return {
    currency: detected.currency,
    currencySymbol: detected.symbol,
    numberLocale: detected.locale,
    fiscalYearStartMonth: detected.currency === 'INR' ? 4 : 1,
    dateFormat: detected.dateFormat,
  };
}

/** Restore explicit values before filling missing preferences from defaults. */
export function restoreUserSettings(
  saved: Record<string, string>,
  defaults: UserSettings
): UserSettings {
  const numberLocale = saved.numberLocale || defaults.numberLocale;
  const currency = saved.currency || defaults.currency;
  return {
    currency,
    numberLocale,
    currencySymbol: saved.currencySymbol || getCurrencySymbol(currency, numberLocale),
    fiscalYearStartMonth: Number(saved.fiscalYearStartMonth) || defaults.fiscalYearStartMonth,
    dateFormat: saved.dateFormat || defaults.dateFormat,
  };
}

export function serializeSettings(settings: UserSettings): Record<string, string> {
  return Object.fromEntries(Object.entries(settings).map(([key, value]) => [key, String(value)]));
}
