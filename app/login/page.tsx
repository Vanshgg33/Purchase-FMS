'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await signIn('credentials', { userId, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError('Invalid User ID or password');
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(145deg, #1B3A2D 0%, #14532D 40%, #1a3a28 70%, #0f2d1e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>

      {/* Decorative rings */}
      <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '400px', height: '400px', borderRadius: '50%', border: '1px solid rgba(180,83,9,0.15)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '300px', height: '300px', borderRadius: '50%', border: '1px solid rgba(180,83,9,0.10)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '350px', height: '350px', borderRadius: '50%', border: '1px solid rgba(180,83,9,0.10)', pointerEvents: 'none' }} />

      <div className="fade-up" style={{ width: '100%', maxWidth: '400px', position: 'relative', zIndex: 1 }}>

        {/* Brand mark */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', background: 'rgba(180,83,9,0.18)', borderRadius: '16px', marginBottom: '16px', border: '1px solid rgba(180,83,9,0.35)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3h18l-2 13H5L3 3z"/><path d="M3 3l-.5-2h-2"/><circle cx="10" cy="20" r="1"/><circle cx="17" cy="20" r="1"/>
            </svg>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, color: '#FDF8F0', letterSpacing: '-0.02em', margin: 0 }}>
            Purchase FMS
          </h1>
          <p style={{ color: 'rgba(253,248,240,0.45)', fontSize: '13px', marginTop: '4px', fontFamily: 'var(--font-body)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            NatureLite Foods
          </p>
        </div>

        {/* Card */}
        <div style={{ background: 'rgba(253,250,245,0.97)', borderRadius: '18px', padding: '36px', boxShadow: '0 20px 60px rgba(0,0,0,0.35)', border: '1px solid rgba(229,217,195,0.6)' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 600, color: 'var(--text-base)', marginBottom: '24px' }}>
            Sign in to continue
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label className="label">User ID</label>
              <input
                type="text"
                value={userId}
                onChange={e => setUserId(e.target.value)}
                className="field"
                placeholder="e.g. requester01"
                required
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label className="label">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="field"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="alert alert-err" style={{ marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: 'rgba(253,248,240,0.3)', fontFamily: 'var(--font-body)' }}>
          Factory Operations · Secure Access
        </p>
      </div>
    </div>
  );
}
