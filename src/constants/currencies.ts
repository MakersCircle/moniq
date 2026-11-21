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
  return c ? c.symbolNative || c.symbol || code : code;
}

/**
 * Detects the user's localized settings (locale and currency).
 */
export function detectLocalSettings(languages?: readonly string[]) {
  const candidates =
    languages ??
    (typeof navigator !== 'undefined' ? [navigator.language, ...navigator.languages] : ['en-US']);
  const parsed = candidates.flatMap(value => {
    try {
      return [new Intl.Locale(value)];
    } catch {
      return [];
    }
  });
  const selected = parsed.find(value => value.region) ?? parsed[0] ?? new Intl.Locale('en-US');
  const region = selected.region ?? selected.maximize().region;
  const locale = selected.toString();
  const currency = (regionToCurrency as Record<string, string>)[region || ''] || 'USD';
  const firstDatePart = new Intl.DateTimeFormat(locale)
    .formatToParts(new Date(2006, 10, 22))
    .find(part => ['day', 'month', 'year'].includes(part.type))?.type;
  const dateFormat =
    firstDatePart === 'year' ? 'yyyy-MM-dd' : firstDatePart === 'day' ? 'dd/MM/yyyy' : 'MM/dd/yyyy';
  return { locale, currency, symbol: getCurrencySymbol(currency, locale), dateFormat };
}

/**
 * Returns common number locales for formatting.
 */
export const COMMON_LOCALES = supportedLocales;
