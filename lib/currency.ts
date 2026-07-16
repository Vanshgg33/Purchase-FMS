export type ColumnType = 'currency' | 'percent' | 'number';

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatINR = (n: number) => inr.format(n); // 123456.7 -> ₹1,23,456.70

export const formatPercent = (n: number) => `${(n * 100).toFixed(1)}%`; // 0.125 -> "12.5%"

/**
 * Percent columns store the engine value as a fraction (0.12) so formulas like
 * =B2*E2 just work, but the user types/sees the human number (12). Converts a
 * user-facing edit value into what gets fed to the engine + persisted.
 */
export function toStoredRaw(input: string, type: ColumnType): string {
  if (type !== 'percent' || input.startsWith('=') || input.trim() === '') return input;
  const n = Number(input);
  return Number.isNaN(n) ? input : String(n / 100);
}

/** Reverses toStoredRaw for display while editing a percent cell. */
export function toEditValue(raw: string, type: ColumnType): string {
  if (type !== 'percent' || raw.startsWith('=') || raw.trim() === '') return raw;
  const n = Number(raw);
  return Number.isNaN(n) ? raw : String(n * 100);
}
