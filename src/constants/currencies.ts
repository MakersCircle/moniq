export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
}

/**
 * Returns a list of all currencies supported by the browser with their names and symbols.
 */
export function getAllCurrencies(locale: string = 'en-US'): CurrencyInfo[] {
  try {
    const codes = (Intl as any).supportedValuesOf('currency') as string[];
    const displayNames = new Intl.DisplayNames([locale], { type: 'currency' });
    
    return codes.map((code: string) => ({
      code,
      name: displayNames.of(code) || code,
      symbol: getCurrencySymbol(code, locale)
    }));
  } catch (e) {
    // Fallback for browsers that don't support supportedValuesOf
    return [
      { code: 'USD', name: 'US Dollar', symbol: '$' },
      { code: 'EUR', name: 'Euro', symbol: '€' },
      { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
      { code: 'GBP', name: 'British Pound', symbol: '£' },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    ];
  }
}

/**
 * Fetches the standard symbol for a given currency code and locale.
 */
export function getCurrencySymbol(code: string, locale: string = 'en-US'): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .formatToParts(0)
      .find((p) => p.type === 'currency')?.value || code;
  } catch (e) {
    return code;
  }
}

/**
 * Detects the user's localized settings (locale and currency).
 */
export function detectLocalSettings() {
  const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
  const region = locale.split('-')[1]?.toUpperCase();
  
  const regionToCurrency: Record<string, string> = {
    US: 'USD', IN: 'INR', GB: 'GBP', EU: 'EUR', CA: 'CAD', AU: 'AUD', JP: 'JPY', CN: 'CNY',
    AE: 'AED', AF: 'AFN', AL: 'ALL', AM: 'AMD', AR: 'ARS', AT: 'EUR', AZ: 'AZN', BA: 'BAM',
    BD: 'BDT', BE: 'EUR', BG: 'BGN', BH: 'BHD', BI: 'BIF', BN: 'BND', BO: 'BOB', BR: 'BRL',
    BT: 'BTN', BW: 'BWP', BY: 'BYN', BZ: 'BZD', CF: 'XAF', CH: 'CHF', CL: 'CLP', CM: 'XAF',
    CO: 'COP', CR: 'CRC', CU: 'CUP', CY: 'EUR', CZ: 'CZK', DE: 'EUR', DK: 'DKK', DO: 'DOP',
    DZ: 'DZD', EE: 'EUR', EG: 'EGP', ES: 'EUR', ET: 'ETB', FI: 'EUR', FR: 'EUR', GA: 'XAF',
    GE: 'GEL', GH: 'GHS', GM: 'GMD', GN: 'GNF', GR: 'EUR', GT: 'GTQ', HK: 'HKD', HN: 'HNL',
    HR: 'EUR', HU: 'HUF', ID: 'IDR', IE: 'EUR', IL: 'ILS', IQ: 'IQD', IR: 'IRR', IS: 'ISK',
    IT: 'EUR', JM: 'JMD', JO: 'JOD', KE: 'KES', KG: 'KGS', KH: 'KHR', KR: 'KRW', KW: 'KWD',
    KZ: 'KZT', LB: 'LBP', LK: 'LKR', LT: 'EUR', LU: 'EUR', LV: 'EUR', LY: 'LYD', MA: 'MAD',
    MD: 'MDL', ME: 'EUR', MG: 'MGA', MK: 'MKD', MM: 'MMK', MN: 'MNT', MO: 'MOP', MT: 'EUR',
    MU: 'MUR', MV: 'MVR', MW: 'MWK', MX: 'MXN', MY: 'MYR', MZ: 'MZN', NA: 'NAD', NE: 'XOF',
    NG: 'NGN', NI: 'NIO', NL: 'EUR', NO: 'NOK', NP: 'NPR', NZ: 'NZD', OM: 'OMR', PA: 'PAB',
    PE: 'PEN', PH: 'PHP', PK: 'PKR', PL: 'PLN', PT: 'EUR', PY: 'PYG', QA: 'QAR', RO: 'RON',
    RS: 'RSD', RU: 'RUB', RW: 'RWF', SA: 'SAR', SE: 'SEK', SG: 'SGD', SI: 'EUR', SK: 'EUR',
    SN: 'XOF', SO: 'SOS', SR: 'SRD', SY: 'SYP', TH: 'THB', TJ: 'TJS', TM: 'TMT', TN: 'TND',
    TR: 'TRY', TW: 'TWD', TZ: 'TZS', UA: 'UAH', UG: 'UGX', UY: 'UYU', UZ: 'UZS', VE: 'VES',
    VN: 'VND', YE: 'YER', ZA: 'ZAR', ZM: 'ZMW', ZW: 'ZWL'
  };

  const currency = regionToCurrency[region] || 'USD';
  
  return {
    locale,
    currency,
    symbol: getCurrencySymbol(currency, locale)
  };
}

/**
 * Returns common number locales for formatting.
 */
export const COMMON_LOCALES = [
  { code: 'en-US', name: 'English (US) - 1,234,567.89' },
  { code: 'en-IN', name: 'English (India) - 12,34,567.89' },
  { code: 'en-GB', name: 'English (UK) - 1,234,567.89' },
  { code: 'de-DE', name: 'German - 1.234.567,89' },
  { code: 'fr-FR', name: 'French - 1 234 567,89' },
  { code: 'es-ES', name: 'Spanish - 1.234.567,89' },
  { code: 'ja-JP', name: 'Japanese - 1,234,568' },
];
