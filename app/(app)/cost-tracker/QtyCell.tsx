'use client';
import { useEffect, useRef, useState } from 'react';
import { useCostGridStore } from '@/store/costGridStore';

export default function QtyCell({ productIndex, styles, onNavigate }: {
  productIndex: number;
  styles: Record<string, string>;
  onNavigate: (dRow: number, dCol: number) => void;
}) {
  const products = useCostGridStore(s => s.products);
  const selected = useCostGridStore(s => s.selected);
  const flash = useCostGridStore(s => s.flash);
  const select = useCostGridStore(s => s.select);
  const commitQty = useCostGridStore(s => s.commitQty);
  useCostGridStore(s => s.recalcVersion);

  const product = products[productIndex];
  const row = productIndex + 1;
  const col = 1;
  const isSelected = selected?.row === row && selected?.col === col;
  const isFlashing = flash.has(`${row}:${col}`) || flash.has('*');

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) { inputRef.current?.focus(); inputRef.current?.select(); } }, [editing]);

  function startEdit() { setDraft(String(product.batchQty)); setEditing(true); }
  function commit(next: 'down' | 'right' | 'cancel' | 'stay') {
    if (next === 'cancel') { setEditing(false); return; }
    const result = commitQty(productIndex, draft);
    if (!result.ok) { useCostGridStore.getState().setToast(result.error, 'error'); return; }
    setEditing(false);
    if (next === 'down') onNavigate(1, 0);
    if (next === 'right') onNavigate(0, 1);
  }

  const classNames = [styles.cell, isSelected && styles.cellSelected, isFlashing && styles.cellFlash].filter(Boolean).join(' ');
  const isZero = product.batchQty === 0;

  return (
    <td
      className={classNames}
      title={isZero ? 'Qty is 0 — Cost/Unit shows ₹0.00' : undefined}
      onClick={() => select(row, col)}
      onDoubleClick={startEdit}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (editing) return;
        if (e.key === 'Enter' || e.key === 'F2') { e.preventDefault(); startEdit(); }
        else if (e.key.startsWith('Arrow')) {
          e.preventDefault();
          if (e.key === 'ArrowUp') onNavigate(-1, 0);
          if (e.key === 'ArrowDown') onNavigate(1, 0);
          if (e.key === 'ArrowLeft') onNavigate(0, -1);
          if (e.key === 'ArrowRight') onNavigate(0, 1);
        }
      }}
    >
      {editing ? (
        <input
          ref={inputRef}
          className={styles.cellInput}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit('stay')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commit('down'); }
            else if (e.key === 'Tab') { e.preventDefault(); commit('right'); }
            else if (e.key === 'Escape') { e.preventDefault(); commit('cancel'); }
          }}
        />
      ) : (
        <span className={styles.cellText} style={isZero ? { color: 'var(--ct-warn)' } : undefined}>{product.batchQty}</span>
      )}
    </td>
  );
}
