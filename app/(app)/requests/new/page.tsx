'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, CheckCircle, ArrowRight } from 'lucide-react';

interface Material { materialId: string; name: string; requestedQty: string; }
interface RawMaterial { _id: string; name: string; unit: string; category: string; }

export default function NewRequestPage() {
  const router = useRouter();
  const [materials, setMaterials] = useState<Material[]>([{ materialId: '', name: '', requestedQty: '' }]);
  const [remark, setRemark]     = useState('');
  const [neededBy, setNeededBy] = useState('');
  const [rawMats, setRawMats]   = useState<RawMaterial[]>([]);
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState('');
  const [error, setError]       = useState('');

  useEffect(() => {
    fetch('/api/materials').then(r => r.json()).then(d => setRawMats(d.materials || []));
  }, []);

  const addRow    = () => setMaterials(prev => [...prev, { materialId: '', name: '', requestedQty: '' }]);
  const removeRow = (i: number) => setMaterials(prev => prev.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: keyof Material, value: string) => {
    setMaterials(prev => {
      const u = [...prev];
      u[i] = { ...u[i], [field]: value };
      if (field === 'materialId') {
        const m = rawMats.find(m => m._id === value);
        if (m) u[i].name = m.name;
      }
      return u;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const valid = materials.filter(m => m.materialId && m.requestedQty && Number(m.requestedQty) > 0);
    if (!valid.length) { setError('Add at least one material with a quantity.'); return; }
    setLoading(true);
    const res = await fetch('/api/po', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ materials: valid.map(m => ({ ...m, requestedQty: Number(m.requestedQty) })), remark, neededBy }),
    });
    setLoading(false);
    if (res.ok) {
      const d = await res.json();
      setSuccess(d.poNumber);
    } else {
      const d = await res.json();
      setError(d.error || 'Failed to submit request.');
    }
  };

  if (success) return (
    <div style={{ maxWidth: '480px', margin: '48px auto', textAlign: 'center' }} className="fade-up">
      <div className="card" style={{ padding: '48px 36px' }}>
        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#F0FDF4', border: '2px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <CheckCircle size={30} style={{ color: 'var(--green)' }} />
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, color: 'var(--text-base)', marginBottom: '8px' }}>Request Submitted!</h2>
        <p style={{ color: 'var(--text-3)', fontSize: '13.5px', marginBottom: '6px' }}>Your purchase request number is</p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', fontWeight: 600, color: 'var(--amber)', marginBottom: '6px' }}>{success}</p>
        <p style={{ color: 'var(--text-3)', fontSize: '12.5px', marginBottom: '28px' }}>Purchase team has been notified via email.</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button onClick={() => router.push(`/po/${success}`)} className="btn btn-primary">
            View PO <ArrowRight size={14} />
          </button>
          <button onClick={() => { setSuccess(''); setMaterials([{ materialId: '', name: '', requestedQty: '' }]); setRemark(''); setNeededBy(''); }} className="btn btn-ghost">
            New Request
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: '640px' }} className="fade-up">
      <div className="page-header">
        <h1 className="page-title">New Material Request</h1>
        <p className="page-sub">Submit a purchase request for raw materials</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '15px', marginBottom: '16px', color: 'var(--text-base)' }}>
            Materials & Quantities
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {materials.map((row, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr minmax(90px, 120px) auto', gap: '8px', alignItems: 'center' }}>
                <select
                  value={row.materialId}
                  onChange={e => updateRow(i, 'materialId', e.target.value)}
                  className="field"
                  required
                >
                  <option value="">Select material…</option>
                  {rawMats.map(m => <option key={m._id} value={m._id}>{m.name} ({m.category})</option>)}
                </select>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="number" min="0.1" step="0.1"
                    value={row.requestedQty}
                    onChange={e => updateRow(i, 'requestedQty', e.target.value)}
                    placeholder="Qty"
                    className="field"
                    style={{ textAlign: 'right' }}
                    required
                  />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>KG</span>
                </div>

                {materials.length > 1 ? (
                  <button type="button" onClick={() => removeRow(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: '4px', display: 'flex', opacity: 0.7, transition: 'opacity 0.15s' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '0.7')}>
                    <Trash2 size={15} />
                  </button>
                ) : <div />}
              </div>
            ))}
          </div>

          <button type="button" onClick={addRow} className="btn btn-ghost btn-sm" style={{ marginTop: '12px', gap: '6px' }}>
            <Plus size={14} /> Add Material
          </button>
        </div>

        <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label className="label">Needed By</label>
              <input
                type="date"
                value={neededBy}
                onChange={e => setNeededBy(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="field"
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="label">Remark (optional)</label>
              <textarea
                value={remark}
                onChange={e => setRemark(e.target.value)}
                rows={3}
                placeholder="Special instructions, urgency note…"
                className="field"
                style={{ resize: 'none' }}
              />
            </div>
          </div>
        </div>

        {error && <div className="alert alert-err" style={{ marginBottom: '14px' }}>{error}</div>}

        <button type="submit" disabled={loading} className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }}>
          {loading ? 'Submitting…' : 'Send Request'}
        </button>
      </form>
    </div>
  );
}
