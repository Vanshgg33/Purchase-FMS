const QTY_COL = 1;
const BASE_AMOUNT_COL = 2;
const FIRST_EXPENSE_COL = 3;

function colLetter(col: number): string {
  let result = '';
  let n = col + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

export function getColumnOffsets(columnCount: number) {
  return {
    qtyCol: QTY_COL,
    baseAmountCol: BASE_AMOUNT_COL,
    firstExpenseCol: FIRST_EXPENSE_COL,
    totalCol: FIRST_EXPENSE_COL + columnCount,
    sellPriceCol: FIRST_EXPENSE_COL + columnCount + 1,
  };
}

export function buildCostMatrix(
  products: { _id: string; name: string; batchQty: number; baseAmount: number; sellingPrice: number }[],
  columns: { _id: string }[],
  cellMap: Record<string, string>,
  totalOverrides: Record<string, string>,
): (string | number | null)[][] {
  const N = columns.length;
  const totalColIdx = FIRST_EXPENSE_COL + N;
  const sellPriceColIdx = totalColIdx + 1;
  const rowWidth = sellPriceColIdx + 1;

  const header: (string | number | null)[] = [
    'Name', 'Qty', 'Base',
    ...columns.map((_, i) => `Col${i + 1}`),
    'Total', 'SellPrice',
  ];

  const rows: (string | number | null)[][] = [header];

  for (let pi = 0; pi < products.length; pi++) {
    const product = products[pi];
    const spreadsheetRow = pi + 2; // row 0 is header (row 1 in A1); product rows start at A1 row 2
    const row: (string | number | null)[] = new Array(rowWidth).fill(null);

    row[0] = product.name;
    row[QTY_COL] = product.batchQty;
    row[BASE_AMOUNT_COL] = product.baseAmount;

    for (let ci = 0; ci < N; ci++) {
      const key = `${product._id}:${columns[ci]._id}`;
      row[FIRST_EXPENSE_COL + ci] = cellMap[key] ?? null;
    }

    if (totalOverrides[product._id]) {
      row[totalColIdx] = totalOverrides[product._id];
    } else if (N > 0) {
      const baseRef = `${colLetter(BASE_AMOUNT_COL)}${spreadsheetRow}`;
      const firstExp = `${colLetter(FIRST_EXPENSE_COL)}${spreadsheetRow}`;
      const lastExp = `${colLetter(FIRST_EXPENSE_COL + N - 1)}${spreadsheetRow}`;
      row[totalColIdx] = `=${baseRef}+SUM(${firstExp}:${lastExp})`;
    } else {
      row[totalColIdx] = `=${colLetter(BASE_AMOUNT_COL)}${spreadsheetRow}`;
    }

    row[sellPriceColIdx] = product.sellingPrice;
    rows.push(row);
  }

  return rows;
}
