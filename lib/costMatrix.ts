import { engineColLetter } from '@/lib/costEngine';

// Engine col 0 = product name, col 1 = qty, col 2..(1+N) = expense columns,
// then virtual Batch Total / Cost per Unit / Sell Price / Margin %. Contractual — shared
// by the client store and every server route that needs to compute costs (snapshots, export).
export interface ColumnOffsets {
  qtyCol: number;
  firstExpenseCol: number;
  lastExpenseCol: number;
  batchTotalCol: number;
  costUnitCol: number;
  sellPriceCol: number;
  marginCol: number;
}

export function getColumnOffsets(columnCount: number): ColumnOffsets {
  return {
    qtyCol: 1,
    firstExpenseCol: 2,
    lastExpenseCol: 1 + columnCount,
    batchTotalCol: 2 + columnCount,
    costUnitCol: 3 + columnCount,
    sellPriceCol: 4 + columnCount,
    marginCol: 5 + columnCount,
  };
}

export interface MatrixProduct { _id: string; name: string; batchQty: number; sellingPrice: number; }
export interface MatrixColumn { _id: string; }

export function buildCostMatrix(
  products: MatrixProduct[],
  columns: MatrixColumn[],
  cellMap: Record<string, string>,
  totalOverrides: Record<string, string>,
): (string | number | null)[][] {
  const offsets = getColumnOffsets(columns.length);
  const header = ['Product', 'Qty', ...columns.map(() => ''), 'Batch Total', 'Cost/Unit', 'Sell Price', 'Margin %'];

  const rows = products.map((p, pi) => {
    const sheetRow = pi + 2; // 1-based sheet row; header occupies row 1
    const expenseCells = columns.map(c => {
      const raw = cellMap[`${p._id}:${c._id}`] ?? '';
      if (raw === '') return null;
      if (raw.startsWith('=')) return raw;
      const num = Number(raw);
      return Number.isNaN(num) ? raw : num;
    });

    const qtyLetter = engineColLetter(offsets.qtyCol);
    const batchLetter = engineColLetter(offsets.batchTotalCol);
    const costLetter = engineColLetter(offsets.costUnitCol);
    const sellLetter = engineColLetter(offsets.sellPriceCol);

    const override = totalOverrides[p._id];
    const batchFormula: string | number = override
      ? override
      : columns.length === 0
        ? 0
        : `=SUM(${engineColLetter(offsets.firstExpenseCol)}${sheetRow}:${engineColLetter(offsets.lastExpenseCol)}${sheetRow})`;

    const costFormula = `=IF(${qtyLetter}${sheetRow}=0,0,${batchLetter}${sheetRow}/${qtyLetter}${sheetRow})`;
    const marginFormula = `=IF(${sellLetter}${sheetRow}=0,0,(${sellLetter}${sheetRow}-${costLetter}${sheetRow})/${sellLetter}${sheetRow})`;

    return [p.name, p.batchQty, ...expenseCells, batchFormula, costFormula, p.sellingPrice, marginFormula];
  });

  return [header, ...rows];
}
