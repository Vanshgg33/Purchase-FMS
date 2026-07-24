'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { ctFetch } from '@/lib/ctClient';
import { formatMoney, formatDateIST } from '@/lib/costFormat';
import { CHANNEL } from '@/types/costTracker';

const empty = { productId: '', channel: 'D2C', shippingPerUnit: '', adSpendPerUnit: '', paymentGatewayPercent: '2', rtoProvisionPerUnit: '', discountPerUnit: '', supportCostPerUnit: '' };

export default function SellingCostsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => Promise.all([
    ctFetch('/api/cost-tracker/selling-costs').then(setRows),
    ctFetch('/api/cost-tracker/products').then(setProducts),
  ]).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await ctFetch('/api/cost-tracker/selling-costs', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          shippingPerUnit: Number(form.shippingPerUnit), adSpendPerUnit: Number(form.adSpendPerUnit),
          paymentGatewayPercent: Number(form.paymentGatewayPercent), rtoProvisionPerUnit: Number(form.rtoProvisionPerUnit),
          discountPerUnit: Number(form.discountPerUnit), supportCostPerUnit: Number(form.supportCostPerUnit),
        }),
      });
      setModal(false); setForm({ ...empty }); load();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const previewTotal = (r: any) => r.shippingPerUnit + r.adSpendPerUnit + (r.productId?.sellingPrice || 0) * r.paymentGatewayPercent / 100 + r.rtoProvisionPerUnit + r.discountPerUnit + r.supportCostPerUnit;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p className="page-sub" style={{ margin: 0 }}>Per-SKU, per-channel selling cost model</p>
        <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}><Plus size={14} /> Add / Update</button>
      </div>

      {loading ? <div className="skeleton" style={{ height: 220, borderRadius: 12 }} /> : (
        <div className="card">
          <table className="tbl">
            <thead><tr><th>SKU</th><th>Channel</th><th style={{ textAlign: 'right' }}>Shipping</th><th style={{ textAlign: 'right' }}>Ads</th><th style={{ textAlign: 'right' }}>PG%</th><th style={{ textAlign: 'right' }}>RTO</th><th style={{ textAlign: 'right' }}>Discount</th><th style={{ textAlign: 'right' }}>Support</th><th style={{ textAlign: 'right' }}>Selling Cost/Unit</th><th>Effective</th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={10} style={{ textAlign: 'center', padding: 24, color: 'var(--text-3)' }}>No selling costs set yet.</td></tr>}
              {rows.filter((r: any) => r.isActive).map((r: any) => (
                <tr key={r._id}>
                  <td style={{ fontWeight: 700 }}>{r.productId?.name}</td>
                  <td>{r.channel}</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(r.shippingPerUnit)}</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(r.adSpendPerUnit)}</td>
                  <td style={{ textAlign: 'right' }}>{r.paymentGatewayPercent}%</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(r.rtoProvisionPerUnit)}</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(r.discountPerUnit)}</td>
                  <td style={{ textAlign: 'right' }}>{formatMoney(r.supportCostPerUnit)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--ct-primary)' }}>{formatMoney(previewTotal(r))}</td>
                  <td>{formatDateIST(r.effectiveFrom)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="modal-backdrop">
          <div className="card" style={{ width: '100%', maxWidth: 480, padding: 26, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="display" style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Selling Cost</h3>
            {error && <div className="alert alert-err" style={{ marginBottom: 12 }}>{error}</div>}
            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <div><label className="label">Product</label><select required className="field" value={form.productId} onChange={e => setForm(f => ({ ...f, productId: e.target.value }))}><option value="">Select…</option>{products.map((p: any) => <option key={p._id} value={p._id}>{p.name}</option>)}</select></div>
                <div><label className="label">Channel</label><select className="field" value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}>{CHANNEL.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label className="label">Shipping/Unit</label><input required type="number" step="0.01" className="field" value={form.shippingPerUnit} onChange={e => setForm(f => ({ ...f, shippingPerUnit: e.target.value }))} /></div>
                <div><label className="label">Ad Spend/Unit</label><input required type="number" step="0.01" className="field" value={form.adSpendPerUnit} onChange={e => setForm(f => ({ ...f, adSpendPerUnit: e.target.value }))} /></div>
                <div><label className="label">Payment Gateway %</label><input required type="number" step="0.01" className="field" value={form.paymentGatewayPercent} onChange={e => setForm(f => ({ ...f, paymentGatewayPercent: e.target.value }))} /></div>
                <div><label className="label">RTO Provision/Unit</label><input required type="number" step="0.01" className="field" value={form.rtoProvisionPerUnit} onChange={e => setForm(f => ({ ...f, rtoProvisionPerUnit: e.target.value }))} /></div>
                <div><label className="label">Discount/Unit</label><input required type="number" step="0.01" className="field" value={form.discountPerUnit} onChange={e => setForm(f => ({ ...f, discountPerUnit: e.target.value }))} /></div>
                <div><label className="label">Support Cost/Unit</label><input required type="number" step="0.01" className="field" value={form.supportCostPerUnit} onChange={e => setForm(f => ({ ...f, supportCostPerUnit: e.target.value }))} /></div>
              </div>
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
