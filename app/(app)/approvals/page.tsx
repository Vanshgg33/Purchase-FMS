'use client';
import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Eye, Inbox } from 'lucide-react';
import Link from 'next/link';

export default function ApprovalsPage() {
  const [pos, setPos]           = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [rejectModal, setRejectModal] = useState<{ id: string; poNumber: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting]     = useState(false);

  const fetchPos = () => {
    fetch('/api/po?status=PO_CREATED').then(r => r.json()).then(d => { setPos(d.pos || []); setLoading(false); });
  };

  useEffect(() => { fetchPos(); }, []);

  const handleApprove = async (id: string) => {
    setSubmitting(true);
    await fetch(`/api/po/${id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision: 'APPROVED' }) });
    setSubmitting(false);
    fetchPos();
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    setSubmitting(true);
    await fetch(`/api/po/${rejectModal.id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision: 'REJECTED', rejectionReason: rejectReason }) });
    setSubmitting(false);
    setRejectModal(null);
    setRejectReason('');
    fetchPos();
  };

  return (
    <div style={{ maxWidth: '860px' }} className="fade-up">
      <div className="page-header">
        <h1 className="page-title">Pending Approvals</h1>
        <p className="page-sub">{pos.length} PO{pos.length !== 1 ? 's' : ''} awaiting your decision</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1,2].map(i => <div key={i} className="skeleton" style={{ height: '140px', borderRadius: '12px' }} />)}
        </div>
      ) : pos.length === 0 ? (
        <div className="card" style={{ padding: '64px', textAlign: 'center' }}>
          <Inbox size={40} style={{ color: 'var(--border-em)', margin: '0 auto 14px', display: 'block' }} />
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 600, color: 'var(--text-base)', marginBottom: '6px' }}>All clear!</p>
          <p style={{ color: 'var(--text-3)', fontSize: '14px' }}>No POs awaiting approval right now.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {pos.map(po => (
            <div key={po._id} className="card" style={{ padding: '20px 22px' }}>
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '16px', color: 'var(--amber)' }}>{po.poNumber}</span>
                  <span style={{ background: '#FFFBEB', color: '#92400E', fontSize: '11.5px', fontWeight: 600, padding: '3px 9px', borderRadius: '999px', border: '1px solid #FDE68A' }}>
                    Awaiting Approval
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Link href={`/po/${po.poNumber}`} className="btn btn-ghost btn-sm"><Eye size={13} /> View</Link>
                  <button onClick={() => setRejectModal({ id: po._id, poNumber: po.poNumber })} disabled={submitting} className="btn btn-danger btn-sm">
                    <XCircle size={13} /> Reject
                  </button>
                  <button onClick={() => handleApprove(po._id)} disabled={submitting} className="btn btn-green btn-sm">
                    <CheckCircle size={13} /> Approve
                  </button>
                </div>
              </div>

              {/* Details grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>Materials</p>
                  {po.materials.map((m: any, i: number) => (
                    <p key={i} style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-base)', lineHeight: 1.5 }}>
                      {m.name} — <span style={{ fontFamily: 'var(--font-mono)' }}>{m.orderedQty || m.requestedQty} KG</span>
                      {m.expectedRate && <span style={{ fontWeight: 400, color: 'var(--text-3)' }}> @ ₹{m.expectedRate}/KG</span>}
                    </p>
                  ))}
                </div>

                <div>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>Vendor</p>
                  <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-base)' }}>{po.vendor?.name || '—'}</p>
                  {po.vendor?.phone && <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>{po.vendor.phone}</p>}
                </div>

                {po.deadlines?.deliveryDeadline && (
                  <div>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>Expected Delivery</p>
                    <p style={{ fontSize: '13.5px', color: 'var(--text-base)' }}>
                      {new Date(po.deadlines.deliveryDeadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                )}

                <div>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>Requested By</p>
                  <p style={{ fontSize: '13.5px', color: 'var(--text-base)' }}>
                    {po.requestedByName} · {new Date(po.createdAt).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="modal-backdrop">
          <div className="card modal-sheet fade-up" style={{ width: '100%', maxWidth: '440px', padding: '28px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--text-base)', marginBottom: '6px' }}>
              Reject {rejectModal.poNumber}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '18px' }}>
              Provide a reason — it will be shared with the purchase team.
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={4}
              placeholder="Reason for rejection…"
              className="field"
              style={{ resize: 'none', marginBottom: '18px' }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setRejectModal(null)} className="btn btn-ghost">Cancel</button>
              <button onClick={handleReject} disabled={!rejectReason.trim() || submitting} className="btn btn-danger">
                {submitting ? 'Rejecting…' : 'Reject PO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
