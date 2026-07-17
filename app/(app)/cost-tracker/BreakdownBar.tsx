'use client';
import { useCostGridStore, type CostColumnLite } from '@/store/costGridStore';
import { getColumnOffsets } from '@/lib/costMatrix';
import { formatINR } from '@/lib/currency';

export default function BreakdownBar({ productIndex, columns, styles }: {
  productIndex: number;
  columns: CostColumnLite[];
  styles: Record<string, string>;
}) {
  const engine = useCostGridStore(s => s.engine);
  useCostGridStore(s => s.recalcVersion);
  const offsets = getColumnOffsets(columns.length);
  const row = productIndex + 1;

  const values = columns.map((c, ci) => {
    const v = engine.getValue({ row, col: offsets.firstExpenseCol + ci });
    return { column: c, value: typeof v === 'number' ? v : 0 };
  });
  const total = values.reduce((sum, v) => sum + Math.max(0, v.value), 0);

  return (
    <tr className={styles.breakdownRow}>
      <td colSpan={columns.length + 4}>
        {total > 0 ? (
          <>
            <div className={styles.breakdownBar}>
              {values.filter(v => v.value > 0).map(v => (
                <div key={v.column._id} className={styles.breakdownSeg} style={{ width: `${(v.value / total) * 100}%`, background: v.column.color }} title={`${v.column.label}: ${formatINR(v.value)}`} />
              ))}
            </div>
            <div className={styles.breakdownLegend}>
              {values.filter(v => v.value > 0).map(v => (
                <span key={v.column._id}>
                  <span className={styles.breakdownSwatch} style={{ background: v.column.color }} />
                  {v.column.label} {((v.value / total) * 100).toFixed(0)}%
                </span>
              ))}
            </div>
          </>
        ) : (
          <span style={{ fontSize: 11.5, color: 'var(--ct-text-dim)' }}>No expenses entered yet</span>
        )}
      </td>
    </tr>
  );
}
