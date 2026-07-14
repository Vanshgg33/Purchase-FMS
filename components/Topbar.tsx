'use client';
import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Bell, Menu, LogOut, User, ChevronDown, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const pageTitles: Record<string, string> = {
  '/dashboard':      'Dashboard',
  '/requests/new':   'New Request',
  '/po/queue':       'PO Queue',
  '/approvals':      'Approvals',
  '/receiving':      'Receiving',
  '/my-activity':    'My Activity',
  '/profile':        'My Profile',
  '/admin/users':    'User Management',
  '/admin/materials':'Raw Materials',
  '/admin/vendors':  'Vendor Master',
  '/admin/reports':  'Reports',
};

interface TopbarProps { onMenuClick: () => void; }

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { data: session } = useSession();
  const user = session?.user as any;
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifs, setShowNotifs]   = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const topbarRef = useRef<HTMLElement>(null);

  const title = Object.entries(pageTitles).find(([k]) => pathname === k || pathname.startsWith(k + '/'))?.[1] ?? 'Purchase FMS';

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (topbarRef.current && !topbarRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
        setShowProfile(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    const fetchNotifs = async () => {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnread(data.notifications?.filter((n: any) => !n.isRead).length || 0);
      }
    };
    fetchNotifs();
    const id = setInterval(fetchNotifs, 30000);
    return () => clearInterval(id);
  }, []);

  const markAllRead = async () => {
    await fetch('/api/notifications/read-all', { method: 'POST' });
    setUnread(0);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const closeAll = () => { setShowNotifs(false); setShowProfile(false); };

  return (
    <header ref={topbarRef} style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '0 20px', height: '58px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 }}>

      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button onClick={onMenuClick} className="lg:hidden" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', padding: '4px', display: 'flex' }}>
          <Menu size={20} />
        </button>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--text-base)', letterSpacing: '-0.01em', margin: 0 }}>
          {title}
        </h1>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>

        {/* Bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowNotifs(v => !v); setShowProfile(false); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '8px', color: 'var(--text-2)', position: 'relative', display: 'flex', transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-muted)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <Bell size={19} />
            {unread > 0 && (
              <span style={{ position: 'absolute', top: '5px', right: '5px', background: 'var(--red)', color: '#fff', fontSize: '10px', fontWeight: 700, width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-card)' }}>
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {showNotifs && (
            <div style={{ position: 'fixed', right: '8px', top: '64px', width: 'min(320px, calc(100vw - 16px))', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: 'var(--shadow-lg)', zIndex: 100 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border-soft)' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14px', color: 'var(--text-base)' }}>Notifications</p>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {unread > 0 && <button onClick={markAllRead} style={{ fontSize: '11.5px', color: 'var(--amber)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Mark all read</button>}
                  <button onClick={closeAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex' }}><X size={14} /></button>
                </div>
              </div>
              <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '13px', padding: '24px' }}>No notifications</p>
                ) : notifications.slice(0, 10).map((n: any) => (
                  <Link key={n._id} href={n.link || '/dashboard'} onClick={closeAll}
                    style={{ display: 'block', padding: '12px 16px', borderBottom: '1px solid var(--border-soft)', textDecoration: 'none', background: n.isRead ? 'transparent' : 'rgba(180,83,9,0.04)', transition: 'background 0.12s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
                    onMouseLeave={e => (e.currentTarget.style.background = n.isRead ? 'transparent' : 'rgba(180,83,9,0.04)')}
                  >
                    <p style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-base)', marginBottom: '2px' }}>{n.title}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>{n.body}</p>
                    {!n.isRead && <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--amber)', marginTop: '4px' }} />}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowProfile(v => !v); setShowNotifs(false); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 10px', borderRadius: '8px', background: 'none', border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-muted)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            {user?.profilePhotoUrl ? (
              <img src={user.profilePhotoUrl} style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-em)' }} alt="" />
            ) : (
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', fontWeight: 700, border: '2px solid rgba(180,83,9,0.2)', flexShrink: 0 }}>
                {user?.name?.[0]}
              </div>
            )}
            <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-base)' }} className="hidden sm:block">
              {user?.name?.split(' ')[0]}
            </span>
            <ChevronDown size={13} style={{ color: 'var(--text-3)' }} />
          </button>

          {showProfile && (
            <div style={{ position: 'fixed', right: '8px', top: '64px', width: 'min(200px, calc(100vw - 16px))', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: 'var(--shadow-lg)', zIndex: 100, overflow: 'hidden' }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-soft)', background: 'var(--bg-surface)' }}>
                <p style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-base)' }}>{user?.name}</p>
                <p style={{ fontSize: '11.5px', color: 'var(--text-3)', marginTop: '2px' }}>{user?.role?.replace('_', ' ')}</p>
              </div>
              <Link href="/profile" onClick={closeAll}
                style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '10px 14px', fontSize: '13px', color: 'var(--text-2)', textDecoration: 'none', transition: 'background 0.12s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <User size={14} /> My Profile
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                style={{ display: 'flex', alignItems: 'center', gap: '9px', width: '100%', padding: '10px 14px', fontSize: '13px', color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', borderTop: '1px solid var(--border-soft)', transition: 'background 0.12s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--red-light)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
