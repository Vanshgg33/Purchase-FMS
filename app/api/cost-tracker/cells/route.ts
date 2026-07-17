import { NextRequest, NextResponse } from 'next/server';
import { requireCostAdmin } from '@/lib/costAuth';
import { isPinAdmin } from '@/lib/costPinAuth';
import { connectDB } from '@/lib/mongodb';
import CostCell from '@/models/CostCell';
import CostColumn from '@/models/CostColumn';
import CostConstant from '@/models/CostConstant';
import { cellBatchSchema } from '@/lib/costValidators';
import { CostEngine } from '@/lib/costEngine';

export async function PUT(req: NextRequest) {
  const session = await requireCostAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = cellBatchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  await connectDB();

  // NON-NEGOTIABLE: fetch target columns and reject the ENTIRE batch if any belong to a
  // locked column and the caller isn't PIN-unlocked. Never partially apply a batch.
  const columnIds = [...new Set(parsed.data.cells.map(c => c.columnId))];
  const columns = await CostColumn.find({ _id: { $in: columnIds } }).lean();
  const columnById = new Map(columns.map(c => [c._id.toString(), c]));

  const lockedTargets = parsed.data.cells
    .map(c => columnById.get(c.columnId))
    .filter((c): c is NonNullable<typeof c> => !!c && c.locked);

  if (lockedTargets.length > 0) {
    const admin = await isPinAdmin(req);
    if (!admin) {
      const labels = [...new Set(lockedTargets.map(c => c.label))];
      return NextResponse.json({ error: 'Locked — superadmin only', lockedColumns: labels }, { status: 403 });
    }
  }

  // server-side formula re-validation, constants-aware — the backend never persists garbage
  const constants = await CostConstant.find().lean();
  const engine = new CostEngine();
  engine.registerConstants(constants.map(c => ({ name: c.name, value: c.value })));
  for (const cell of parsed.data.cells) {
    if (cell.rawValue.startsWith('=') && !engine.validateFormula(cell.rawValue)) {
      engine.destroy();
      return NextResponse.json({ error: `Invalid formula: ${cell.rawValue}` }, { status: 400 });
    }
  }
  engine.destroy();

  const ops = parsed.data.cells.map(c => {
    const set: Record<string, unknown> = { rawValue: c.rawValue };
    const unset: Record<string, ''> = {};
    if (c.note !== undefined) {
      if (c.note === null || c.note === '') unset.note = '';
      else set.note = c.note;
    }
    const update: Record<string, unknown> = { $set: set };
    if (Object.keys(unset).length) update.$unset = unset;
    return { updateOne: { filter: { productId: c.productId, columnId: c.columnId }, update, upsert: true } };
  });
  await CostCell.bulkWrite(ops);
  return NextResponse.json({ success: true });
}
