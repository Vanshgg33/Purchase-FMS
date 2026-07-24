'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Wheat } from 'lucide-react';
import { ctFetch } from '@/lib/ctClient';
import { UOM, RM_CATEGORY } from '@/types/costTracker';

const empty = { code: '', name: '', category: 'SEED', uom: 'KG', hsnCode: '', defaultGstRate: 5, reorderLevel: '', standardYieldPercent: '' };

export default function CtRawMaterialsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => ctFetch('/api/cost-tracker/raw-materials').then(setItems).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await ctFetch('/api/cost-tracker/raw-materials', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          defaultGstRate: Number(form.defaultGstRate),
          reorderLevel: form.reorderLevel ? Number(form.reorderLevel) : undefined,
          standardYieldPercent: form.standardYieldPercent ? Number(form.standardYieldPercent) : undefined,
        }),
      });
      setModal(false); setForm({ ...empty }); load();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p className="page-sub" style={{ margin: 0 }}>{items.length} raw material{items.length !== 1 ? 's' : ''}</p>
        <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}><Plus size={14} /> Add Raw Material</button>
      </div>

      {loading ? <div className="skeleton" style={{ height: 200, borderRadius: 12 }} /> : (
        <div className="card">
          <table className="tbl">
            <thead><tr><th>Code</th><th>Name</th><th>Category</th><th>UOM</th><th>GST%</th><th>Std Yield%</th></tr></thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)' }}>No raw materials yet.</td></tr>}
              {items.map((m: any) => (
                <tr key={m._id}>
                  <td className="mono" style={{ fontSize: 12 }}>{m.code}</td>
                  <td style={{ fontWeight: 700 }}><Wheat size={13} style={{ marginRight: 6, opacity: 0.6 }} />{m.name}</td>
                  <td>{m.category}</td>
                  <td>{m.uom}</td>
                  <td>{m.defaultGstRate}%</td>
                  <td>{m.standardYieldPercent ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="modal-backdrop">
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.15 }} className="card" style={{ width: '100%', maxWidth: 460, padding: 28 }}>
            <h3 className="display" style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>Add Raw Material</h3>
            {error && <div className="alert alert-err" style={{ marginBottom: 12 }}>{error}</div>}
            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label className="label">Name</label><input required className="field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label className="label">Category</label>
                  <select className="field" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {RM_CATEGORY.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="label">UOM</label>
                  <select className="field" value={form.uom} onChange={e => setForm(f => ({ ...f, uom: e.target.value }))}>
                    {UOM.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label className="label">Default GST %</label><input required type="number" step="0.01" className="field" value={form.defaultGstRate} onChange={e => setForm(f => ({ ...f, defaultGstRate: e.target.value as any }))} /></div>
                <div><label className="label">Std Yield %</label><input type="number" step="0.01" className="field" value={form.standardYieldPercent} onChange={e => setForm(f => ({ ...f, standardYieldPercent: e.target.value }))} /></div>
              </div>
              <div><label className="label">Reorder Level (optional)</label><input type="number" step="0.01" className="field" value={form.reorderLevel} onChange={e => setForm(f => ({ ...f, reorderLevel: e.target.value }))} /></div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
