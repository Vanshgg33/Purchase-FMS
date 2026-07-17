import { NextRequest, NextResponse } from 'next/server';
import { requireCostAdmin } from '@/lib/costAuth';
import { connectDB } from '@/lib/mongodb';
import CostProduct from '@/models/CostProduct';
import CostProductPhoto from '@/models/CostProductPhoto';
import CostColumn from '@/models/CostColumn';
import CostCell from '@/models/CostCell';
import CostTotalOverride from '@/models/CostTotalOverride';
import CostConstant from '@/models/CostConstant';
import { CostEngine } from '@/lib/costEngine';
import { buildCostMatrix, getColumnOffsets } from '@/lib/costMatrix';

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const session = await requireCostAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();

  const format = new URL(req.url).searchParams.get('format') === 'json' ? 'json' : 'csv';
  const dateStr = new Date().toISOString().slice(0, 10);

  const [products, columns, cells, overrides, constants, photos] = await Promise.all([
    CostProduct.find().sort({ position: 1 }).lean(),
    CostColumn.find().sort({ position: 1 }).lean(),
    CostCell.find().lean(),
    CostTotalOverride.find().lean(),
    CostConstant.find().lean(),
    CostProductPhoto.find().lean(),
  ]);

  if (format === 'json') {
    const body = JSON.stringify({ exportedAt: new Date().toISOString(), products, columns, cells, totalOverrides: overrides, constants, photos }, null, 2);
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="cost-tracker_${dateStr}.json"`,
      },
    });
  }

  const cellMap: Record<string, string> = {};
  for (const c of cells) cellMap[`${c.productId}:${c.columnId}`] = c.rawValue;
  const totalOverrides: Record<string, string> = {};
  for (const o of overrides) totalOverrides[o.productId] = o.formula;

  const engine = new CostEngine();
  engine.registerConstants(constants.map(c => ({ name: c.name, value: c.value })));
  const matrix = buildCostMatrix(
    products.map(p => ({ _id: p._id.toString(), name: p.name, batchQty: p.batchQty, sellingPrice: p.sellingPrice })),
    columns.map(c => ({ _id: c._id.toString() })),
    cellMap,
    totalOverrides,
  );
  engine.hydrate(matrix);
  const offsets = getColumnOffsets(columns.length);

  const header = ['Product', 'SKU', 'Unit', 'Qty', ...columns.map(c => c.label), 'Batch Total', 'Cost/Unit', 'Sell Price', 'Margin %'];
  const lines = [header.map(csvCell).join(',')];

  products.forEach((p, pi) => {
    const row = pi + 1;
    const expenseValues = columns.map((_, ci) => {
      const v = engine.getValue({ row, col: offsets.firstExpenseCol + ci });
      return typeof v === 'number' ? v : (v ?? '');
    });
    const batchTotal = engine.getValue({ row, col: offsets.batchTotalCol });
    const costUnit = engine.getValue({ row, col: offsets.costUnitCol });
    const margin = engine.getValue({ row, col: offsets.marginCol });
    const marginPct = typeof margin === 'number' ? (margin * 100).toFixed(2) + '%' : margin;

    lines.push([
      p.name, p.sku || '', p.unit, p.batchQty,
      ...expenseValues,
      batchTotal, costUnit, p.sellingPrice, marginPct,
    ].map(csvCell).join(','));
  });
  engine.destroy();

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="cost-tracker_${dateStr}.csv"`,
    },
  });
}
