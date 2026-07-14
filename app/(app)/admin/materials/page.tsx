'use client';
import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Package } from 'lucide-react';

export default function AdminMaterialsPage() {
  const [materials, setMaterials]       = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [modal, setModal]               = useState(false);
  const [editing, setEditing]           = useState<any>(null);
  const [form, setForm]                 = useState({ name: '', unit: 'KG', category: '', minStockAlert: '' });
  const [saving, setSaving]             = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting]         = useState(false);

  const fetchMats = () => {
    fetch('/api/materials?all=1').then(r => r.json()).then(d => { setMaterials(d.materials || []); setLoading(false); });
  };
  useEffect(() => { fetchMats(); }, []);

  const openCreate = () => { setEditing(null); setForm({ name: '', unit: 'KG', category: '', minStockAlert: '' }); setModal(true); };
  const openEdit = (m: any) => { setEditing(m); setForm({ name: m.name, unit: m.unit, category: m.category || '', minStockAlert: m.minStockAlert || '' }); setModal(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const url = editing ? `/api/materials/${editing._id}` : '/api/materials';
    await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setSaving(false); setModal(false); fetchMats();
  };

  const toggleActive = async (m: any) => {
    await fetch(`/api/materials/${m._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !m.isActive }) });
    fetchMats();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetch(`/api/materials/${deleteTarget._id}`, { method: 'DELETE' });
    setDeleting(false); setDeleteTarget(null); fetchMats();
  };

  return (
    <div style={{ maxWidth: '860px' }} className="fade-up">
      <div className="page-actions">
        <div>
          <h1 className="page-title">Raw Materials Master</h1>
          <p className="page-sub">{materials.length} materials configured</p>
        </div>
        <button onClick={openCreate} className="btn btn-primary">
          <Plus size={14} /> Add Material
        </button>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: '240px', borderRadius: '12px' }} />
      ) : (
        <div className="card">
          <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Min Stock Alert</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {materials.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>No materials yet</td></tr>
              )}
              {materials.map(m => (
                <tr key={m._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--amber-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Package size={14} style={{ color: 'var(--amber)' }} />
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--text-base)', fontSize: '13.5px' }}>{m.name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-2)' }}>{m.category || '—'}</td>
                  <td>
                    <span className="chip">{m.unit}</span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-2)' }}>
                    {m.minStockAlert ? `${m.minStockAlert} KG` : '—'}
                  </td>
                  <td>
                    <button onClick={() => toggleActive(m)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12.5px', fontWeight: 700, color: m.isActive ? 'var(--green)' : 'var(--text-3)', transition: 'color 0.15s' }}>
                      {m.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      {m.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button onClick={() => openEdit(m)} title="Edit" style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 7px', cursor: 'pointer', color: 'var(--text-3)', display: 'inline-flex', transition: 'border-color 0.15s, color 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--amber)'; (e.currentTarget as HTMLElement).style.color = 'var(--amber)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}>
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => setDeleteTarget(m)} title="Delete" style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 7px', cursor: 'pointer', color: 'var(--text-3)', display: 'inline-flex', transition: 'border-color 0.15s, color 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--red)'; (e.currentTarget as HTMLElement).style.color = 'var(--red)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <div className="modal-backdrop">
          <div className="card fade-up" style={{ width: '100%', maxWidth: '400px', padding: '28px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--text-base)', marginBottom: '8px' }}>Delete Material?</h3>
            <p style={{ fontSize: '13.5px', color: 'var(--text-3)', marginBottom: '22px' }}>
              Are you sure you want to delete <strong style={{ color: 'var(--text-base)' }}>{deleteTarget.name}</strong>? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteTarget(null)} className="btn btn-ghost">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="btn btn-danger">
                {deleting ? 'Deleting…' : 'Delete Material'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="modal-backdrop">
          <div className="card fade-up" style={{ width: '100%', maxWidth: '380px', padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Package size={17} style={{ color: 'var(--amber)' }} />
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--text-base)' }}>
                {editing ? 'Edit Material' : 'Add Material'}
              </h3>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
              <div>
                <label className="label">Material Name</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required className="field" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="label">Category</label>
                  <input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="field" />
                </div>
                <div>
                  <label className="label">Unit</label>
                  <input value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} required className="field" />
                </div>
              </div>
              <div>
                <label className="label">Min Stock Alert (KG)</label>
                <input type="number" value={form.minStockAlert} onChange={e => setForm(p => ({ ...p, minStockAlert: e.target.value }))} className="field" />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button type="button" onClick={() => setModal(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
