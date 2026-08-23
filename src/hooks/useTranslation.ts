import en from '@/locales/en.json';

export function useTranslation() {
  const t = (key: string) => {
    const keys = key.split('.');
    let value: unknown = en;
    for (const k of keys) {
      if (typeof value === 'object' && value !== null && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key;
      }
    }
    return typeof value === 'string' ? value : key;
  };

  return { t };
}
