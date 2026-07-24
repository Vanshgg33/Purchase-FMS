'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Building2, ToggleLeft, ToggleRight } from 'lucide-react';
import { ctFetch } from '@/lib/ctClient';

const empty = { code: '', name: '', gstin: '', phone: '', city: '', state: 'Chhattisgarh', paymentTerms: '' };

export default function CtVendorsPage() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => ctFetch('/api/cost-tracker/vendors').then(setVendors).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await ctFetch('/api/cost-tracker/vendors', { method: 'POST', body: JSON.stringify(form) });
      setModal(false); setForm({ ...empty }); load();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const toggleActive = async (v: any) => {
    await ctFetch(`/api/cost-tracker/vendors/${v._id}`, { method: 'PATCH', body: JSON.stringify({ isActive: !v.isActive }) });
    load();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p className="page-sub" style={{ margin: 0 }}>{vendors.length} vendor{vendors.length !== 1 ? 's' : ''}</p>
        <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}><Plus size={14} /> Add Vendor</button>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
      ) : (
        <div className="card">
          <table className="tbl">
            <thead><tr><th>Code</th><th>Vendor</th><th>City</th><th>GSTIN</th><th>Terms</th><th>Status</th></tr></thead>
            <tbody>
              {vendors.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)' }}>No vendors yet.</td></tr>}
              {vendors.map(v => (
                <tr key={v._id}>
                  <td className="mono" style={{ fontSize: 12 }}>{v.code}</td>
                  <td style={{ fontWeight: 700 }}><Building2 size={13} style={{ marginRight: 6, opacity: 0.6 }} />{v.name}</td>
                  <td>{v.city}</td>
                  <td className="mono" style={{ fontSize: 12 }}>{v.gstin || '—'}</td>
                  <td>{v.paymentTerms || '—'}</td>
                  <td>
                    <button onClick={() => toggleActive(v)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: v.isActive ? 'var(--green)' : 'var(--text-3)', fontWeight: 700, fontSize: 12.5 }}>
                      {v.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />} {v.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="modal-backdrop">
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.15 }} className="card" style={{ width: '100%', maxWidth: 440, padding: 28 }}>
            <h3 className="display" style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>Add Vendor</h3>
            {error && <div className="alert alert-err" style={{ marginBottom: 12 }}>{error}</div>}
            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label className="label">Vendor Name</label><input required className="field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><label className="label">City</label><input required className="field" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
              <div><label className="label">GSTIN</label><input className="field" value={form.gstin} onChange={e => setForm(f => ({ ...f, gstin: e.target.value }))} /></div>
              <div><label className="label">Phone</label><input className="field" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div><label className="label">Payment Terms</label><input className="field" placeholder="NET 30" value={form.paymentTerms} onChange={e => setForm(f => ({ ...f, paymentTerms: e.target.value }))} /></div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Vendor'}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
