'use client';
import { useEffect, useRef, useState } from 'react';
import { useCostGridStore, type CostColumnLite } from '@/store/costGridStore';
import { toEditValue } from '@/lib/currency';
import { formatCellDisplay } from '@/lib/cellFormat';

interface GridCellProps {
  productIndex: number;
  columnIndex: number;
  column: CostColumnLite;
  styles: Record<string, string>;
  onNavigate: (dRow: number, dCol: number) => void;
  onNoteRequest: (productId: string, columnId: string, anchor: HTMLElement) => void;
}

export default function GridCell({ productIndex, columnIndex, column, styles, onNavigate, onNoteRequest }: GridCellProps) {
  const engine = useCostGridStore(s => s.engine);
  const cellMap = useCostGridStore(s => s.cellMap);
  const noteMap = useCostGridStore(s => s.noteMap);
  const products = useCostGridStore(s => s.products);
  const selected = useCostGridStore(s => s.selected);
  const flash = useCostGridStore(s => s.flash);
  const select = useCostGridStore(s => s.select);
  const commitCell = useCostGridStore(s => s.commitCell);
  const isPinAdmin = useCostGridStore(s => s.isPinAdmin);
  const sandbox = useCostGridStore(s => s.sandbox);
  useCostGridStore(s => s.recalcVersion); // subscribe only to trigger re-render on engine mutations

  const row = productIndex + 1;
  const col = columnIndex + 2; // engine col 0=name,1=qty,2..=expenses
  const product = products[productIndex];
  const key = `${product._id}:${column._id}`;
  const raw = cellMap[key] ?? '';
  const hasNote = !!noteMap[key];

  const isSelected = selected?.row === row && selected?.col === col;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [invalid, setInvalid] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const tdRef = useRef<HTMLTableCellElement>(null);

  const locked = column.locked && !isPinAdmin && !sandbox;

  useEffect(() => {
    if (editing) { inputRef.current?.focus(); inputRef.current?.select(); }
  }, [editing]);

  const value = engine.getValue({ row, col });
  const { text, error, tooltip } = formatCellDisplay(value, column.type);
  const isFormula = raw.startsWith('=');
  const isFlashing = flash.has(`${row}:${col}`) || flash.has('*');

  function startEdit() {
    if (locked) {
      setShaking(true);
      setTimeout(() => setShaking(false), 300);
      useCostGridStore.getState().setToast('Locked — superadmin only', 'error');
      return;
    }
    setDraft(toEditValue(raw, column.type));
    setInvalid(null);
    setEditing(true);
  }

  function commit(next: 'stay' | 'down' | 'right' | 'cancel') {
    if (next === 'cancel') { setEditing(false); setInvalid(null); return; }
    const result = commitCell(productIndex, columnIndex, draft);
    if (!result.ok) {
      setInvalid(result.error);
      if (result.locked) { setEditing(false); setShaking(true); setTimeout(() => setShaking(false), 300); }
      return;
    }
    setEditing(false);
    setInvalid(null);
    if (next === 'down') onNavigate(1, 0);
    if (next === 'right') onNavigate(0, 1);
  }

  const classNames = [
    styles.cell,
    isSelected && styles.cellSelected,
    isFormula && styles.cellFormula,
    error && styles.cellError,
    isFlashing && styles.cellFlash,
    invalid && styles.cellInvalid,
    locked && styles.cellLocked,
    column.locked && isPinAdmin && styles.cellLockedAdmin,
    shaking && styles.shake,
  ].filter(Boolean).join(' ');

  return (
    <td
      ref={tdRef}
      className={classNames}
      title={tooltip || invalid || (locked ? 'Locked — superadmin only' : undefined)}
      onClick={() => select(row, col)}
      onDoubleClick={startEdit}
      onContextMenu={(e) => { e.preventDefault(); onNoteRequest(product._id, column._id, e.currentTarget); }}
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
        } else if (!locked && e.key.length === 1) {
          setDraft(e.key);
          setInvalid(null);
          setEditing(true);
        }
      }}
    >
      {editing ? (
        <input
          ref={inputRef}
          className={styles.cellInput}
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setInvalid(null); }}
          onBlur={() => commit('stay')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commit('down'); }
            else if (e.key === 'Tab') { e.preventDefault(); commit('right'); }
            else if (e.key === 'Escape') { e.preventDefault(); commit('cancel'); }
          }}
        />
      ) : (
        <>
          {isFormula && <span className={styles.fxBadge}>ƒx</span>}
          <span className={styles.cellText}>{text}</span>
          {hasNote && <span className={styles.noteDot} title={noteMap[key]} />}
        </>
      )}
    </td>
  );
}
