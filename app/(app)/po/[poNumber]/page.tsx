'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Upload, MessageSquare, Send, Paperclip, ExternalLink, XCircle } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { toIST } from '@/lib/dates';

const timelineEmoji: Record<string, string> = {
  REQUEST_CREATED: '📋', PO_CREATED: '📄', APPROVED: '✅', REJECTED: '❌',
  SENT_TO_VENDOR: '📤', BILL_UPLOADED: '🧾', RECEIVED: '📦', CLOSED: '🏁',
  BILL_UPLOAD: '📎', COMMENT: '💬', CANCELLED: '🚫',
};

const timelineColor: Record<string, string> = {
  APPROVED: '#166534', CLOSED: '#166534',
  REJECTED: '#B91C1C', CANCELLED: '#B91C1C',
  REQUEST_CREATED: '#1D4ED8', PO_CREATED: '#92400E',
  APPROVED_SENT: '#6D28D9', SENT_TO_VENDOR: '#6D28D9',
  BILL_UPLOADED: '#0369A1', RECEIVED: '#0F766E',
};

function InfoCell({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{label}</p>
      <p style={{ fontSize: '13.5px', color: 'var(--text-base)', fontWeight: 500 }}>{value}</p>
    </div>
  );
}

export default function PODetailPage() {
  const { poNumber }  = useParams();
  const { data: session } = useSession();
  const user = session?.user as any;

  const [po, setPo]                     = useState<any>(null);
  const [loading, setLoading]           = useState(true);
  const [uploading, setUploading]       = useState(false);
  const [comment, setComment]           = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [cancelModal, setCancelModal]   = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling]     = useState(false);

  const fetchPO = async () => {
    const res = await fetch(`/api/po/${poNumber}`);
    if (res.ok) { const d = await res.json(); setPo(d.po); }
    setLoading(false);
  };

  useEffect(() => { fetchPO(); }, [poNumber]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'vendor' | 'physical' | 'attachment', label: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', type);
    fd.append('label', label);
    fd.append('poId', po._id);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    setUploading(false);
    if (res.ok) fetchPO();
    else alert('Upload failed. Check file type/size (max 10 MB).');
    e.target.value = '';
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    setSubmittingComment(true);
    await fetch(`/api/po/${po._id}/comment`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: comment }),
    });
    setSubmittingComment(false);
    setComment('');
    fetchPO();
  };

  if (loading) return (
    <div style={{ maxWidth: '900px' }}>
      <div className="skeleton" style={{ height: '32px', width: '200px', borderRadius: '8px', marginBottom: '24px' }} />
      <div className="skeleton" style={{ height: '280px', borderRadius: '14px', marginBottom: '16px' }} />
      <div className="skeleton" style={{ height: '200px', borderRadius: '14px' }} />
    </div>
  );

  if (!po) return (
    <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-3)' }}>Purchase order not found.</div>
  );

  const canUploadVendorBill   = ['APPROVER','PO_CREATOR','SUPERADMIN'].includes(user?.role) && po.status === 'SENT_TO_VENDOR';
  const canUploadPhysicalBill = ['RECEIVER', 'SUPERADMIN'].includes(user?.role) && po.status === 'BILL_UPLOADED';
  const canCancel = ['PO_CREATOR','SUPERADMIN'].includes(user?.role) && ['REQUESTED','PO_CREATED','REJECTED'].includes(po.status);

  const handleCancel = async () => {
    setCancelling(true);
    await fetch(`/api/po/${po._id}/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: cancelReason }) });
    setCancelling(false); setCancelModal(false); setCancelReason(''); fetchPO();
  };

  const hasDetails = po.vendor?.name || po.deadlines?.neededBy || po.deadlines?.deliveryDeadline || po.poCreatedByName;

  return (
    <div style={{ maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '18px' }} className="fade-up">

      {/* ── Header card ── */}
      <div className="card" style={{ padding: '24px 26px' }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: '22px', fontWeight: 700, color: 'var(--amber)', margin: 0, letterSpacing: '0.03em' }}>
                {po.poNumber}
              </h1>
              <StatusBadge status={po.status} />
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-3)' }}>
              Requested by <strong style={{ color: 'var(--text-2)' }}>{po.requestedByName}</strong> · {toIST(po.requestedAt)}
            </p>
          </div>

          {/* Cancel button */}
          {canCancel && (
            <button onClick={() => setCancelModal(true)} className="btn btn-danger btn-sm" style={{ flexShrink: 0 }}>
              <XCircle size={13} /> Cancel PO
            </button>
          )}

          {/* Rejection banner */}
          {po.approval?.decision === 'REJECTED' && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '12px 16px', maxWidth: '320px' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--red)', marginBottom: '2px' }}>
                Rejected by {po.approval.decidedByName}
              </p>
              <p style={{ fontSize: '12.5px', color: 'var(--red)' }}>{po.approval.rejectionReason}</p>
            </div>
          )}
        </div>

        {/* Materials table */}
        <div className="table-wrap" style={{ border: '1px solid var(--border)', borderRadius: '8px', marginBottom: hasDetails ? '18px' : '0' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Material</th>
                <th style={{ textAlign: 'right' }}>Requested</th>
                <th style={{ textAlign: 'right' }}>Ordered</th>
                <th style={{ textAlign: 'right' }}>Received</th>
                <th style={{ textAlign: 'right' }}>Difference</th>
                <th style={{ textAlign: 'right' }}>Rate</th>
              </tr>
            </thead>
            <tbody>
              {po.materials.map((m: any, i: number) => {
                const diff = m.differenceQty;
                const diffColor = diff == null ? 'var(--text-3)' : diff < 0 ? 'var(--red)' : diff > 0 ? '#C2410C' : 'var(--green)';
                return (
                  <tr key={i}>
                    <td style={{ fontWeight: 700, color: 'var(--text-base)' }}>{m.name}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-3)' }}>
                      {m.requestedQty} KG
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
                      {m.orderedQty ? `${m.orderedQty} KG` : '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
                      {m.receivedQty != null ? `${m.receivedQty} KG` : '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: diffColor }}>
                      {diff != null ? (diff > 0 ? `+${diff}` : `${diff}`) + ' KG' : '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-2)' }}>
                      {m.expectedRate ? `₹${m.expectedRate}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Details grid */}
        {hasDetails && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '14px', padding: '14px', background: 'var(--bg-surface)', borderRadius: '8px' }}>
            <InfoCell label="Vendor" value={po.vendor?.name} />
            {po.vendor?.phone && <InfoCell label="Vendor Phone" value={po.vendor.phone} />}
            <InfoCell label="Needed By" value={po.deadlines?.neededBy ? toIST(po.deadlines.neededBy).split(',')[0] : null} />
            <InfoCell label="Expected Delivery" value={po.deadlines?.deliveryDeadline ? toIST(po.deadlines.deliveryDeadline).split(',')[0] : null} />
            <InfoCell label="PO Created By" value={po.poCreatedByName} />
            {po.approval?.decidedByName && <InfoCell label="Approved By" value={po.approval.decidedByName} />}
            {po.receiving?.conditionRemark && <InfoCell label="Condition Note" value={po.receiving.conditionRemark} />}
          </div>
        )}

        {/* Upload actions */}
        {canUploadVendorBill && (
          <div style={{ marginTop: '16px', background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '13.5px', fontWeight: 700, color: '#5B21B6', marginBottom: '2px' }}>Upload Vendor Bill</p>
              <p style={{ fontSize: '12px', color: '#7C3AED' }}>Attach the bill PDF or image from the vendor</p>
            </div>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#7C3AED', color: '#fff', padding: '9px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#6D28D9')}
              onMouseLeave={e => (e.currentTarget.style.background = '#7C3AED')}>
              <Upload size={14} />
              {uploading ? 'Uploading…' : 'Choose File'}
              <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" style={{ display: 'none' }}
                onChange={e => handleFileUpload(e, 'vendor', 'Vendor Bill')} disabled={uploading} />
            </label>
          </div>
        )}

        {canUploadPhysicalBill && (
          <div style={{ marginTop: '16px', background: '#F0FDFA', border: '1px solid #99F6E4', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F766E', marginBottom: '2px' }}>Upload Physical Bill</p>
              <p style={{ fontSize: '12px', color: '#0D9488' }}>Take a photo or upload the physical bill received</p>
            </div>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#0F766E', color: '#fff', padding: '9px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#0D9488')}
              onMouseLeave={e => (e.currentTarget.style.background = '#0F766E')}>
              <Upload size={14} />
              {uploading ? 'Uploading…' : 'Upload Bill'}
              <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" capture="environment" style={{ display: 'none' }}
                onChange={e => handleFileUpload(e, 'physical', 'Physical Bill')} disabled={uploading} />
            </label>
          </div>
        )}
      </div>

      {/* ── Attachments ── */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Paperclip size={15} style={{ color: 'var(--amber)' }} />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--text-base)', margin: 0 }}>
              Attachments {po.attachments?.length > 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)' }}>({po.attachments.length})</span>}
            </h2>
          </div>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: 'var(--amber)', cursor: 'pointer', padding: '6px 12px', border: '1px solid var(--border-em)', borderRadius: '7px', transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--amber-light)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <Upload size={12} /> Attach File
            <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" style={{ display: 'none' }}
              onChange={e => handleFileUpload(e, 'attachment', 'Attachment')} />
          </label>
        </div>

        {(!po.attachments || po.attachments.length === 0) ? (
          <p style={{ fontSize: '13px', color: 'var(--text-3)', textAlign: 'center', padding: '16px 0' }}>No attachments yet</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {po.attachments.map((a: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-soft)' }}>
                <span style={{ fontSize: '20px', flexShrink: 0 }}>{a.fileType === 'pdf' ? '📄' : '🖼️'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-base)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.label}</p>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-3)', marginTop: '1px' }}>{a.uploadedBy} · {toIST(a.uploadedAt)}</p>
                </div>
                <a href={a.fileUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', fontWeight: 700, color: 'var(--amber)', textDecoration: 'none', flexShrink: 0, padding: '5px 10px', border: '1px solid var(--border-em)', borderRadius: '6px', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--amber-light)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  View <ExternalLink size={11} />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Cancel modal ── */}
      {cancelModal && (
        <div className="modal-backdrop">
          <div className="card modal-sheet fade-up" style={{ width: '100%', maxWidth: '440px', padding: '28px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--text-base)', marginBottom: '6px' }}>
              Cancel {po.poNumber}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '18px' }}>
              This will mark the PO as cancelled. Provide a reason (optional).
            </p>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              rows={3}
              placeholder="Reason for cancellation…"
              className="field"
              style={{ resize: 'none', marginBottom: '18px' }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setCancelModal(false)} className="btn btn-ghost">Go Back</button>
              <button onClick={handleCancel} disabled={cancelling} className="btn btn-danger">
                {cancelling ? 'Cancelling…' : 'Cancel PO'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Timeline + Comments row ── */}
      <div className="grid-2">

        {/* Timeline */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--text-base)', marginBottom: '18px' }}>Timeline</h2>
          <div style={{ position: 'relative' }}>
            {/* Vertical line */}
            <div style={{ position: 'absolute', left: '15px', top: '8px', bottom: '8px', width: '1px', background: 'var(--border)', zIndex: 0 }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {po.timeline.map((t: any, i: number) => {
                const color = timelineColor[t.action] || 'var(--text-3)';
                return (
                  <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', position: 'relative', paddingBottom: i < po.timeline.length - 1 ? '12px' : '0' }}>
                    <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--bg-card)', border: `2px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0, zIndex: 1, position: 'relative' }}>
                      {timelineEmoji[t.action] || '•'}
                    </div>
                    <div style={{ flex: 1, paddingTop: '4px' }}>
                      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-base)', marginBottom: '2px' }}>
                        {t.action.replace(/_/g, ' ')}
                      </p>
                      <p style={{ fontSize: '11.5px', color: 'var(--text-3)', marginBottom: t.note ? '4px' : '0' }}>
                        {t.byName} · {toIST(t.at)}
                      </p>
                      {t.note && (
                        <p style={{ fontSize: '12px', color: 'var(--text-2)', background: 'var(--bg-surface)', padding: '5px 10px', borderRadius: '6px', borderLeft: `2px solid ${color}`, marginTop: '4px' }}>
                          {t.note}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Comments */}
        <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <MessageSquare size={15} style={{ color: 'var(--amber)' }} />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--text-base)', margin: 0 }}>Comments</h2>
            {po.comments?.length > 0 && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', marginLeft: '2px' }}>({po.comments.length})</span>
            )}
          </div>

          {/* Comment list */}
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '280px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
            {(!po.comments || po.comments.length === 0) ? (
              <p style={{ fontSize: '13px', color: 'var(--text-3)', textAlign: 'center', padding: '20px 0' }}>No comments yet</p>
            ) : po.comments.map((c: any, i: number) => (
              <div key={i} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-soft)', borderRadius: '8px', padding: '10px 13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <p style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-base)' }}>{c.byName}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{toIST(c.at)}</p>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.5 }}>{c.text}</p>
              </div>
            ))}
          </div>

          {/* Comment input */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
              placeholder="Add a comment… (Enter to send)"
              rows={2}
              className="field"
              style={{ resize: 'none', flex: 1, fontSize: '13px' }}
            />
            <button
              onClick={handleComment}
              disabled={submittingComment || !comment.trim()}
              style={{ background: 'var(--amber)', border: 'none', borderRadius: '8px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s', opacity: comment.trim() ? 1 : 0.4 }}
              onMouseEnter={e => comment.trim() && ((e.currentTarget as HTMLElement).style.background = 'var(--amber-hover)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'var(--amber)')}
            >
              <Send size={15} style={{ color: '#fff' }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
