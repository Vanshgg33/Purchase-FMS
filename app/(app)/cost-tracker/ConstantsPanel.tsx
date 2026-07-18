'use client';
import { useState } from 'react';
import { X, Plus, Trash2, Lock } from 'lucide-react';
import { useCostGridStore } from '@/store/costGridStore';
import { getColumnOffsets } from '@/lib/costMatrix';

export default function ConstantsPanel({ styles, onClose, onNeedUnlock }: {
  styles: Record<string, string>;
  onClose: () => void;
  onNeedUnlock: () => void;
}) {
  const constants = useCostGridStore(s => s.constants);
  const setConstants = useCostGridStore(s => s.setConstants);
  const isPinAdmin = useCostGridStore(s => s.isPinAdmin);
  const cellMap = useCostGridStore(s => s.cellMap);
  const setToast = useCostGridStore(s => s.setToast);
  const select = useCostGridStore(s => s.select);
  const columns = useCostGridStore(s => s.columns);
  const products = useCostGridStore(s => s.products);

  const [newName, setNewName] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  function usageCount(name: string) {
    const pattern = new RegExp(`\\b${name}\\b`);
    return Object.values(cellMap).filter(v => v.startsWith('=') && pattern.test(v)).length;
  }

  function highlightUsage(name: string) {
    const pattern = new RegExp(`\\b${name}\\b`);
    const entry = Object.entries(cellMap).find(([, v]) => v.startsWith('=') && pattern.test(v));
    if (!entry) return;
    const [key] = entry;
    const [productId, columnId] = key.split(':');
    const pi = products.findIndex(p => p._id === productId);
    const ci = columns.findIndex(c => c._id === columnId);
    if (pi === -1 || ci === -1) return;
    select(pi + 1, getColumnOffsets(columns.length).firstExpenseCol + ci);
    setToast(`Jumped to first cell using ${name}`, 'info');
  }

  async function saveValue(id: string, name: string) {
    if (!isPinAdmin) { onNeedUnlock(); return; }
    const raw = drafts[id];
    if (raw === undefined) return;
    const value = Number(raw);
    if (Number.isNaN(value)) { setToast('Value must be a number', 'error'); return; }
    const res = await fetch(`/api/cost-tracker/constants/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value }),
    });
    if (!res.ok) { const b = await res.json().catch(() => ({})); setToast(b.error || 'Failed to update constant', 'error'); return; }
    const next = constants.map(c => (c._id === id ? { ...c, value } : c));
    setConstants(next);
    setToast(`${name} updated`, 'info');
  }

  async function addConstant() {
    if (!isPinAdmin) { onNeedUnlock(); return; }
    const name = newName.trim().toUpperCase();
    const value = Number(newValue);
    if (!/^[A-Z][A-Z0-9_]{1,30}$/.test(name)) { setToast('Name must be UPPER_SNAKE_CASE', 'error'); return; }
    if (Number.isNaN(value)) { setToast('Value must be a number', 'error'); return; }
    const res = await fetch('/api/cost-tracker/constants', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, value, description: newDesc.trim() || undefined }),
    });
    const body = await res.json();
    if (!res.ok) { setToast(body.error || 'Failed to add constant', 'error'); return; }
    setConstants([...constants, body.constant].map(c => ({ ...c, _id: c._id || c.id })));
    setNewName(''); setNewValue(''); setNewDesc('');
  }

  async function deleteConstant(id: string, name: string, force = false) {
    const res = await fetch(`/api/cost-tracker/constants/${id}${force ? '?force=true' : ''}`, { method: 'DELETE' });
    if (res.status === 403) { onNeedUnlock(); return; }
    if (res.status === 409) {
      const body = await res.json();
      if (window.confirm(`${name} is used by ${body.affected?.length ?? 'some'} formula(s). Delete anyway? They will show #NAME?`)) {
        deleteConstant(id, name, true);
      }
      return;
    }
    if (!res.ok) { setToast('Failed to delete constant', 'error'); return; }
    setConstants(constants.filter(c => c._id !== id));
  }

  return (
    <>
      <div className={styles.drawerBackdrop} onClick={onClose} />
      <div className={styles.drawer}>
        <div className={styles.drawerHeader}>
          <div className={styles.drawerTitle}>Σ Constants</div>
          <button className={styles.drawerCloseBtn} onClick={onClose}><X size={18} /></button>
        </div>
        <div className={styles.drawerBody}>
          {!isPinAdmin && (
            <p style={{ fontSize: 12, color: 'var(--ct-text-dim)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Lock size={12} /> Read-only — unlock superadmin to edit.
            </p>
          )}
          {constants.length === 0 && (
            <div className={styles.emptyBracket} style={{ padding: '20px 0' }}>[ NO CONSTANTS YET ]</div>
          )}
          {constants.map(c => (
            <div key={c._id} className={styles.constantRow}>
              <span className={styles.constantName}>{c.name}</span>
              <input
                className={styles.constantValue}
                defaultValue={c.value}
                disabled={!isPinAdmin}
                onChange={(e) => setDrafts(d => ({ ...d, [c._id]: e.target.value }))}
                onBlur={() => saveValue(c._id, c.name)}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              />
              <span className={styles.constantDesc}>{c.description}</span>
              <span className={styles.constantUsage} onClick={() => highlightUsage(c.name)}>Used in {usageCount(c.name)}</span>
              {isPinAdmin && (
                <button className={styles.thMenuBtn} onClick={() => deleteConstant(c._id, c.name)}><Trash2 size={13} /></button>
              )}
            </div>
          ))}

          {isPinAdmin && (
            <div style={{ marginTop: 16, display: 'flex', gap: 6 }}>
              <input className={styles.input} placeholder="NAME" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ flex: '0 0 110px', fontFamily: 'var(--ct-font-mono)' }} />
              <input className={styles.input} placeholder="Value" value={newValue} onChange={(e) => setNewValue(e.target.value)} style={{ flex: '0 0 80px' }} />
              <input className={styles.input} placeholder="Description" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={addConstant}><Plus size={14} /></button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
