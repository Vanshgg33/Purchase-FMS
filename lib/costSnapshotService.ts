import CostProduct from '@/models/CostProduct';
import CostColumn from '@/models/CostColumn';
import CostCell from '@/models/CostCell';
import CostTotalOverride from '@/models/CostTotalOverride';
import CostConstant from '@/models/CostConstant';
import CostSnapshot from '@/models/CostSnapshot';
import { CostEngine } from '@/lib/costEngine';
import { buildCostMatrix, getColumnOffsets } from '@/lib/costMatrix';

export function istDateString(d: Date = new Date()) {
  return new Date(d.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export async function computeAllCosts() {
  const [products, columns, cells, overrides, constants] = await Promise.all([
    CostProduct.find().sort({ position: 1 }).lean(),
    CostColumn.find().sort({ position: 1 }).lean(),
    CostCell.find().lean(),
    CostTotalOverride.find().lean(),
    CostConstant.find().lean(),
  ]);

  const cellMap: Record<string, string> = {};
  for (const c of cells) cellMap[`${c.productId}:${c.columnId}`] = c.rawValue;
  const totalOverrides: Record<string, string> = {};
  for (const o of overrides) totalOverrides[o.productId] = o.formula;

  const engine = new CostEngine();
  engine.registerConstants(constants.map(c => ({ name: c.name, value: c.value })));
  const matrix = buildCostMatrix(
    products.map(p => ({ _id: p._id.toString(), name: p.name, batchQty: p.batchQty, baseAmount: p.baseAmount, sellingPrice: p.sellingPrice })),
    columns.map(c => ({ _id: c._id.toString() })),
    cellMap,
    totalOverrides,
  );
  engine.hydrate(matrix);

  const offsets = getColumnOffsets(columns.length);
  const results = products.map((p, pi) => {
    const row = pi + 1; // 0-based engine row (header = row 0)
    const batchTotal = Number(engine.getValue({ row, col: offsets.batchTotalCol })) || 0;
    const costPerUnit = Number(engine.getValue({ row, col: offsets.costUnitCol })) || 0;
    const marginPct = Number(engine.getValue({ row, col: offsets.marginCol })) || 0;
    return { productId: p._id, batchTotal, costPerUnit, sellingPrice: p.sellingPrice, marginPct };
  });
  engine.destroy();
  return results;
}

/** Snapshots once per IST calendar day. Safe to call on every page load — no-ops if already done today. */
export async function ensureDailySnapshot(): Promise<void> {
  const latest = await CostSnapshot.findOne().sort({ date: -1 }).lean();
  if (latest && istDateString(latest.date) === istDateString()) return;

  const results = await computeAllCosts();
  if (results.length === 0) return;
  await CostSnapshot.insertMany(results.map(r => ({ ...r, date: new Date() })));
}
