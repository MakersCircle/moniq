import en from '@/locales/en.json';

export function useTranslation() {
  const t = (key: string, vars?: Record<string, string | number>) => {
    const keys = key.split('.');
    let value: unknown = en;
    for (const k of keys) {
      if (typeof value === 'object' && value !== null && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key;
      }
    }
    if (typeof value === 'string') {
      if (vars) {
        return Object.entries(vars).reduce(
          (acc, [k, v]) => acc.replace(new RegExp(`{{${k}}}`, 'g'), String(v)),
          value
        );
      }
      return value;
    }
    return key;
  };

  return { t };
}
