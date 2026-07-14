'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Upload, CheckCircle, KeyRound, Camera } from 'lucide-react';

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const user = session?.user as any;
  const [oldPw, setOldPw]         = useState('');
  const [newPw, setNewPw]         = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMsg, setPwMsg]         = useState('');
  const [pwError, setPwError]     = useState('');
  const [uploading, setUploading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(''); setPwMsg('');
    if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return; }
    if (newPw.length < 6) { setPwError('Password must be at least 6 characters.'); return; }
    const res = await fetch('/api/profile/password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw }),
    });
    if (res.ok) { setPwMsg('Password updated successfully.'); setOldPw(''); setNewPw(''); setConfirmPw(''); }
    else { const d = await res.json(); setPwError(d.error || 'Failed to update password.'); }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/profile/photo', { method: 'POST', body: fd });
    setUploading(false);
    if (res.ok) {
      const data = await res.json();
      await update({ profilePhotoUrl: data.url });
      window.location.reload();
    }
    e.target.value = '';
  };

  const roleLabel: Record<string, string> = {
    REQUESTER: 'Requester', PO_CREATOR: 'Purchase Creator', APPROVER: 'Approver',
    RECEIVER: 'Receiver', SUPERADMIN: 'Super Admin',
  };

  return (
    <div style={{ maxWidth: '520px' }} className="fade-up">
      <div className="page-header">
        <h1 className="page-title">My Profile</h1>
      </div>

      {/* Profile card */}
      <div className="card" style={{ padding: '28px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {user?.profilePhotoUrl ? (
              <img src={user.profilePhotoUrl} style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--border-em)' }} alt="" />
            ) : (
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '26px', fontFamily: 'var(--font-display)', fontWeight: 700, border: '3px solid rgba(180,83,9,0.2)' }}>
                {user?.name?.[0]}
              </div>
            )}
            <label title="Change photo" style={{ position: 'absolute', bottom: 0, right: 0, width: '24px', height: '24px', background: 'var(--amber)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid var(--bg-card)', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--amber-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--amber)')}>
              <Camera size={11} style={{ color: '#fff' }} />
              <input type="file" accept=".jpg,.jpeg,.png,.webp" style={{ display: 'none' }} onChange={handlePhotoUpload} disabled={uploading} />
            </label>
          </div>

          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '19px', fontWeight: 700, color: 'var(--text-base)', marginBottom: '3px' }}>
              {user?.name}
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '2px' }}>
              {roleLabel[user?.role] || user?.role}
            </p>
            {user?.designation && (
              <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>{user.designation}</p>
            )}
            {uploading && (
              <p style={{ fontSize: '12px', color: 'var(--amber)', marginTop: '6px', fontWeight: 600 }}>Uploading photo…</p>
            )}
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '20px' }}>
          <KeyRound size={16} style={{ color: 'var(--amber)' }} />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-base)' }}>Change Password</h2>
        </div>

        <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label className="label">Current Password</label>
            <input type="password" value={oldPw} onChange={e => setOldPw(e.target.value)} required className="field" />
          </div>
          <div>
            <label className="label">New Password</label>
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} required className="field" />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required className="field" />
          </div>

          {pwError && <div className="alert alert-err">{pwError}</div>}
          {pwMsg && (
            <div className="alert alert-ok" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={14} /> {pwMsg}
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}
