export type ColumnType = 'AMOUNT' | 'PERCENT' | 'FORMULA' | 'TEXT';

export function toStoredRaw(rawInput: string, columnType: ColumnType): string {
  const trimmed = rawInput.trim();
  if (trimmed.startsWith('=')) return trimmed;
  if (columnType === 'PERCENT') {
    const stripped = trimmed.endsWith('%') ? trimmed.slice(0, -1) : trimmed;
    const n = Number(stripped);
    return Number.isNaN(n) ? trimmed : String(n);
  }
  return trimmed;
}
