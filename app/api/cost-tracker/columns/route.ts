import { NextRequest, NextResponse } from 'next/server';
import { requireCostAdmin } from '@/lib/costAuth';
import { connectDB } from '@/lib/mongodb';
import CostColumn from '@/models/CostColumn';
import { columnCreateSchema } from '@/lib/costValidators';

export async function GET() {
  const session = await requireCostAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const columns = await CostColumn.find().sort({ position: 1 }).lean();
  return NextResponse.json({ columns });
}

export async function POST(req: NextRequest) {
  const session = await requireCostAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = columnCreateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  await connectDB();
  const last = await CostColumn.findOne().sort({ position: -1 }).lean();
  const position = last ? (last as any).position + 1 : 0;
  const column = await CostColumn.create({ ...parsed.data, position });
  return NextResponse.json({ column });
}
