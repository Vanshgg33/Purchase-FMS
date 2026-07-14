'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, Upload, PackageCheck, Inbox } from 'lucide-react';

export default function ReceivingPage() {
  const [pos, setPos]                 = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [grnModal, setGrnModal]       = useState<any>(null);
  const [receivedQtys, setReceivedQtys] = useState<Record<number, string>>({});
  const [conditionRemark, setConditionRemark] = useState('');
  const [physicalBillFile, setPhysicalBillFile] = useState<File | null>(null);
  const [uploading, setUploading]     = useState(false);
  const [submitting, setSubmitting]   = useState(false);

  const fetchPos = () => {
    fetch('/api/po?status=BILL_UPLOADED').then(r => r.json()).then(d => { setPos(d.pos || []); setLoading(false); });
  };

  useEffect(() => { fetchPos(); }, []);

  const openGrn = (po: any) => {
    setGrnModal(po);
    const qtys: Record<number, string> = {};
    po.materials.forEach((m: any, i: number) => { qtys[i] = String(m.orderedQty || m.requestedQty); });
    setReceivedQtys(qtys);
    setConditionRemark('');
    setPhysicalBillFile(null);
  };

  const handleSubmitGRN = async () => {
    if (!grnModal) return;
    setSubmitting(true);
    let physicalBillUrl = '';
    let physicalBillType = 'image';

    if (physicalBillFile) {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', physicalBillFile);
      fd.append('type', 'physical');
      fd.append('label', 'Physical Bill');
      fd.append('poId', grnModal._id);
      const r = await fetch('/api/upload', { method: 'POST', body: fd });
      setUploading(false);
      if (r.ok) { const d = await r.json(); physicalBillUrl = d.fileUrl; physicalBillType = d.fileType; }
    }

    const materials = grnModal.materials.map((m: any, i: number) => ({ ...m, receivedQty: Number(receivedQtys[i] || 0) }));
    const res = await fetch(`/api/po/${grnModal._id}/receive`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ materials, conditionRemark, physicalBillUrl, physicalBillType }),
    });
    setSubmitting(false);
    if (res.ok) { setGrnModal(null); fetchPos(); }
    else alert('Failed to submit GRN');
  };

  return (
    <div style={{ maxWidth: '860px' }} className="fade-up">
      <div className="page-header">
        <h1 className="page-title">Goods Receipt</h1>
        <p className="page-sub">Record quantities received from vendors</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[1,2].map(i => <div key={i} className="skeleton" style={{ height: '90px', borderRadius: '12px' }} />)}
        </div>
      ) : pos.length === 0 ? (
        <div className="card" style={{ padding: '64px', textAlign: 'center' }}>
          <Inbox size={40} style={{ color: 'var(--border-em)', margin: '0 auto 14px', display: 'block' }} />
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 600, color: 'var(--text-base)', marginBottom: '6px' }}>No deliveries pending</p>
          <p style={{ color: 'var(--text-3)', fontSize: '13.5px' }}>POs with uploaded vendor bills will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {pos.map(po => (
            <div key={po._id} className="card" style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '15px', color: 'var(--amber)' }}>{po.poNumber}</span>
                <p style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '3px' }}>Vendor: <strong style={{ color: 'var(--text-2)' }}>{po.vendor?.name || '—'}</strong></p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px' }}>
                  {po.materials.map((m: any, i: number) => (
                    <span key={i} className="chip">{m.name} · {m.orderedQty || m.requestedQty} KG</span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <Link href={`/po/${po.poNumber}`} className="btn btn-ghost btn-sm">View PO</Link>
                <button onClick={() => openGrn(po)} className="btn btn-primary btn-sm">
                  <PackageCheck size={13} /> Record GRN
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* GRN Modal */}
      {grnModal && (
        <div className="modal-backdrop" style={{ alignItems: 'flex-start', paddingTop: '32px' }}>
          <div className="card modal-sheet fade-up" style={{ width: '100%', maxWidth: '520px', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <PackageCheck size={18} style={{ color: 'var(--amber)' }} />
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--text-base)' }}>
                GRN — {grnModal.poNumber}
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '20px' }}>Enter exact quantities received from vendor</p>

            {/* Quantities table */}
            <div className="table-wrap" style={{ border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '18px' }}>
              <table className="tbl" style={{ fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th>Material</th>
                    <th style={{ textAlign: 'right' }}>Ordered</th>
                    <th style={{ textAlign: 'right' }}>Received (KG)</th>
                  </tr>
                </thead>
                <tbody>
                  {grnModal.materials.map((m: any, i: number) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600, color: 'var(--text-base)' }}>{m.name}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{m.orderedQty || m.requestedQty}</td>
                      <td style={{ textAlign: 'right' }}>
                        <input
                          type="number" min="0" step="0.1"
                          value={receivedQtys[i] || ''}
                          onChange={e => setReceivedQtys(prev => ({ ...prev, [i]: e.target.value }))}
                          style={{ width: '90px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 8px', textAlign: 'right', fontSize: '13px', color: 'var(--text-base)', outline: 'none', fontFamily: 'var(--font-mono)' }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label className="label">Condition Remark</label>
              <textarea
                value={conditionRemark}
                onChange={e => setConditionRemark(e.target.value)}
                rows={2}
                placeholder="Good condition / Damaged packaging / etc."
                className="field"
                style={{ resize: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '22px' }}>
              <label className="label">Physical Bill (Photo / PDF)</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', border: '1.5px dashed var(--border-em)', borderRadius: '8px', padding: '12px 14px', cursor: 'pointer', background: physicalBillFile ? 'rgba(180,83,9,0.04)' : 'var(--bg-surface)', transition: 'background 0.15s' }}>
                <Upload size={15} style={{ color: 'var(--amber)', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: physicalBillFile ? 'var(--amber)' : 'var(--text-3)' }}>
                  {physicalBillFile ? physicalBillFile.name : 'Take photo or choose file'}
                </span>
                <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" capture="environment" className="sr-only"
                  onChange={e => setPhysicalBillFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setGrnModal(null)} className="btn btn-ghost">Cancel</button>
              <button onClick={handleSubmitGRN} disabled={submitting || uploading} className="btn btn-primary">
                <CheckCircle size={14} />
                {submitting ? 'Submitting…' : uploading ? 'Uploading…' : 'Submit GRN'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
