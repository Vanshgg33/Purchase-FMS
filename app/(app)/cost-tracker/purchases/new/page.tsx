'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { ctFetch } from '@/lib/ctClient';
import { formatMoney } from '@/lib/costFormat';
import { UOM } from '@/types/costTracker';
import styles from '../../costTracker.module.css';

interface Line { rawMaterialId: string; quantity: string; uom: string; ratePerUnit: string; gstRate: string; }
const emptyLine = (): Line => ({ rawMaterialId: '', quantity: '', uom: 'KG', ratePerUnit: '', gstRate: '5' });

export default function NewPurchasePage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [vendorId, setVendorId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [receivedDate, setReceivedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [freight, setFreight] = useState('0');
  const [loading2, setLoading2] = useState('0');
  const [other, setOther] = useState('0');
  const [otherNote, setOtherNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    ctFetch('/api/cost-tracker/vendors').then(setVendors);
    ctFetch('/api/cost-tracker/raw-materials').then(setMaterials);
  }, []);

  const setLine = (i: number, patch: Partial<Line>) => setLines(ls => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines(ls => [...ls, emptyLine()]);
  const removeLine = (i: number) => setLines(ls => ls.filter((_, idx) => idx !== i));

  // Live landed-cost preview, computed client-side purely for feedback — the server always recomputes authoritatively.
  const preview = useMemo(() => {
    const parsed = lines.map(l => ({
      qty: parseFloat(l.quantity) || 0,
      rate: parseFloat(l.ratePerUnit) || 0,
      gst: parseFloat(l.gstRate) || 0,
    }));
    const taxableValues = parsed.map(p => p.qty * p.rate);
    const basicAmount = taxableValues.reduce((a, b) => a + b, 0);
    const freightN = parseFloat(freight) || 0;
    const loadingN = parseFloat(loading2) || 0;
    const otherN = parseFloat(other) || 0;
    if (basicAmount === 0) return lines.map(() => null);
    return parsed.map((p, i) => {
      const weight = taxableValues[i] / basicAmount;
      const gstValue = taxableValues[i] * p.gst / 100;
      const landed = taxableValues[i] + gstValue + freightN * weight + loadingN * weight + otherN * weight;
      return p.qty > 0 ? landed / p.qty : null;
    });
  }, [lines, freight, loading2, other]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const purchase = await ctFetch('/api/cost-tracker/purchases', {
        method: 'POST',
        body: JSON.stringify({
          vendorId, invoiceNo, invoiceDate, receivedDate,
          items: lines.map(l => ({ rawMaterialId: l.rawMaterialId, quantity: Number(l.quantity), uom: l.uom, ratePerUnit: Number(l.ratePerUnit), gstRate: Number(l.gstRate) })),
          freightCharges: Number(freight), loadingCharges: Number(loading2), otherCharges: Number(other), otherChargesNote: otherNote || undefined,
        }),
      });
      router.push(`/cost-tracker/purchases/${purchase._id}`);
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} style={{ maxWidth: 880 }}>
      <button onClick={() => router.back()} className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }}><ArrowLeft size={14} /> Back</button>
      {error && <div className="alert alert-err" style={{ marginBottom: 14 }}>{error}</div>}

      <form onSubmit={submit}>
        <div className="card" style={{ padding: 22, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div><label className="label">Vendor</label>
              <select required className="field" value={vendorId} onChange={e => setVendorId(e.target.value)}>
                <option value="">Select vendor…</option>
                {vendors.map(v => <option key={v._id} value={v._id}>{v.name} ({v.code})</option>)}
              </select>
            </div>
            <div><label className="label">Invoice No.</label><input required className="field" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} /></div>
            <div><label className="label">Invoice Date</label><input required type="date" className="field" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} /></div>
            <div><label className="label">Received Date</label><input required type="date" className="field" value={receivedDate} onChange={e => setReceivedDate(e.target.value)} /></div>
          </div>
        </div>

        <div className="card" style={{ padding: 22, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontWeight: 700, fontSize: 14 }}>Line Items</h3>
            <button type="button" className="btn btn-ghost btn-sm" onClick={addLine}><Plus size={13} /> Add Line</button>
          </div>
          {lines.map((line, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.8fr 1fr 0.7fr 1.1fr 30px', gap: 8, alignItems: 'end', marginBottom: 10 }}>
              <div><label className="label">Raw Material</label>
                <select required className="field" value={line.rawMaterialId} onChange={e => {
                  const rm = materials.find(m => m._id === e.target.value);
                  setLine(i, { rawMaterialId: e.target.value, uom: rm?.uom || line.uom, gstRate: String(rm?.defaultGstRate ?? line.gstRate) });
                }}>
                  <option value="">Select…</option>
                  {materials.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                </select>
              </div>
              <div><label className="label">Qty</label><input required type="number" step="0.001" className="field" value={line.quantity} onChange={e => setLine(i, { quantity: e.target.value })} /></div>
              <div><label className="label">UOM</label>
                <select className="field" value={line.uom} onChange={e => setLine(i, { uom: e.target.value })}>{UOM.map(u => <option key={u} value={u}>{u}</option>)}</select>
              </div>
              <div><label className="label">Rate/Unit</label><input required type="number" step="0.01" className="field" value={line.ratePerUnit} onChange={e => setLine(i, { ratePerUnit: e.target.value })} /></div>
              <div><label className="label">GST %</label><input required type="number" step="0.01" className="field" value={line.gstRate} onChange={e => setLine(i, { gstRate: e.target.value })} /></div>
              <div>
                <label className="label">Landed/Unit</label>
                <div className={styles.money} style={{ padding: '9px 0', fontWeight: 700, color: 'var(--ct-primary)' }}>
                  {preview[i] !== null ? formatMoney(preview[i]) : '—'}
                </div>
              </div>
              <button type="button" onClick={() => removeLine(i)} disabled={lines.length === 1} className="btn btn-ghost btn-sm" style={{ padding: 6 }}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: 22, marginBottom: 16 }}>
          <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Invoice-Level Charges</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div><label className="label">Freight</label><input type="number" step="0.01" className="field" value={freight} onChange={e => setFreight(e.target.value)} /></div>
            <div><label className="label">Loading</label><input type="number" step="0.01" className="field" value={loading2} onChange={e => setLoading2(e.target.value)} /></div>
            <div><label className="label">Other Charges</label><input type="number" step="0.01" className="field" value={other} onChange={e => setOther(e.target.value)} /></div>
          </div>
          {Number(other) > 0 && (
            <div style={{ marginTop: 12 }}><label className="label">Other Charges Note (required)</label><input required className="field" value={otherNote} onChange={e => setOtherNote(e.target.value)} /></div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Purchase (Draft)'}</button>
        </div>
      </form>
    </motion.div>
  );
}
