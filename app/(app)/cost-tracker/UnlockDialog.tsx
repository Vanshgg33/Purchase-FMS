'use client';
import { useRef, useState } from 'react';
import { useCostGridStore } from '@/store/costGridStore';

const LENGTH = 6;

export default function UnlockDialog({ styles, onClose }: { styles: Record<string, string>; onClose: () => void }) {
  const setPinAdmin = useCostGridStore(s => s.setPinAdmin);
  const setToast = useCostGridStore(s => s.setToast);
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function setDigit(i: number, v: string) {
    const d = v.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = d;
    setDigits(next);
    setError(null);
    if (d && i < LENGTH - 1) refs.current[i + 1]?.focus();
    if (d && i === LENGTH - 1 && next.every(x => x)) submit(next.join(''));
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  }

  async function submit(pin: string) {
    setBusy(true);
    try {
      const res = await fetch('/api/cost-tracker/auth/unlock', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(res.status === 429 ? body.error : 'Incorrect PIN');
        setDigits(Array(LENGTH).fill(''));
        refs.current[0]?.focus();
        return;
      }
      setPinAdmin(true);
      setToast('Superadmin unlocked', 'info');
      onClose();
    } catch {
      setError('Network error — try again');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalTitle}>Superadmin Unlock</div>
        <p style={{ fontSize: 12.5, color: 'var(--ct-text-dim)' }}>Enter the 6-digit PIN to unlock locked columns, pricing, constants, and deletions for 8 hours.</p>
        <div className={styles.pinRow}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el; }}
              className={`${styles.pinBox} ${error ? styles.pinBoxError : ''}`}
              inputMode="numeric"
              maxLength={1}
              value={d}
              disabled={busy}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
            />
          ))}
        </div>
        {error && <p style={{ color: 'var(--ct-danger)', fontSize: 12, textAlign: 'center' }}>{error}</p>}
        <div className={styles.modalActions}>
          <button className={styles.btn} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
