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
}

export default function GridCell({ productIndex, columnIndex, column, styles, onNavigate }: GridCellProps) {
  const engine = useCostGridStore(s => s.engine);
  const cellMap = useCostGridStore(s => s.cellMap);
  const products = useCostGridStore(s => s.products);
  const selected = useCostGridStore(s => s.selected);
  const flash = useCostGridStore(s => s.flash);
  const select = useCostGridStore(s => s.select);
  const commitCell = useCostGridStore(s => s.commitCell);

  const row = productIndex + 1;
  const col = columnIndex + 1;
  const product = products[productIndex];
  const key = `${product._id}:${column._id}`;
  const raw = cellMap[key] ?? '';

  const isSelected = selected?.row === row && selected?.col === col;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [invalid, setInvalid] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const value = engine.getValue({ row, col });
  const { text, error, tooltip } = formatCellDisplay(value, column.type);
  const isFormula = raw.startsWith('=');
  const isFlashing = flash.has(`${row}:${col}`);

  function startEdit() {
    setDraft(toEditValue(raw, column.type));
    setInvalid(null);
    setEditing(true);
  }

  function commit(next: 'stay' | 'down' | 'right' | 'cancel') {
    if (next === 'cancel') { setEditing(false); setInvalid(null); return; }
    const result = commitCell(productIndex, columnIndex, draft);
    if (!result.ok) { setInvalid(result.error); return; }
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
  ].filter(Boolean).join(' ');

  return (
    <td
      className={classNames}
      title={tooltip || invalid || undefined}
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
        } else if (e.key.length === 1) {
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
        </>
      )}
    </td>
  );
}
