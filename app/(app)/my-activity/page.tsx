'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { toIST } from '@/lib/dates';
import { ClipboardList } from 'lucide-react';

const actionIcon: Record<string, string> = {
  REQUEST_CREATED: '📋', PO_CREATED: '📄', APPROVED: '✅',
  REJECTED: '❌', RECEIVED: '📦', BILL_UPLOADED: '🧾', COMMENT: '💬',
};

const actionColor: Record<string, string> = {
  APPROVED: '#166534', REJECTED: '#B91C1C', RECEIVED: '#0F766E',
  REQUEST_CREATED: '#1D4ED8', PO_CREATED: '#92400E', BILL_UPLOADED: '#6D28D9',
};

export default function MyActivityPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom]       = useState('');
  const [to, setTo]           = useState('');

  useEffect(() => {
    fetch('/api/my-activity').then(r => r.json()).then(d => { setEntries(d.entries || []); setLoading(false); });
  }, []);

  const filtered = entries.filter(e => {
    if (from && new Date(e.at) < new Date(from)) return false;
    if (to && new Date(e.at) > new Date(to + 'T23:59:59')) return false;
    return true;
  });

  return (
    <div style={{ maxWidth: '720px' }} className="fade-up">
      <div className="page-header">
        <h1 className="page-title">My Activity</h1>
        <p className="page-sub">All actions performed by {user?.name}</p>
      </div>

      {/* Date filter */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label className="label">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="field" style={{ width: 'min(160px, 100%)' }} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="field" style={{ width: 'min(160px, 100%)' }} />
        </div>
        {(from || to) && (
          <button onClick={() => { setFrom(''); setTo(''); }} className="btn btn-ghost btn-sm" style={{ marginBottom: '1px' }}>
            Clear filter
          </button>
        )}
        <p style={{ marginLeft: 'auto', fontSize: '13px', color: 'var(--text-3)', alignSelf: 'center' }}>
          {filtered.length} action{filtered.length !== 1 ? 's' : ''}
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '72px', borderRadius: '10px' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
          <ClipboardList size={36} style={{ color: 'var(--border-em)', margin: '0 auto 12px', display: 'block' }} />
          <p style={{ color: 'var(--text-3)', fontSize: '14px' }}>No activity in this date range</p>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          {/* Vertical line */}
          <div style={{ position: 'absolute', left: '20px', top: '24px', bottom: '24px', width: '1px', background: 'var(--border)', zIndex: 0 }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {filtered.map((e: any, i: number) => {
              const color = actionColor[e.action] || 'var(--text-3)';
              return (
                <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', position: 'relative' }}>
                  {/* Icon dot */}
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0, zIndex: 1, position: 'relative' }}>
                    {actionIcon[e.action] || '•'}
                  </div>

                  <div className="card" style={{ flex: 1, padding: '12px 16px', borderLeft: `3px solid ${color}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <Link href={`/po/${e.poNumber}`} style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '13px', color: 'var(--amber)', textDecoration: 'none' }}
                        onMouseEnter={el => (el.currentTarget.style.textDecoration = 'underline')}
                        onMouseLeave={el => (el.currentTarget.style.textDecoration = 'none')}>
                        {e.poNumber}
                      </Link>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: color, background: color + '14', padding: '2px 8px', borderRadius: '999px' }}>
                        {e.action.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {e.note && <p style={{ fontSize: '12.5px', color: 'var(--text-3)', marginTop: '4px' }}>{e.note}</p>}
                    <p style={{ fontSize: '11.5px', color: 'var(--text-3)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                      {toIST(e.at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
