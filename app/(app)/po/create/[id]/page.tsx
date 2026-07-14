'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, ArrowRight, FileCheck } from 'lucide-react';

export default function CreatePOPage() {
  const { id }    = useParams();
  const router    = useRouter();
  const [po, setPo]                     = useState<any>(null);
  const [vendors, setVendors]           = useState<any[]>([]);
  const [vendorId, setVendorId]         = useState('');
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [materials, setMaterials]       = useState<any[]>([]);
  const [loading, setLoading]           = useState(false);
  const [fetching, setFetching]         = useState(true);
  const [success, setSuccess]           = useState('');
  const [error, setError]               = useState('');

  useEffect(() => {
    Promise.all([fetch(`/api/po/${id}`), fetch('/api/vendors')])
      .then(([pR, vR]) => Promise.all([pR.json(), vR.json()]))
      .then(([pd, vd]) => {
        setPo(pd.po);
        setMaterials(pd.po?.materials?.map((m: any) => ({ ...m, orderedQty: m.requestedQty, expectedRate: '' })) || []);
        setVendors(vd.vendors || []);
        setFetching(false);
      });
  }, [id]);

  const updateMaterial = (i: number, field: string, val: string) =>
    setMaterials(prev => prev.map((m, idx) => idx === i ? { ...m, [field]: val } : m));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId) { setError('Please select a vendor.'); return; }
    setLoading(true); setError('');
    const vendor = vendors.find(v => v._id === vendorId);
    const res = await fetch(`/api/po/${id}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendorId, vendorName: vendor?.name, vendorPhone: vendor?.phone, materials, expectedDelivery }),
    });
    setLoading(false);
    if (res.ok) { const d = await res.json(); setSuccess(d.poNumber); }
    else { const d = await res.json(); setError(d.error || 'Failed to create PO.'); }
  };

  if (success) return (
    <div style={{ maxWidth: '480px', margin: '48px auto', textAlign: 'center' }} className="fade-up">
      <div className="card" style={{ padding: '52px 36px' }}>
        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#F0FDF4', border: '2px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <CheckCircle size={30} style={{ color: 'var(--green)' }} />
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, color: 'var(--text-base)', marginBottom: '8px' }}>PO Created!</h2>
        <p style={{ color: 'var(--text-3)', fontSize: '13.5px', marginBottom: '6px' }}>Purchase order</p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', fontWeight: 600, color: 'var(--amber)', marginBottom: '6px' }}>{success}</p>
        <p style={{ color: 'var(--text-3)', fontSize: '12.5px', marginBottom: '28px' }}>Approver has been notified via email.</p>
        <button onClick={() => router.push(`/po/${success}`)} className="btn btn-primary btn-lg" style={{ justifyContent: 'center' }}>
          View PO <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );

  if (fetching) return (
    <div style={{ maxWidth: '680px' }}>
      <div className="skeleton" style={{ height: '36px', width: '260px', borderRadius: '8px', marginBottom: '8px' }} />
      <div className="skeleton" style={{ height: '18px', width: '200px', borderRadius: '6px', marginBottom: '24px' }} />
      <div className="skeleton" style={{ height: '320px', borderRadius: '14px' }} />
    </div>
  );

  if (!po) return (
    <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-3)' }}>PO not found.</div>
  );

  const totalEstimate = materials.reduce((sum, m) => sum + (Number(m.orderedQty) * Number(m.expectedRate) || 0), 0);

  return (
    <div style={{ maxWidth: '680px' }} className="fade-up">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <FileCheck size={18} style={{ color: 'var(--amber)' }} />
          <h1 className="page-title" style={{ margin: 0 }}>Create Purchase Order</h1>
        </div>
        <p className="page-sub">
          For request by <strong style={{ color: 'var(--text-2)' }}>{po.requestedByName}</strong>
          {po.deadlines?.neededBy && (
            <span style={{ color: 'var(--amber)', fontWeight: 600 }}>
              {' '}· Needed by {new Date(po.deadlines.neededBy).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          )}
        </p>
        {po.requestRemark && (
          <p style={{ fontSize: '12.5px', color: 'var(--text-3)', marginTop: '6px', fontStyle: 'italic' }}>
            "{po.requestRemark}"
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit}>

        {/* Materials table */}
        <div className="card" style={{ padding: '22px', marginBottom: '16px', overflow: 'hidden' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14.5px', color: 'var(--text-base)', marginBottom: '14px' }}>
            Material Quantities & Rates
          </p>
          <div className="table-wrap" style={{ border: '1px solid var(--border)', borderRadius: '8px' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Material</th>
                  <th style={{ textAlign: 'right' }}>Requested</th>
                  <th style={{ textAlign: 'right' }}>Order Qty (KG)</th>
                  <th style={{ textAlign: 'right' }}>Rate (₹/KG)</th>
                  <th style={{ textAlign: 'right' }}>Est. Value</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m, i) => {
                  const est = Number(m.orderedQty) * Number(m.expectedRate);
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 700, color: 'var(--text-base)' }}>{m.name}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-3)' }}>
                        {m.requestedQty} KG
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <input
                          type="number" min="0.1" step="0.1"
                          value={m.orderedQty}
                          onChange={e => updateMaterial(i, 'orderedQty', e.target.value)}
                          style={{ width: '84px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 8px', textAlign: 'right', fontSize: '13px', color: 'var(--text-base)', outline: 'none', fontFamily: 'var(--font-mono)' }}
                          onFocus={e => { e.currentTarget.style.borderColor = 'var(--amber)'; }}
                          onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                        />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>₹</span>
                          <input
                            type="number" min="0" step="0.01"
                            value={m.expectedRate}
                            onChange={e => updateMaterial(i, 'expectedRate', e.target.value)}
                            placeholder="0.00"
                            style={{ width: '84px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 8px', textAlign: 'right', fontSize: '13px', color: 'var(--text-base)', outline: 'none', fontFamily: 'var(--font-mono)' }}
                            onFocus={e => { e.currentTarget.style.borderColor = 'var(--amber)'; }}
                            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                          />
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '13px', color: est > 0 ? 'var(--text-base)' : 'var(--text-3)', fontWeight: est > 0 ? 600 : 400 }}>
                        {est > 0 ? `₹${est.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {totalEstimate > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={4} style={{ padding: '10px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', borderTop: '1px solid var(--border)' }}>
                      Total Estimate
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700, color: 'var(--amber)', borderTop: '1px solid var(--border)' }}>
                      ₹{totalEstimate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Vendor & Delivery */}
        <div className="card" style={{ padding: '22px', marginBottom: '16px' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14.5px', color: 'var(--text-base)', marginBottom: '16px' }}>
            Vendor & Delivery
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="label">Select Vendor</label>
              <select value={vendorId} onChange={e => setVendorId(e.target.value)} required className="field">
                <option value="">Choose vendor…</option>
                {vendors.map(v => (
                  <option key={v._id} value={v._id}>
                    {v.name}{v.contactPerson ? ` — ${v.contactPerson}` : ''}{v.phone ? ` (${v.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {vendorId && (() => {
              const v = vendors.find(x => x._id === vendorId);
              return v ? (
                <div style={{ gridColumn: '1 / -1', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                  {v.email && <div><p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</p><p style={{ fontSize: '13px', color: 'var(--text-2)' }}>{v.email}</p></div>}
                  {v.gstNumber && <div><p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>GST</p><p style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', color: 'var(--text-2)' }}>{v.gstNumber}</p></div>}
                  {v.address && <div><p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Address</p><p style={{ fontSize: '13px', color: 'var(--text-2)' }}>{v.address}</p></div>}
                </div>
              ) : null;
            })()}

            <div>
              <label className="label">Expected Delivery Date</label>
              <input
                type="date"
                value={expectedDelivery}
                onChange={e => setExpectedDelivery(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="field"
              />
            </div>
          </div>
        </div>

        {error && <div className="alert alert-err" style={{ marginBottom: '14px' }}>{error}</div>}

        <button type="submit" disabled={loading} className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }}>
          {loading ? 'Submitting…' : 'Submit for Approval'}
        </button>
      </form>
    </div>
  );
}
