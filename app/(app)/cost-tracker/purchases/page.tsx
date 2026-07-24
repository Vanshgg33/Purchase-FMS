'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plus, ReceiptText } from 'lucide-react';
import { ctFetch } from '@/lib/ctClient';
import { formatMoney, formatDateIST, statusChipClass } from '@/lib/costFormat';
import styles from '../costTracker.module.css';

export default function PurchasesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ctFetch('/api/cost-tracker/purchases').then((d: any) => setRows(d.purchases)).finally(() => setLoading(false));
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p className="page-sub" style={{ margin: 0 }}>{rows.length} purchase{rows.length !== 1 ? 's' : ''}</p>
        <Link href="/cost-tracker/purchases/new" className="btn btn-primary btn-sm"><Plus size={14} /> New Purchase</Link>
      </div>

      {loading ? <div className="skeleton" style={{ height: 240, borderRadius: 12 }} /> : (
        <div className="card">
          <table className="tbl">
            <thead><tr><th>Code</th><th>Vendor</th><th>Invoice</th><th>Received</th><th style={{ textAlign: 'right' }}>Landed Amount</th><th>Status</th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)' }}>No purchases yet.</td></tr>}
              {rows.map(p => (
                <tr key={p._id}>
                  <td>
                    <Link href={`/cost-tracker/purchases/${p._id}`} style={{ textDecoration: 'none', color: 'var(--ct-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ReceiptText size={13} /> {p.code}
                    </Link>
                  </td>
                  <td>{p.vendorId?.name || '—'}</td>
                  <td className="mono" style={{ fontSize: 12 }}>{p.invoiceNo}</td>
                  <td>{formatDateIST(p.receivedDate)}</td>
                  <td className={styles.money} style={{ textAlign: 'right' }}>{formatMoney(p.totalLandedAmount)}</td>
                  <td><span className={`${styles.statusChip} ${styles[statusChipClass(p.status)]}`}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
