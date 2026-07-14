'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Inbox, RefreshCw } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';

export default function POQueuePage() {
  const [requested, setRequested] = useState<any[]>([]);
  const [rejected, setRejected]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/po?status=REQUESTED').then(r => r.json()),
      fetch('/api/po?status=REJECTED').then(r => r.json()),
    ]).then(([reqData, rejData]) => {
      setRequested(reqData.pos || []);
      setRejected(rejData.pos || []);
      setLoading(false);
    });
  }, []);

  const allEmpty = requested.length === 0 && rejected.length === 0;

  return (
    <div style={{ maxWidth: '860px' }} className="fade-up">
      <div className="page-header">
        <h1 className="page-title">PO Queue</h1>
        <p className="page-sub">Material requests waiting to be processed into purchase orders</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '100px', borderRadius: '12px' }} />)}
        </div>
      ) : allEmpty ? (
        <div className="card" style={{ padding: '64px', textAlign: 'center' }}>
          <Inbox size={40} style={{ color: 'var(--border-em)', margin: '0 auto 14px', display: 'block' }} />
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 600, color: 'var(--text-base)', marginBottom: '6px' }}>Queue is empty</p>
          <p style={{ color: 'var(--text-3)', fontSize: '13.5px' }}>All material requests have been processed.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Pending requests */}
          {requested.length > 0 && (
            <section>
              <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '10px' }}>
                New Requests — {requested.length}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {requested.map(po => (
                  <PORow key={po._id} po={po} action={{ label: 'Create PO', href: `/po/create/${po._id}`, icon: <ArrowRight size={14} />, style: 'btn-primary' }} />
                ))}
              </div>
            </section>
          )}

          {/* Rejected — can be re-processed */}
          {rejected.length > 0 && (
            <section>
              <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: '10px' }}>
                Rejected — {rejected.length} (can be re-processed)
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {rejected.map(po => (
                  <PORow key={po._id} po={po} action={{ label: 'Re-create PO', href: `/po/create/${po._id}`, icon: <RefreshCw size={13} />, style: 'btn-ghost' }} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function PORow({ po, action }: { po: any; action: { label: string; href: string; icon: React.ReactNode; style: string } }) {
  return (
    <div className="card" style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: '220px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '15px', color: 'var(--amber)' }}>{po.poNumber}</span>
          <StatusBadge status={po.status} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
          {po.materials.map((m: any, i: number) => (
            <span key={i} className="chip">{m.name} · {m.requestedQty} KG</span>
          ))}
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>
          By <strong style={{ color: 'var(--text-2)' }}>{po.requestedByName}</strong> · {new Date(po.requestedAt || po.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
        {po.requestRemark && (
          <p style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '3px' }}>"{po.requestRemark}"</p>
        )}
        {po.deadlines?.neededBy && (
          <p style={{ fontSize: '12px', color: 'var(--amber)', fontWeight: 600, marginTop: '3px' }}>
            Needed by: {new Date(po.deadlines.neededBy).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        )}
        {po.approval?.rejectionReason && (
          <p style={{ fontSize: '12px', color: 'var(--red)', marginTop: '4px', fontStyle: 'italic' }}>
            Rejected: "{po.approval.rejectionReason}"
          </p>
        )}
      </div>
      <Link href={action.href} className={`btn ${action.style} btn-sm`} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
        {action.icon} {action.label}
      </Link>
    </div>
  );
}
