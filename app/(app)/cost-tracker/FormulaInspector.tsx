'use client';
import { X } from 'lucide-react';
import { useCostGridStore } from '@/store/costGridStore';
import { getColumnOffsets } from '@/lib/costMatrix';
import { formatCellDisplay } from '@/lib/cellFormat';

interface Props { styles: Record<string, string>; onClose: () => void; }

export default function FormulaInspector({ styles, onClose }: Props) {
  const selected = useCostGridStore(s => s.selected);
  const engine = useCostGridStore(s => s.engine);
  const products = useCostGridStore(s => s.products);
  const columns = useCostGridStore(s => s.columns);
  const constants = useCostGridStore(s => s.constants);
  const select = useCostGridStore(s => s.select);
  useCostGridStore(s => s.recalcVersion);

  if (!selected) return null;
  const formula = engine.getFormula({ row: selected.row, col: selected.col });
  if (!formula) return null;

  const offsets = getColumnOffsets(columns.length);

  function describe(row: number, col: number): string {
    const product = products[row - 1];
    const name = product ? product.name : `row ${row}`;
    if (col === 0) return `Product · ${name}`;
    if (col === offsets.qtyCol) return `Qty · ${name}`;
    if (col === offsets.baseAmountCol) return `Base Amount · ${name}`;
    if (col === offsets.batchTotalCol) return `Batch Total · ${name}`;
    if (col === offsets.costUnitCol) return `Cost/Unit · ${name}`;
    if (col === offsets.sellPriceCol) return `Sell Price · ${name}`;
    if (col === offsets.marginCol) return `Margin % · ${name}`;
    const ci = col - offsets.firstExpenseCol;
    const column = columns[ci];
    return column ? `${column.label} · ${name}` : `col ${col} · ${name}`;
  }

  const precedents = engine.getPrecedents({ row: selected.row, col: selected.col })
    .filter((p: any) => 'row' in p && p.sheet !== -1)
    .map((p: any) => ({ row: p.row, col: p.col, label: describe(p.row, p.col), value: engine.getValue({ row: p.row, col: p.col }) }));

  const dependents = engine.getDependents({ row: selected.row, col: selected.col })
    .filter((p: any) => 'row' in p && p.sheet !== -1)
    .map((p: any) => ({ row: p.row, col: p.col, label: describe(p.row, p.col), value: engine.getValue({ row: p.row, col: p.col }) }));

  const usedConstants = constants.filter(c => new RegExp(`\\b${c.name}\\b`).test(formula));

  const result = engine.getValue({ row: selected.row, col: selected.col });
  const { text: resultText } = formatCellDisplay(result, 'number');

  return (
    <>
      <div className={styles.drawerBackdrop} onClick={onClose} />
      <div className={styles.drawer} style={{ width: 380 }}>
        <div className={styles.drawerHeader}>
          <div className={styles.drawerTitle}>Formula Inspector</div>
          <button className={styles.drawerCloseBtn} onClick={onClose}><X size={18} /></button>
        </div>
        <div className={styles.drawerBody}>
          <div className={styles.fieldLabel}>Formula</div>
          <div className={styles.inspectorFormula}>{formula}</div>

          <div className={styles.fieldLabel} style={{ marginTop: 16 }}>Live result</div>
          <div style={{ fontFamily: 'var(--ct-font-mono)', fontSize: 15, color: 'var(--ct-accent-2)' }}>{resultText}</div>

          {usedConstants.length > 0 && (
            <>
              <div className={styles.fieldLabel} style={{ marginTop: 16 }}>Constants used</div>
              <div className={styles.chipRow}>
                {usedConstants.map(c => <span key={c._id} className={styles.chip}>{c.name} = {c.value}</span>)}
              </div>
            </>
          )}

          <div className={styles.fieldLabel} style={{ marginTop: 16 }}>Depends on</div>
          <div className={styles.chipRow}>
            {precedents.length === 0 && usedConstants.length === 0 && <span style={{ fontSize: 12, color: 'var(--ct-text-dim)' }}>Nothing</span>}
            {precedents.map((p, i) => (
              <span key={i} className={styles.chip} onClick={() => select(p.row, p.col)}>
                {p.label} → {formatCellDisplay(p.value, 'number').text}
              </span>
            ))}
          </div>

          <div className={styles.fieldLabel} style={{ marginTop: 16 }}>Feeds into</div>
          <div className={styles.chipRow}>
            {dependents.length === 0 && <span style={{ fontSize: 12, color: 'var(--ct-text-dim)' }}>Nothing</span>}
            {dependents.map((p, i) => (
              <span key={i} className={styles.chip} onClick={() => select(p.row, p.col)}>
                {p.label} → {formatCellDisplay(p.value, 'number').text}
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
