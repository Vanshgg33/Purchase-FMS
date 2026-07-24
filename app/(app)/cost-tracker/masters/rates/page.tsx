'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { ctFetch } from '@/lib/ctClient';
import { formatMoney, formatDateIST } from '@/lib/costFormat';
import { RATE_TYPE } from '@/types/costTracker';

const empty = { rateType: 'LABOUR_SKILLED', label: '', rate: '', effectiveFrom: new Date().toISOString().slice(0, 10) };

export default function RatesMasterPage() {
  const [rates, setRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => ctFetch('/api/cost-tracker/rates').then(setRates).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await ctFetch('/api/cost-tracker/rates', { method: 'POST', body: JSON.stringify({ ...form, rate: Number(form.rate) }) });
      setModal(false); setForm({ ...empty }); load();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p className="page-sub" style={{ margin: 0 }}>Labour / machine / electricity rate cards, effective-dated</p>
        <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}><Plus size={14} /> Add Rate</button>
      </div>

      {loading ? <div className="skeleton" style={{ height: 200, borderRadius: 12 }} /> : (
        <div className="card">
          <table className="tbl">
            <thead><tr><th>Type</th><th>Label</th><th style={{ textAlign: 'right' }}>Rate</th><th>Effective From</th></tr></thead>
            <tbody>
              {rates.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--text-3)' }}>No rates set yet.</td></tr>}
              {rates.map((r: any) => (
                <tr key={r._id}><td>{r.rateType}</td><td>{r.label}</td><td style={{ textAlign: 'right' }}>{formatMoney(r.rate)}</td><td>{formatDateIST(r.effectiveFrom)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="modal-backdrop">
          <div className="card" style={{ width: '100%', maxWidth: 420, padding: 26 }}>
            <h3 className="display" style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Add Rate</h3>
            {error && <div className="alert alert-err" style={{ marginBottom: 12 }}>{error}</div>}
            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label className="label">Rate Type</label><select className="field" value={form.rateType} onChange={e => setForm(f => ({ ...f, rateType: e.target.value }))}>{RATE_TYPE.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
              <div><label className="label">Label</label><input required className="field" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} /></div>
              <div><label className="label">Rate (per hour)</label><input required type="number" step="0.01" className="field" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} /></div>
              <div><label className="label">Effective From</label><input required type="date" className="field" value={form.effectiveFrom} onChange={e => setForm(f => ({ ...f, effectiveFrom: e.target.value }))} /></div>
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
