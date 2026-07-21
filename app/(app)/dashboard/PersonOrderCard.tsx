'use client';
import Link from 'next/link';
import type { DashboardPO } from './types';

function countdownInfo(dl: string) {
  const days = Math.ceil((new Date(dl).getTime() - Date.now()) / 86400000);
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, overdue: true };
  if (days === 0) return { text: 'Due today', overdue: false };
  if (days === 1) return { text: 'Tomorrow', overdue: false };
  return { text: `In ${days}d`, overdue: false };
}

export default function PersonOrderCard({ po, deadline }: { po: DashboardPO; deadline: string }) {
  const info = countdownInfo(deadline);
  const digitColor = info.overdue ? 'var(--cd-terracotta)' : 'var(--green)';

  return (
    <Link href={`/po/${po.poNumber}`} className="cd-po-card" style={{
      background: '#fff',
      border: info.overdue ? '1px solid hsl(18 60% 50% / 0.35)' : '1px solid var(--border)',
      borderRadius: '28px', padding: '20px 22px',
      boxShadow: info.overdue ? 'var(--shadow-lg)' : 'var(--shadow)',
      display: 'flex', gap: '20px', alignItems: 'center', textDecoration: 'none', color: 'inherit',
    }}>
      {po.requestedByPhoto ? (
        <img src={po.requestedByPhoto} alt={po.requestedByName} style={{ width: '64px', height: '64px', flexShrink: 0, objectFit: 'cover', borderRadius: '50%' }} />
      ) : (
        <div style={{ width: '64px', height: '64px', flexShrink: 0, borderRadius: '50%', background: 'var(--amber)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 700 }}>
          {po.requestedByName?.[0] || '?'}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 600 }}>{po.requestedByName} <span style={{ fontWeight: 400, color: 'var(--text-3)' }}>requested</span></div>
        <div style={{ fontSize: '15px', fontWeight: 600, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {po.materials.map(m => `${m.name} · ${m.requestedQty} KG`).join(', ') || 'No materials listed'}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {po.vendor?.name || 'No vendor assigned'} · {po.status.replace(/_/g, ' ')} · Due {new Date(deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
        </div>
      </div>
      <div style={{ textAlign: 'center', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.3rem', fontWeight: 700, color: digitColor, lineHeight: 1 }}>{po.poNumber.replace(/\D/g, '').padStart(4, '0').slice(-4)}</div>
        <span style={{ background: info.overdue ? 'hsl(18 60% 50% / 0.12)' : 'var(--green-light)', color: digitColor, fontSize: '10.5px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', whiteSpace: 'nowrap' }}>{info.text}</span>
      </div>
    </Link>
  );
}
