'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Lock, Trash2 } from 'lucide-react';
import { ctFetch } from '@/lib/ctClient';
import { formatMoney } from '@/lib/costFormat';

const DEFAULT_CATEGORIES = ['Rent', 'Salaries', 'Repairs', 'Insurance', 'Depreciation', 'Misc'];
const now = new Date();

export default function OverheadsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES.map(name => ({ name, amount: '' })));
  const [totalProductionQty, setTotalProductionQty] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => ctFetch('/api/cost-tracker/overheads').then(setRows).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await ctFetch('/api/cost-tracker/overheads', {
        method: 'POST',
        body: JSON.stringify({ month, year, categories: categories.filter(c => c.amount).map(c => ({ name: c.name, amount: Number(c.amount) })), totalProductionQty: Number(totalProductionQty) }),
      });
      setModal(false); load();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const lockMonth = async (id: string) => {
    if (!window.confirm('Lock this month? Completed batches in this month will be recosted with the final overhead rate.')) return;
    await ctFetch('/api/cost-tracker/overheads', { method: 'PATCH', body: JSON.stringify({ overheadId: id, lock: true }) });
    load();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p className="page-sub" style={{ margin: 0 }}>Monthly fixed factory overheads</p>
        <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}><Plus size={14} /> Add / Edit Month</button>
      </div>

      {loading ? <div className="skeleton" style={{ height: 200, borderRadius: 12 }} /> : (
        <div className="card">
          <table className="tbl">
            <thead><tr><th>Month</th><th style={{ textAlign: 'right' }}>Total Overhead</th><th style={{ textAlign: 'right' }}>Production Qty (L)</th><th style={{ textAlign: 'right' }}>Rate/Unit</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text-3)' }}>No overheads recorded yet.</td></tr>}
              {rows.map((r: any) => (
                <tr key={r._id}>
                  <td>{r.month}/{r.year}</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(r.totalOverhead)}</td>
                  <td style={{ textAlign: 'right' }}>{r.totalProductionQty}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatMoney(r.overheadRatePerUnit)}</td>
                  <td>{r.isLocked ? <span className="chip">Locked</span> : <span className="chip" style={{ color: 'var(--amber)' }}>Open</span>}</td>
                  <td>{!r.isLocked && <button className="btn btn-ghost btn-sm" onClick={() => lockMonth(r._id)}><Lock size={13} /> Lock</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="modal-backdrop">
          <div className="card" style={{ width: '100%', maxWidth: 460, padding: 26, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="display" style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Monthly Overheads</h3>
            {error && <div className="alert alert-err" style={{ marginBottom: 12 }}>{error}</div>}
            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label className="label">Month</label><input type="number" min={1} max={12} className="field" value={month} onChange={e => setMonth(Number(e.target.value))} /></div>
                <div><label className="label">Year</label><input type="number" className="field" value={year} onChange={e => setYear(Number(e.target.value))} /></div>
              </div>
              {categories.map((c, i) => (
                <div key={c.name} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'center' }}>
                  <label style={{ fontSize: 13 }}>{c.name}</label>
                  <input type="number" step="0.01" className="field" value={c.amount} onChange={e => setCategories(cs => cs.map((x, idx) => idx === i ? { ...x, amount: e.target.value } : x))} />
                </div>
              ))}
              <div><label className="label">Total Monthly Production Qty (Litres)</label><input required type="number" step="0.01" className="field" value={totalProductionQty} onChange={e => setTotalProductionQty(e.target.value)} /></div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
