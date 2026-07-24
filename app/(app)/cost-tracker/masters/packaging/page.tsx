'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Package } from 'lucide-react';
import { ctFetch } from '@/lib/ctClient';
import { formatMoney } from '@/lib/costFormat';
import { PKG_TYPE, UOM } from '@/types/costTracker';

const emptyComponent = { code: '', name: '', type: 'BOTTLE', uom: 'PCS', currentRate: '' };

export default function PackagingMastersPage() {
  const [components, setComponents] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [boms, setBoms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ ...emptyComponent });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [bomModal, setBomModal] = useState(false);
  const [bomProductId, setBomProductId] = useState('');
  const [bomLines, setBomLines] = useState<{ componentId: string; qtyPerUnit: string }[]>([{ componentId: '', qtyPerUnit: '1' }]);
  const [bomError, setBomError] = useState('');
  const [bomSaving, setBomSaving] = useState(false);

  const load = () => Promise.all([
    ctFetch('/api/cost-tracker/packaging/components').then(setComponents),
    ctFetch('/api/cost-tracker/products').then(setProducts),
    ctFetch('/api/cost-tracker/packaging/bom').then(setBoms),
  ]).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const saveComponent = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await ctFetch('/api/cost-tracker/packaging/components', { method: 'POST', body: JSON.stringify({ ...form, currentRate: Number(form.currentRate) }) });
      setModal(false); setForm({ ...emptyComponent }); load();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const saveBom = async (e: React.FormEvent) => {
    e.preventDefault(); setBomSaving(true); setBomError('');
    try {
      await ctFetch('/api/cost-tracker/packaging/bom', {
        method: 'POST',
        body: JSON.stringify({ productId: bomProductId, components: bomLines.filter(l => l.componentId).map(l => ({ componentId: l.componentId, qtyPerUnit: Number(l.qtyPerUnit) })) }),
      });
      setBomModal(false); setBomLines([{ componentId: '', qtyPerUnit: '1' }]); load();
    } catch (err: any) { setBomError(err.message); } finally { setBomSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontWeight: 700, fontSize: 14 }}>Packaging Components</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}><Plus size={14} /> Add Component</button>
      </div>

      {loading ? <div className="skeleton" style={{ height: 160, borderRadius: 12 }} /> : (
        <div className="card" style={{ marginBottom: 24 }}>
          <table className="tbl">
            <thead><tr><th>Code</th><th>Name</th><th>Type</th><th>UOM</th><th style={{ textAlign: 'right' }}>Rate</th></tr></thead>
            <tbody>
              {components.map((c: any) => (
                <tr key={c._id}><td className="mono" style={{ fontSize: 12 }}>{c.code}</td><td><Package size={13} style={{ marginRight: 6, opacity: 0.6 }} />{c.name}</td><td>{c.type}</td><td>{c.uom}</td><td style={{ textAlign: 'right' }}>{formatMoney(c.currentRate)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontWeight: 700, fontSize: 14 }}>Packaging BOM (per SKU)</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setBomModal(true)}><Plus size={14} /> Set BOM</button>
      </div>
      <div className="card">
        <table className="tbl">
          <thead><tr><th>Product</th><th>Components</th><th style={{ textAlign: 'right' }}>Cost/Unit</th></tr></thead>
          <tbody>
            {boms.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', padding: 24, color: 'var(--text-3)' }}>No BOM set yet.</td></tr>}
            {boms.map((b: any) => (
              <tr key={b._id}>
                <td style={{ fontWeight: 700 }}>{b.productId?.name}</td>
                <td style={{ fontSize: 12.5 }}>{b.components.map((c: any) => `${c.componentId?.name} × ${c.qtyPerUnit}`).join(', ')}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--ct-primary)' }}>{formatMoney(b.totalPackagingCostPerUnit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-backdrop">
          <div className="card" style={{ width: '100%', maxWidth: 440, padding: 26 }}>
            <h3 className="display" style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Add Packaging Component</h3>
            {error && <div className="alert alert-err" style={{ marginBottom: 12 }}>{error}</div>}
            <form onSubmit={saveComponent} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label className="label">Name</label><input required className="field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label className="label">Type</label><select className="field" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>{PKG_TYPE.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                <div><label className="label">UOM</label><select className="field" value={form.uom} onChange={e => setForm(f => ({ ...f, uom: e.target.value }))}>{UOM.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
              </div>
              <div><label className="label">Current Rate</label><input required type="number" step="0.0001" className="field" value={form.currentRate} onChange={e => setForm(f => ({ ...f, currentRate: e.target.value }))} /></div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {bomModal && (
        <div className="modal-backdrop">
          <div className="card" style={{ width: '100%', maxWidth: 520, padding: 26 }}>
            <h3 className="display" style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Set Packaging BOM</h3>
            {bomError && <div className="alert alert-err" style={{ marginBottom: 12 }}>{bomError}</div>}
            <form onSubmit={saveBom} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label className="label">Product (SKU)</label>
                <select required className="field" value={bomProductId} onChange={e => setBomProductId(e.target.value)}>
                  <option value="">Select…</option>
                  {products.map((p: any) => <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>)}
                </select>
              </div>
              {bomLines.map((line, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                  <select className="field" value={line.componentId} onChange={e => setBomLines(ls => ls.map((l, idx) => idx === i ? { ...l, componentId: e.target.value } : l))}>
                    <option value="">Select component…</option>
                    {components.map((c: any) => <option key={c._id} value={c._id}>{c.name} (₹{c.currentRate})</option>)}
                  </select>
                  <input type="number" step="0.0001" placeholder="Qty/unit" className="field" value={line.qtyPerUnit} onChange={e => setBomLines(ls => ls.map((l, idx) => idx === i ? { ...l, qtyPerUnit: e.target.value } : l))} />
                </div>
              ))}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setBomLines(ls => [...ls, { componentId: '', qtyPerUnit: '1' }])} style={{ alignSelf: 'flex-start' }}><Plus size={13} /> Add Component</button>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setBomModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={bomSaving}>{bomSaving ? 'Saving…' : 'Save BOM'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
