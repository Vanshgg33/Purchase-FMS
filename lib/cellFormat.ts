import { formatINR, formatPercent, type ColumnType } from '@/lib/currency';

export function isErrorValue(v: unknown): v is { value: string; message: string } {
  return typeof v === 'object' && v !== null && 'type' in (v as any) && 'value' in (v as any);
}

export function formatCellDisplay(value: unknown, type: ColumnType): { text: string; error: boolean; tooltip?: string } {
  if (value === null || value === undefined || value === '') return { text: '', error: false };
  if (isErrorValue(value)) return { text: value.value, error: true, tooltip: value.message };
  if (typeof value === 'number') {
    if (type === 'currency') return { text: formatINR(value), error: false };
    if (type === 'percent') return { text: formatPercent(value), error: false };
    return { text: value.toLocaleString('en-IN'), error: false };
  }
  return { text: String(value), error: false };
}
