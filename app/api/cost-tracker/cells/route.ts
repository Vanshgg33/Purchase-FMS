import { NextRequest, NextResponse } from 'next/server';
import { requireCostAdmin } from '@/lib/costAuth';
import { connectDB } from '@/lib/mongodb';
import CostCell from '@/models/CostCell';
import { cellBatchSchema } from '@/lib/costValidators';
import { CostEngine } from '@/lib/costEngine';

export async function PUT(req: NextRequest) {
  const session = await requireCostAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = cellBatchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  // the backend never persists garbage: re-validate every formula server-side
  const engine = new CostEngine();
  for (const cell of parsed.data.cells) {
    if (cell.rawValue.startsWith('=') && !engine.validateFormula(cell.rawValue)) {
      engine.destroy();
      return NextResponse.json({ error: `Invalid formula: ${cell.rawValue}` }, { status: 400 });
    }
  }
  engine.destroy();

  await connectDB();
  const ops = parsed.data.cells.map(c => ({
    updateOne: {
      filter: { productId: c.productId, columnId: c.columnId },
      update: { $set: { rawValue: c.rawValue } },
      upsert: true,
    },
  }));
  await CostCell.bulkWrite(ops);
  return NextResponse.json({ success: true });
}
