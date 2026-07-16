import { NextRequest, NextResponse } from 'next/server';
import { requireCostAdmin } from '@/lib/costAuth';
import { connectDB } from '@/lib/mongodb';
import CostColumn from '@/models/CostColumn';
import CostCell from '@/models/CostCell';
import { columnUpdateSchema } from '@/lib/costValidators';
import { engineColLetter } from '@/lib/costEngine';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireCostAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = columnUpdateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  await connectDB();
  const { id } = await params;
  const column = await CostColumn.findByIdAndUpdate(id, parsed.data, { new: true });
  if (!column) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ column });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireCostAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const force = new URL(req.url).searchParams.get('force') === 'true';

  const columns = await CostColumn.find().sort({ position: 1 }).lean();
  const idx = columns.findIndex(c => c._id.toString() === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (!force) {
    // engine col 0 = product name, col 1..N = expense columns in position order
    const letter = engineColLetter(idx + 1);
    const refPattern = new RegExp(`\\b${letter}\\d+\\b`);
    const candidates = await CostCell.find({
      columnId: { $ne: id },
      rawValue: { $regex: '^=' },
    }).lean();
    const affected = candidates
      .filter(c => refPattern.test(c.rawValue))
      .map(c => ({ productId: c.productId, columnId: c.columnId, rawValue: c.rawValue }));
    if (affected.length > 0) {
      return NextResponse.json({ error: 'Column referenced by formulas', affected }, { status: 409 });
    }
  }

  await CostCell.deleteMany({ columnId: id });
  await CostColumn.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
