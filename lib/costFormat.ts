import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const IST = 'Asia/Kolkata';

const inrFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inrPlainFormatter = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ₹1,04,000.00 — Indian digit grouping. */
export function formatMoney(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return inrFormatter.format(n);
}

export function formatMoneyPlain(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return inrPlainFormatter.format(n);
}

export function formatPercent(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return `${n.toFixed(2)}%`;
}

/** dd MMM yyyy, HH:mm IST */
export function formatIST(date: Date | string | null | undefined): string {
  if (!date) return '—';
  return dayjs(date).tz(IST).format('DD MMM YYYY, HH:mm');
}

export function formatDateIST(date: Date | string | null | undefined): string {
  if (!date) return '—';
  return dayjs(date).tz(IST).format('DD MMM YYYY');
}

export function todayIST(): string {
  return dayjs().tz(IST).format('YYYY-MM-DD');
}

export function nowIST() {
  return dayjs().tz(IST);
}

/** DRAFT -> statusDraft, IN_PROGRESS -> statusInProgress — matches costTracker.module.css class names. */
export function statusChipClass(status: string): string {
  const camel = status
    .toLowerCase()
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  return `status${camel}`;
}
