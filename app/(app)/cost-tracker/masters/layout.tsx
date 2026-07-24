'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/cost-tracker/masters/vendors', label: 'Vendors' },
  { href: '/cost-tracker/masters/raw-materials', label: 'Raw Materials' },
  { href: '/cost-tracker/masters/packaging', label: 'Packaging' },
  { href: '/cost-tracker/masters/rates', label: 'Rates' },
  { href: '/cost-tracker/masters/overheads', label: 'Overheads' },
];

export default function MastersLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <Link key={t.href} href={t.href} className="chip"
            style={{ textDecoration: 'none', cursor: 'pointer', background: pathname === t.href ? 'var(--amber)' : undefined, color: pathname === t.href ? '#fff' : undefined, borderColor: pathname === t.href ? 'var(--amber)' : undefined }}>
            {t.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
