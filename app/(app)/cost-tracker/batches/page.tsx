'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plus, Layers } from 'lucide-react';
import { ctFetch } from '@/lib/ctClient';
import { formatMoney, formatDateIST, statusChipClass } from '@/lib/costFormat';
import styles from '../costTracker.module.css';

export default function BatchesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { ctFetch('/api/cost-tracker/batches').then(setRows).finally(() => setLoading(false)); }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p className="page-sub" style={{ margin: 0 }}>{rows.length} batch{rows.length !== 1 ? 'es' : ''}</p>
        <Link href="/cost-tracker/batches/new" className="btn btn-primary btn-sm"><Plus size={14} /> New Batch</Link>
      </div>

      {loading ? <div className="skeleton" style={{ height: 240, borderRadius: 12 }} /> : (
        <div className="card">
          <table className="tbl">
            <thead><tr><th>Batch</th><th>Product</th><th>Production Date</th><th style={{ textAlign: 'right' }}>Cost/Unit</th><th>Status</th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)' }}>No batches yet.</td></tr>}
              {rows.map((b: any) => (
                <tr key={b._id}>
                  <td>
                    <Link href={`/cost-tracker/batches/${b._id}`} style={{ textDecoration: 'none', color: 'var(--ct-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Layers size={13} /> {b.batchCode}
                    </Link>
                  </td>
                  <td>{b.productId?.name} <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{b.productId?.sku}</span></td>
                  <td>{formatDateIST(b.productionDate)}</td>
                  <td className={styles.money} style={{ textAlign: 'right' }}>{b.costs?.manufacturingCostPerUnit != null ? formatMoney(b.costs.manufacturingCostPerUnit) : '—'}</td>
                  <td><span className={`${styles.statusChip} ${styles[statusChipClass(b.status)]}`}>{b.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
