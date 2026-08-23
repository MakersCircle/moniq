// ── Column Definition ────────────────────────────────────────────

export const SETTINGS_COLUMNS = ['Key', 'Value', 'Checksum'] as const;

export type SettingsColumn = (typeof SETTINGS_COLUMNS)[number];

// ── Serialization ────────────────────────────────────────────────

export function serializeSetting(key: string, value: string): string[] {
  return [key, value, '']; // Checksum placeholder
}

// ── Deserialization ──────────────────────────────────────────────

export function deserializeSetting(row: string[]): { key: string; value: string } {
  return { key: row[0] ?? '', value: row[1] ?? '' };
}
