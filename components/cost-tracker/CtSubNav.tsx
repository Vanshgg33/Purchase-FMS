'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '@/app/(app)/cost-tracker/costTracker.module.css';
import type { CtRole } from '@/types/costTracker';

const TABS: { href: string; label: string; roles: CtRole[] }[] = [
  { href: '/cost-tracker/dashboard', label: 'Dashboard', roles: ['ADMIN'] },
  { href: '/cost-tracker/purchases', label: 'Purchases', roles: ['ADMIN', 'PRODUCTION'] },
  { href: '/cost-tracker/inventory', label: 'Inventory', roles: ['ADMIN', 'PRODUCTION'] },
  { href: '/cost-tracker/batches', label: 'Batches', roles: ['ADMIN', 'PRODUCTION'] },
  { href: '/cost-tracker/products', label: 'Products', roles: ['ADMIN'] },
  { href: '/cost-tracker/selling-costs', label: 'Selling Costs', roles: ['ADMIN'] },
  { href: '/cost-tracker/masters/vendors', label: 'Masters', roles: ['ADMIN'] },
  { href: '/cost-tracker/audit', label: 'Audit', roles: ['ADMIN'] },
];

export default function CtSubNav({ role }: { role: CtRole }) {
  const pathname = usePathname();
  const visible = TABS.filter(t => t.roles.includes(role));

  return (
    <nav className={styles.subnav}>
      {visible.map(tab => {
        const active = pathname === tab.href || pathname.startsWith(tab.href + '/') ||
          (tab.href.includes('/masters/') && pathname.startsWith('/cost-tracker/masters'));
        return (
          <Link key={tab.href} href={tab.href} className={`${styles.subnavItem} ${active ? styles.active : ''}`}>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
