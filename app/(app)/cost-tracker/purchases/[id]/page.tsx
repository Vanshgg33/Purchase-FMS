'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Undo2 } from 'lucide-react';
import { ctFetch } from '@/lib/ctClient';
import { formatMoney, formatDateIST, statusChipClass } from '@/lib/costFormat';
import styles from '../../costTracker.module.css';

export default function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [purchase, setPurchase] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [showReverse, setShowReverse] = useState(false);

  const load = () => ctFetch(`/api/cost-tracker/purchases/${id}`).then(setPurchase);
  useEffect(() => { load(); }, [id]);

  const post = async () => {
    setBusy(true); setError('');
    try { await ctFetch(`/api/cost-tracker/purchases/${id}/post`, { method: 'POST' }); await load(); }
    catch (err: any) { setError(err.message); } finally { setBusy(false); }
  };

  const reverse = async () => {
    setBusy(true); setError('');
    try { await ctFetch(`/api/cost-tracker/purchases/${id}/reverse`, { method: 'POST', body: JSON.stringify({ reason }) }); setShowReverse(false); await load(); }
    catch (err: any) { setError(err.message); } finally { setBusy(false); }
  };

  if (!purchase) return <div className="skeleton" style={{ height: 300, borderRadius: 12 }} />;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} style={{ maxWidth: 880 }}>
      <button onClick={() => router.back()} className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }}><ArrowLeft size={14} /> Back</button>
      {error && <div className="alert alert-err" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="card" style={{ padding: 22, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 className="display" style={{ fontSize: 19, fontWeight: 700 }}>{purchase.code}</h2>
            <p className="page-sub" style={{ margin: '4px 0 0' }}>{purchase.vendorId?.name} · Invoice {purchase.invoiceNo} · Received {formatDateIST(purchase.receivedDate)}</p>
          </div>
          <span className={`${styles.statusChip} ${styles[statusChipClass(purchase.status)]}`}>{purchase.status}</span>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          {purchase.status === 'DRAFT' && <button onClick={post} disabled={busy} className="btn btn-primary btn-sm"><CheckCircle2 size={14} /> Post Purchase</button>}
          {purchase.status === 'POSTED' && <button onClick={() => setShowReverse(true)} disabled={busy} className="btn btn-danger btn-sm"><Undo2 size={14} /> Reverse</button>}
        </div>
      </div>

      <div className="card" style={{ padding: 0, marginBottom: 16, overflow: 'hidden' }}>
        <table className="tbl">
          <thead><tr><th>Material</th><th>Qty</th><th>Rate</th><th>GST</th><th style={{ textAlign: 'right' }}>Freight</th><th style={{ textAlign: 'right' }}>Loading</th><th style={{ textAlign: 'right' }}>Other</th><th style={{ textAlign: 'right' }}>Landed Value</th><th style={{ textAlign: 'right' }}>Landed/Unit</th></tr></thead>
          <tbody>
            {purchase.items.map((it: any, i: number) => (
              <tr key={i}>
                <td>{it.rawMaterialId?.name || it.rawMaterialId}</td>
                <td>{it.quantity} {it.uom}</td>
                <td className={styles.money}>{formatMoney(it.ratePerUnit)}</td>
                <td>{it.gstRate}%</td>
                <td className={styles.money} style={{ textAlign: 'right' }}>{formatMoney(it.allocatedFreight)}</td>
                <td className={styles.money} style={{ textAlign: 'right' }}>{formatMoney(it.allocatedLoading)}</td>
                <td className={styles.money} style={{ textAlign: 'right' }}>{formatMoney(it.allocatedOther)}</td>
                <td className={styles.money} style={{ textAlign: 'right', fontWeight: 700 }}>{formatMoney(it.landedValue)}</td>
                <td className={styles.money} style={{ textAlign: 'right', fontWeight: 700, color: 'var(--ct-primary)' }}>{formatMoney(it.landedCostPerUnit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div className={styles.sheetRow}><span>Basic Amount</span><span className={styles.money}>{formatMoney(purchase.basicAmount)}</span></div>
        <div className={styles.sheetRow}><span>GST Amount</span><span className={styles.money}>{formatMoney(purchase.gstAmount)}</span></div>
        <div className={styles.sheetRow}><span>Freight + Loading + Other</span><span className={styles.money}>{formatMoney(purchase.freightCharges + purchase.loadingCharges + purchase.otherCharges)}</span></div>
        <div className={`${styles.sheetRow} ${styles.sheetTotal}`}><span>Total Landed Amount</span><span className={styles.money}>{formatMoney(purchase.totalLandedAmount)}</span></div>
      </div>

      {showReverse && (
        <div className="modal-backdrop">
          <div className="card" style={{ width: '100%', maxWidth: 420, padding: 26 }}>
            <h3 className="display" style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Reverse Purchase</h3>
            <label className="label">Reason</label>
            <textarea className="field" rows={3} value={reason} onChange={e => setReason(e.target.value)} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
              <button className="btn btn-ghost" onClick={() => setShowReverse(false)}>Cancel</button>
              <button className="btn btn-danger" disabled={busy || !reason.trim()} onClick={reverse}>Reverse</button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
