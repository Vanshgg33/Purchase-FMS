import { NextRequest, NextResponse } from 'next/server';
import { requireCostAdmin } from '@/lib/costAuth';
import { isPinAdmin } from '@/lib/costPinAuth';
import { connectDB } from '@/lib/mongodb';
import CostConstant from '@/models/CostConstant';
import { constantCreateSchema } from '@/lib/costValidators';
import { CostEngine, isValidConstantName } from '@/lib/costEngine';

export async function GET() {
  const session = await requireCostAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const constants = await CostConstant.find().sort({ name: 1 }).lean();
  return NextResponse.json({ constants });
}

export async function POST(req: NextRequest) {
  const session = await requireCostAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = await isPinAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Superadmin PIN required' }, { status: 403 });

  const parsed = constantCreateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const engine = new CostEngine();
  const valid = isValidConstantName(parsed.data.name, engine);
  engine.destroy();
  if (!valid) return NextResponse.json({ error: 'Name must be UPPER_SNAKE_CASE and not clash with a formula function name' }, { status: 400 });

  await connectDB();
  const existing = await CostConstant.findOne({ name: parsed.data.name });
  if (existing) return NextResponse.json({ error: 'A constant with this name already exists' }, { status: 409 });

  const constant = await CostConstant.create(parsed.data);
  return NextResponse.json({ constant });
}
