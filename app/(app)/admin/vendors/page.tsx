'use client';
import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Building2 } from 'lucide-react';

const emptyForm = { name: '', contactPerson: '', phone: '', email: '', address: '', gstNumber: '' };

export default function AdminVendorsPage() {
  const [vendors, setVendors]           = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [modal, setModal]               = useState(false);
  const [editing, setEditing]           = useState<any>(null);
  const [form, setForm]                 = useState({ ...emptyForm });
  const [saving, setSaving]             = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting]         = useState(false);

  const fetchVendors = () => {
    fetch('/api/vendors?all=1').then(r => r.json()).then(d => { setVendors(d.vendors || []); setLoading(false); });
  };
  useEffect(() => { fetchVendors(); }, []);

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm }); setModal(true); };
  const openEdit = (v: any) => {
    setEditing(v);
    setForm({ name: v.name, contactPerson: v.contactPerson || '', phone: v.phone || '', email: v.email || '', address: v.address || '', gstNumber: v.gstNumber || '' });
    setModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const url = editing ? `/api/vendors/${editing._id}` : '/api/vendors';
    await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setSaving(false); setModal(false); fetchVendors();
  };

  const toggleActive = async (v: any) => {
    await fetch(`/api/vendors/${v._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !v.isActive }) });
    fetchVendors();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetch(`/api/vendors/${deleteTarget._id}`, { method: 'DELETE' });
    setDeleting(false); setDeleteTarget(null); fetchVendors();
  };

  const fields: [string, string, string?][] = [
    ['name', 'Vendor Name'], ['contactPerson', 'Contact Person'],
    ['phone', 'Phone'], ['email', 'Email', 'email'],
    ['address', 'Address'], ['gstNumber', 'GST Number'],
  ];

  return (
    <div style={{ maxWidth: '940px' }} className="fade-up">
      <div className="page-actions">
        <div>
          <h1 className="page-title">Vendor Master</h1>
          <p className="page-sub">{vendors.length} vendor{vendors.length !== 1 ? 's' : ''} registered</p>
        </div>
        <button onClick={openCreate} className="btn btn-primary">
          <Plus size={14} /> Add Vendor
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
                <th>Vendor</th>
                <th>Contact Person</th>
                <th>Phone</th>
                <th>Email</th>
                <th>GST No.</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vendors.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>No vendors yet. Add your first vendor.</td></tr>
              )}
              {vendors.map(v => (
                <tr key={v._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {v.photoUrl ? (
                        <img src={v.photoUrl} style={{ width: '34px', height: '34px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} alt="" />
                      ) : (
                        <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: v.isActive ? '#F0FDF4' : 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Building2 size={15} style={{ color: v.isActive ? 'var(--green)' : 'var(--text-3)' }} />
                        </div>
                      )}
                      <span style={{ fontWeight: 700, color: v.isActive ? 'var(--text-base)' : 'var(--text-3)', fontSize: '13.5px' }}>{v.name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-2)', fontSize: '13px' }}>{v.contactPerson || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', color: 'var(--text-2)' }}>{v.phone || '—'}</td>
                  <td style={{ fontSize: '12.5px', color: 'var(--text-3)' }}>{v.email || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)' }}>{v.gstNumber || '—'}</td>
                  <td>
                    <button onClick={() => toggleActive(v)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12.5px', fontWeight: 700, color: v.isActive ? 'var(--green)' : 'var(--text-3)', transition: 'color 0.15s' }}>
                      {v.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      {v.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button onClick={() => openEdit(v)} title="Edit" style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 7px', cursor: 'pointer', color: 'var(--text-3)', display: 'inline-flex', transition: 'border-color 0.15s, color 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--amber)'; (e.currentTarget as HTMLElement).style.color = 'var(--amber)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}>
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => setDeleteTarget(v)} title="Delete" style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 7px', cursor: 'pointer', color: 'var(--text-3)', display: 'inline-flex', transition: 'border-color 0.15s, color 0.15s' }}
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
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--text-base)', marginBottom: '8px' }}>Delete Vendor?</h3>
            <p style={{ fontSize: '13.5px', color: 'var(--text-3)', marginBottom: '22px' }}>
              Are you sure you want to delete <strong style={{ color: 'var(--text-base)' }}>{deleteTarget.name}</strong>? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteTarget(null)} className="btn btn-ghost">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="btn btn-danger">
                {deleting ? 'Deleting…' : 'Delete Vendor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="modal-backdrop">
          <div className="card fade-up" style={{ width: '100%', maxWidth: '440px', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Building2 size={17} style={{ color: 'var(--amber)' }} />
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--text-base)' }}>
                {editing ? 'Edit Vendor' : 'Add Vendor'}
              </h3>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
              {fields.map(([key, label, type]) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <input
                    type={type || 'text'}
                    value={(form as any)[key]}
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    required={key === 'name'}
                    className="field"
                  />
                </div>
              ))}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button type="button" onClick={() => setModal(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Saving…' : 'Save Vendor'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
