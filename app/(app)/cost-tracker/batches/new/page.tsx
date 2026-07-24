'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { ctFetch } from '@/lib/ctClient';
import { SHIFT } from '@/types/costTracker';

export default function NewBatchPage() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [productId, setProductId] = useState('');
  const [productionDate, setProductionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [shift, setShift] = useState('');
  const [plannedInputQty, setPlannedInputQty] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { ctFetch('/api/cost-tracker/products').then(setProducts); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const batch = await ctFetch('/api/cost-tracker/batches', {
        method: 'POST',
        body: JSON.stringify({ productId, productionDate, shift: shift || undefined, plannedInputQty: plannedInputQty ? Number(plannedInputQty) : undefined, notes: notes || undefined }),
      });
      router.push(`/cost-tracker/batches/${batch._id}`);
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} style={{ maxWidth: 520 }}>
      <button onClick={() => router.back()} className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }}><ArrowLeft size={14} /> Back</button>
      {error && <div className="alert alert-err" style={{ marginBottom: 14 }}>{error}</div>}
      <div className="card" style={{ padding: 24 }}>
        <h3 className="display" style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>New Production Batch</h3>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label className="label">Product (SKU)</label>
            <select required className="field" value={productId} onChange={e => setProductId(e.target.value)}>
              <option value="">Select product…</option>
              {products.map(p => <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div><label className="label">Production Date</label><input required type="date" className="field" value={productionDate} onChange={e => setProductionDate(e.target.value)} /></div>
            <div><label className="label">Shift (optional)</label>
              <select className="field" value={shift} onChange={e => setShift(e.target.value)}>
                <option value="">—</option>
                {SHIFT.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div><label className="label">Planned Input Qty (optional)</label><input type="number" step="0.001" className="field" value={plannedInputQty} onChange={e => setPlannedInputQty(e.target.value)} /></div>
          <div><label className="label">Notes</label><textarea className="field" rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create Batch'}</button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
