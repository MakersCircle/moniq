export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
}

import currenciesData from '../data/currencies.json';
import regionToCurrency from '../data/regions.json';
import supportedLocales from '../data/number-locales.json';

export interface CurrencyData {
  code: string;
  name: string;
  symbol: string;
  symbolNative: string;
}

const currencies = currenciesData as Record<string, CurrencyData>;

/**
 * Returns a list of all currencies supported by the browser with their names and symbols.
 */
export function getAllCurrencies(_locale: string = 'en-US'): CurrencyInfo[] {
  return Object.values(currencies).map(c => ({
    code: c.code,
    name: c.name,
    symbol: c.symbolNative || c.symbol || c.code,
  }));
}

/**
 * Fetches the standard symbol for a given currency code and locale.
 */
export function getCurrencySymbol(code: string, _locale: string = 'en-US'): string {
  const c = currencies[code];
  return c ? (c.symbolNative || c.symbol || code) : code;
}

/**
 * Detects the user's localized settings (locale and currency).
 */
export function detectLocalSettings() {
  const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
  const region = locale.split('-')[1]?.toUpperCase();

  const currency = (regionToCurrency as Record<string, string>)[region || ''] || 'USD';

  return {
    locale,
    currency,
    symbol: getCurrencySymbol(currency, locale),
  };
}

/**
 * Returns common number locales for formatting.
 */
export const COMMON_LOCALES = supportedLocales;
