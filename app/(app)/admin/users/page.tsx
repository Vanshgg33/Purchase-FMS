'use client';
import { useEffect, useState } from 'react';
import { Plus, Edit2, ToggleLeft, ToggleRight, Key, Users } from 'lucide-react';

const ROLES = ['REQUESTER', 'PO_CREATOR', 'APPROVER', 'RECEIVER', 'SUPERADMIN'];
const emptyForm = { userId: '', name: '', designation: '', phone: '', email: '', role: 'REQUESTER', password: '' };

export default function AdminUsersPage() {
  const [users, setUsers]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [editing, setEditing]   = useState<any>(null);
  const [form, setForm]         = useState({ ...emptyForm });
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState('');
  const [resetPwUser, setResetPwUser] = useState<any>(null);
  const [newPw, setNewPw]       = useState('');

  const fetchUsers = () => {
    fetch('/api/admin/users').then(r => r.json()).then(d => { setUsers(d.users || []); setLoading(false); });
  };
  useEffect(() => { fetchUsers(); }, []);

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm }); setModal(true); setMsg(''); };
  const openEdit = (u: any) => {
    setEditing(u);
    setForm({ userId: u.userId, name: u.name, designation: u.designation || '', phone: u.phone || '', email: u.email, role: u.role, password: '' });
    setModal(true); setMsg('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setMsg('');
    const url = editing ? `/api/admin/users/${editing._id}` : '/api/admin/users';
    const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setSaving(false);
    if (res.ok) { setModal(false); fetchUsers(); }
    else { const d = await res.json(); setMsg(d.error || 'Failed to save.'); }
  };

  const toggleActive = async (u: any) => {
    await fetch(`/api/admin/users/${u._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !u.isActive }) });
    fetchUsers();
  };

  const handleResetPw = async () => {
    if (!resetPwUser || !newPw) return;
    await fetch(`/api/admin/users/${resetPwUser._id}/reset-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newPassword: newPw }) });
    setResetPwUser(null); setNewPw('');
  };

  const roleColors: Record<string, { bg: string; color: string }> = {
    REQUESTER:  { bg: '#EFF6FF', color: '#1D4ED8' },
    PO_CREATOR: { bg: '#FFFBEB', color: '#92400E' },
    APPROVER:   { bg: '#F0FDF4', color: '#166534' },
    RECEIVER:   { bg: '#F0FDFA', color: '#0F766E' },
    SUPERADMIN: { bg: '#FDF4FF', color: '#7E22CE' },
  };

  return (
    <div style={{ maxWidth: '960px' }} className="fade-up">
      <div className="page-actions">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-sub">{users.length} users in the system</p>
        </div>
        <button onClick={openCreate} className="btn btn-primary">
          <Plus size={14} /> Add User
        </button>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: '280px', borderRadius: '12px' }} />
      ) : (
        <div className="card">
          <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>User</th>
                <th>User ID</th>
                <th>Role</th>
                <th>Email</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const rc = roleColors[u.role] || { bg: '#F9FAFB', color: '#6B7280' };
                return (
                  <tr key={u._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {u.profilePhotoUrl ? (
                          <img src={u.profilePhotoUrl} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} alt="" />
                        ) : (
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>
                            {u.name[0]}
                          </div>
                        )}
                        <div>
                          <p style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-base)' }}>{u.name}</p>
                          {u.designation && <p style={{ fontSize: '11.5px', color: 'var(--text-3)' }}>{u.designation}</p>}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', color: 'var(--amber)' }}>{u.userId}</td>
                    <td>
                      <span style={{ background: rc.bg, color: rc.color, fontSize: '11.5px', fontWeight: 700, padding: '3px 9px', borderRadius: '999px' }}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--text-2)' }}>{u.email}</td>
                    <td>
                      <button onClick={() => toggleActive(u)} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12.5px', fontWeight: 700, color: u.isActive ? 'var(--green)' : 'var(--text-3)', transition: 'color 0.15s' }}>
                        {u.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        {u.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button onClick={() => openEdit(u)} title="Edit" style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 7px', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', transition: 'border-color 0.15s, color 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--amber)'; (e.currentTarget as HTMLElement).style.color = 'var(--amber)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}>
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => { setResetPwUser(u); setNewPw(''); }} title="Reset password" style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 7px', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', transition: 'border-color 0.15s, color 0.15s' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--amber)'; (e.currentTarget as HTMLElement).style.color = 'var(--amber)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}>
                          <Key size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Create/Edit modal */}
      {modal && (
        <div className="modal-backdrop">
          <div className="card modal-sheet fade-up" style={{ width: '100%', maxWidth: '460px', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '22px' }}>
              <Users size={17} style={{ color: 'var(--amber)' }} />
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--text-base)' }}>
                {editing ? 'Edit User' : 'Add New User'}
              </h3>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="label">User ID</label>
                  <input value={form.userId} onChange={e => setForm(p => ({ ...p, userId: e.target.value }))} required disabled={!!editing} className="field" />
                </div>
                <div>
                  <label className="label">Role</label>
                  <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className="field">
                    {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                  </select>
                </div>
              </div>
              {([['name', 'Full Name'], ['designation', 'Designation'], ['phone', 'Phone'], ['email', 'Email']] as [string,string][]).map(([key, label]) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <input type={key === 'email' ? 'email' : 'text'} value={(form as any)[key]}
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    required={['name','email'].includes(key)} className="field" />
                </div>
              ))}
              {!editing && (
                <div>
                  <label className="label">Password</label>
                  <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required className="field" />
                </div>
              )}
              {msg && <div className="alert alert-err">{msg}</div>}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button type="button" onClick={() => setModal(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Saving…' : 'Save User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {resetPwUser && (
        <div className="modal-backdrop">
          <div className="card fade-up" style={{ width: '100%', maxWidth: '380px', padding: '28px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 700, color: 'var(--text-base)', marginBottom: '6px' }}>Reset Password</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '18px' }}>
              For <strong>{resetPwUser.name}</strong> (<span style={{ fontFamily: 'var(--font-mono)' }}>{resetPwUser.userId}</span>)
            </p>
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="New password" className="field" style={{ marginBottom: '18px' }} />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setResetPwUser(null)} className="btn btn-ghost">Cancel</button>
              <button onClick={handleResetPw} disabled={!newPw} className="btn btn-primary">Reset Password</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
