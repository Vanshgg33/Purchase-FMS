import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const IST = 'Asia/Kolkata';

export function toIST(date: Date | string | null | undefined): string {
  if (!date) return '-';
  return dayjs(date).tz(IST).format('DD MMM YYYY, hh:mm A');
}

export function toISTDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  return dayjs(date).tz(IST).format('DD MMM YYYY');
}

export function nowUTC(): Date {
  return new Date();
}

export function isOverdue(deadline: Date | string | null | undefined): boolean {
  if (!deadline) return false;
  return dayjs().isAfter(dayjs(deadline));
}

export function timeAgo(date: Date | string): string {
  const diff = dayjs().diff(dayjs(date), 'minute');
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}
