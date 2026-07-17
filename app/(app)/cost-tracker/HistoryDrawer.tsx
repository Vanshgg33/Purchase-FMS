'use client';
import { useEffect, useState } from 'react';
import { X, Camera } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useCostGridStore, type CostProductLite } from '@/store/costGridStore';
import { formatINR, formatDelta } from '@/lib/currency';

interface Snapshot { _id: string; date: string; batchTotal: number; costPerUnit: number; sellingPrice: number; marginPct: number; }

export default function HistoryDrawer({ product, styles, onClose }: {
  product: CostProductLite;
  styles: Record<string, string>;
  onClose: () => void;
}) {
  const setToast = useCostGridStore(s => s.setToast);
  const [snapshots, setSnapshots] = useState<Snapshot[] | null>(null);
  const [snapping, setSnapping] = useState(false);

  function load() {
    fetch(`/api/cost-tracker/snapshots?productId=${product._id}`)
      .then(r => r.json())
      .then(data => setSnapshots(data.snapshots || []))
      .catch(() => setSnapshots([]));
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [product._id]);

  async function snapshotNow() {
    setSnapping(true);
    const res = await fetch('/api/cost-tracker/snapshots?force=true', { method: 'POST' });
    setSnapping(false);
    if (!res.ok) { setToast('Snapshot failed', 'error'); return; }
    setToast('Snapshot taken', 'info');
    load();
  }

  const chartData = (snapshots || []).map(s => ({
    date: new Date(s.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    costPerUnit: s.costPerUnit,
    marginPct: Number((s.marginPct * 100).toFixed(1)),
  }));

  const last = snapshots?.[snapshots.length - 1];
  const prev = snapshots && snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;
  const delta = last && prev ? formatDelta(last.costPerUnit, prev.costPerUnit) : null;

  return (
    <>
      <div className={styles.drawerBackdrop} onClick={onClose} />
      <div className={styles.drawer}>
        <div className={styles.drawerHeader}>
          <div className={styles.drawerTitle}>History — {product.name}</div>
          <button className={styles.drawerCloseBtn} onClick={onClose}><X size={18} /></button>
        </div>
        <div className={styles.drawerBody}>
          <button className={styles.btn} onClick={snapshotNow} disabled={snapping} style={{ marginBottom: 14 }}>
            <Camera size={13} /> {snapping ? 'Snapshotting…' : 'Snapshot now'}
          </button>

          {last && (
            <p style={{ fontSize: 12.5, color: 'var(--ct-text-dim)', marginBottom: 10 }}>
              Latest Cost/Unit {formatINR(last.costPerUnit)}
              {delta && delta.direction !== 'flat' && (
                <span className={`${styles.historyDelta} ${delta.direction === 'up' ? styles.deltaUp : styles.deltaDown}`} style={{ marginLeft: 8 }}>
                  {delta.direction === 'up' ? '▲' : '▼'}{delta.text}
                </span>
              )}
            </p>
          )}

          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid stroke="#263042" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#7A8699" fontSize={11} />
                <YAxis yAxisId="left" stroke="#A3E635" fontSize={11} />
                <YAxis yAxisId="right" orientation="right" stroke="#22D3EE" fontSize={11} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #263042', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="left" type="monotone" dataKey="costPerUnit" name="Cost/Unit" stroke="#A3E635" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" dataKey="marginPct" name="Margin %" stroke="#22D3EE" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className={styles.emptyBracket} style={{ padding: '20px 0' }}>[ NOT ENOUGH HISTORY YET ]</div>
          )}

          {snapshots && snapshots.length > 0 && (
            <table className={styles.historyTable}>
              <thead><tr><th>Date</th><th>Batch ₹</th><th>Cost/Unit</th><th>Sell</th><th>Margin %</th></tr></thead>
              <tbody>
                {[...snapshots].reverse().map(s => (
                  <tr key={s._id}>
                    <td>{new Date(s.date).toLocaleDateString('en-IN')}</td>
                    <td>{formatINR(s.batchTotal)}</td>
                    <td>{formatINR(s.costPerUnit)}</td>
                    <td>{formatINR(s.sellingPrice)}</td>
                    <td>{(s.marginPct * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
