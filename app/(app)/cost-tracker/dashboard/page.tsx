'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { AlertTriangle } from 'lucide-react';
import { ctFetch } from '@/lib/ctClient';
import { formatMoney, formatPercent, formatDateIST } from '@/lib/costFormat';
import KpiCounter from '@/components/cost-tracker/KpiCounter';
import styles from '../costTracker.module.css';

const SEG_COLORS = ['#1B4332', '#2D6A4F', '#C9A227', '#B7791F', '#74A892', '#B3261E'];

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => { ctFetch('/api/cost-tracker/dashboard').then(setData); }, []);

  if (!data) return <div className="skeleton" style={{ height: 400, borderRadius: 12 }} />;

  const { kpis, costTrend, costMix, skuMargins, alerts } = data;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      {alerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {alerts.map((a: any, i: number) => (
            <div key={i} className="alert alert-warn" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={14} /> {a.message}
            </div>
          ))}
        </div>
      )}

      <div className={styles.kpiGrid}>
        <KpiCounter label="Batches Completed" value={kpis.batchesCompleted} />
        <KpiCounter label="Total Production (L)" value={kpis.totalProductionLitres} format={n => n.toLocaleString('en-IN', { maximumFractionDigits: 0 })} />
        <KpiCounter label="Avg Cost / Unit" value={kpis.avgManufacturingCostPerUnit} format={formatMoney} />
        <KpiCounter label="By-Product Credit Earned" value={kpis.totalByProductCredit} format={formatMoney} />
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Cost / Unit Trend</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={costTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
            <XAxis dataKey="batchCode" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: any) => formatMoney(v)} />
            <Line type="monotone" dataKey="costPerUnit" stroke="#1B4332" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Cost Mix</h3>
        <div className={styles.breakdownBar}>
          {costMix.map((m: any, i: number) => (
            <div key={m.head} className={styles.breakdownSeg} style={{ width: `${m.percent}%`, background: SEG_COLORS[i % SEG_COLORS.length] }} title={`${m.head}: ${m.percent}%`} />
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
          {costMix.map((m: any, i: number) => (
            <div key={m.head} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: SEG_COLORS[i % SEG_COLORS.length] }} />
              {m.head} — {formatPercent(m.percent)}
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="tbl">
          <thead><tr><th>SKU</th><th style={{ textAlign: 'right' }}>Selling Price</th><th style={{ textAlign: 'right' }}>Mfg Cost</th><th style={{ textAlign: 'right' }}>Gross Margin %</th></tr></thead>
          <tbody>
            {skuMargins.map((s: any) => (
              <tr key={s.sku}>
                <td style={{ fontWeight: 700 }}>{s.name} <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.sku}</span></td>
                <td style={{ textAlign: 'right' }}>{formatMoney(s.sellingPrice)}</td>
                <td style={{ textAlign: 'right' }}>{s.manufacturingCostPerUnit != null ? formatMoney(s.manufacturingCostPerUnit) : '—'}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: (s.grossMarginPercent ?? 0) < 0 ? 'var(--red)' : 'var(--green)' }}>{formatPercent(s.grossMarginPercent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
