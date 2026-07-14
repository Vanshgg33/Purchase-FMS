'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  LayoutDashboard, PlusCircle, FileCheck, CheckSquare, Truck,
  ClipboardList, Users, Package, Building2, BarChart3, X,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard',   href: '/dashboard',        icon: LayoutDashboard, roles: ['REQUESTER', 'PO_CREATOR', 'APPROVER', 'RECEIVER', 'SUPERADMIN'], section: 'main' },
  { label: 'New Request', href: '/requests/new',      icon: PlusCircle,      roles: ['REQUESTER', 'SUPERADMIN'],                                        section: 'main' },
  { label: 'PO Queue',    href: '/po/queue',          icon: FileCheck,       roles: ['PO_CREATOR', 'SUPERADMIN'],                                       section: 'main' },
  { label: 'Approvals',   href: '/approvals',         icon: CheckSquare,     roles: ['APPROVER', 'SUPERADMIN'],                                         section: 'main' },
  { label: 'Receiving',   href: '/receiving',         icon: Truck,           roles: ['RECEIVER', 'SUPERADMIN'],                                         section: 'main' },
  { label: 'My Activity', href: '/my-activity',       icon: ClipboardList,   roles: ['REQUESTER', 'PO_CREATOR', 'APPROVER', 'RECEIVER', 'SUPERADMIN'], section: 'main' },
  { label: 'Users',       href: '/admin/users',       icon: Users,           roles: ['SUPERADMIN'],                                                     section: 'admin' },
  { label: 'Materials',   href: '/admin/materials',   icon: Package,         roles: ['SUPERADMIN'],                                                     section: 'admin' },
  { label: 'Vendors',     href: '/admin/vendors',     icon: Building2,       roles: ['SUPERADMIN'],                                                     section: 'admin' },
  { label: 'Reports',     href: '/admin/reports',     icon: BarChart3,       roles: ['SUPERADMIN'],                                                     section: 'admin' },
];

const roleLabel: Record<string, string> = {
  REQUESTER:  'Requester',
  PO_CREATOR: 'Purchase Creator',
  APPROVER:   'Approver',
  RECEIVER:   'Receiver',
  SUPERADMIN: 'Super Admin',
};

interface SidebarProps { open: boolean; onClose: () => void; }

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname  = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const name = (session?.user as any)?.name;

  const filtered = navItems.filter(item => item.roles.includes(role));
  const main  = filtered.filter(i => i.section === 'main');
  const admin = filtered.filter(i => i.section === 'admin');

  return (
    <>
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(28,19,10,0.55)', zIndex: 20, backdropFilter: 'blur(2px)' }}
          className="lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`sidebar ${open ? 'sidebar--open' : 'sidebar--closed'}`}>
        {/* Logo */}
        <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', background: 'rgba(180,83,9,0.25)', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(180,83,9,0.4)', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3h18l-2 13H5L3 3z"/><circle cx="10" cy="20" r="1"/><circle cx="17" cy="20" r="1"/>
              </svg>
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', color: '#FDF8F0', lineHeight: 1.1 }}>Purchase FMS</p>
              <p style={{ fontSize: '10px', color: 'var(--sidebar-muted)', letterSpacing: '0.06em', marginTop: '1px' }}>NATURELITE FOODS</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden" style={{ color: 'var(--sidebar-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <X size={17} />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
          <NavSection items={main} pathname={pathname} onClose={onClose} />

          {admin.length > 0 && (
            <>
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--sidebar-muted)', padding: '14px 10px 6px', textTransform: 'uppercase' }}>
                Administration
              </p>
              <NavSection items={admin} pathname={pathname} onClose={onClose} />
            </>
          )}
        </nav>

        {/* User footer */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ fontSize: '12.5px', fontWeight: 600, color: '#FDF8F0', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </p>
          <p style={{ fontSize: '11px', color: 'var(--sidebar-muted)', marginTop: '2px' }}>
            {roleLabel[role] || role}
          </p>
        </div>
      </aside>
    </>
  );
}

function NavSection({ items, pathname, onClose }: { items: typeof navItems; pathname: string; onClose: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {items.map(item => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 12px',
              borderRadius: '8px',
              fontSize: '13.5px',
              fontWeight: active ? 700 : 500,
              color: active ? '#FDF8F0' : 'var(--sidebar-text)',
              background: active ? 'var(--sidebar-active)' : 'transparent',
              textDecoration: 'none',
              transition: 'background 0.15s, color 0.15s',
              borderLeft: active ? '3px solid #F59E0B' : '3px solid transparent',
            }}
            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover)'; }}
            onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <item.icon size={16} style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }} />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
