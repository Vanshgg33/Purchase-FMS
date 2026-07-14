'use client';
import { useEffect, useState } from 'react';
import { Plus, Edit2, Building2 } from 'lucide-react';

const emptyForm = { name: '', contactPerson: '', phone: '', email: '', address: '', gstNumber: '' };

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm]       = useState({ ...emptyForm });
  const [saving, setSaving]   = useState(false);

  const fetchVendors = () => {
    fetch('/api/vendors').then(r => r.json()).then(d => { setVendors(d.vendors || []); setLoading(false); });
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
          <p className="page-sub">{vendors.length} vendors registered</p>
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
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vendors.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>No vendors yet. Add your first vendor.</td></tr>
              )}
              {vendors.map(v => (
                <tr key={v._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Building2 size={15} style={{ color: 'var(--green)' }} />
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--text-base)', fontSize: '13.5px' }}>{v.name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-2)', fontSize: '13px' }}>{v.contactPerson || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', color: 'var(--text-2)' }}>{v.phone || '—'}</td>
                  <td style={{ fontSize: '12.5px', color: 'var(--text-3)' }}>{v.email || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)' }}>{v.gstNumber || '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button onClick={() => openEdit(v)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 7px', cursor: 'pointer', color: 'var(--text-3)', display: 'inline-flex', transition: 'border-color 0.15s, color 0.15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--amber)'; (e.currentTarget as HTMLElement).style.color = 'var(--amber)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}>
                      <Edit2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
