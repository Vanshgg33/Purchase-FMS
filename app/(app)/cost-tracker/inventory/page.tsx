'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronRight, Boxes } from 'lucide-react';
import { ctFetch } from '@/lib/ctClient';
import { formatMoney, formatDateIST } from '@/lib/costFormat';
import styles from '../costTracker.module.css';

export default function InventoryPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => { ctFetch('/api/cost-tracker/inventory').then(setGroups).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="skeleton" style={{ height: 300, borderRadius: 12 }} />;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      {groups.length === 0 && <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>No inventory yet. Post a purchase to create lots.</div>}
      {groups.map((g: any) => {
        const rm = g.rawMaterial;
        const isOpen = open[rm._id];
        const low = rm.reorderLevel && g.totalAvailableQty <= rm.reorderLevel;
        return (
          <div key={rm._id} className="card" style={{ marginBottom: 10, overflow: 'hidden' }}>
            <div onClick={() => setOpen(o => ({ ...o, [rm._id]: !o[rm._id] }))} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                <Boxes size={15} style={{ opacity: 0.6 }} />
                <span style={{ fontWeight: 700 }}>{rm.name}</span>
                {low && <span className="chip" style={{ color: 'var(--red)', borderColor: '#FCA5A5' }}>Low stock</span>}
              </div>
              <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                <div style={{ textAlign: 'right' }}>
                  <div className={styles.money} style={{ fontWeight: 700 }}>{g.totalAvailableQty} {rm.uom}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>available</div>
                </div>
                {g.weightedAvgCost !== null && (
                  <div style={{ textAlign: 'right' }}>
                    <div className={styles.money} style={{ fontWeight: 700, color: 'var(--ct-primary)' }}>{formatMoney(g.weightedAvgCost)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>weighted avg / {rm.uom}</div>
                  </div>
                )}
              </div>
            </div>
            {isOpen && (
              <table className="tbl">
                <thead><tr><th>Lot</th><th>Received</th><th>Vendor</th><th style={{ textAlign: 'right' }}>Original</th><th style={{ textAlign: 'right' }}>Available</th>{g.lots[0]?.landedCostPerUnit !== undefined && <th style={{ textAlign: 'right' }}>Landed/Unit</th>}<th>Status</th></tr></thead>
                <tbody>
                  {g.lots.map((l: any) => (
                    <tr key={l._id}>
                      <td className="mono" style={{ fontSize: 12 }}>{l.lotCode}</td>
                      <td>{formatDateIST(l.receivedDate)}</td>
                      <td>{l.vendorId?.name || '—'}</td>
                      <td style={{ textAlign: 'right' }}>{l.originalQuantity}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{l.availableQuantity}</td>
                      {l.landedCostPerUnit !== undefined && <td className={styles.money} style={{ textAlign: 'right' }}>{formatMoney(l.landedCostPerUnit)}</td>}
                      <td>{l.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </motion.div>
  );
}
