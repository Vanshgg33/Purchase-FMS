import { NextRequest, NextResponse } from 'next/server';
import { requireCostAdmin } from '@/lib/costAuth';
import { isPinAdmin } from '@/lib/costPinAuth';
import { connectDB } from '@/lib/mongodb';
import CostTotalOverride from '@/models/CostTotalOverride';
import CostConstant from '@/models/CostConstant';
import { totalOverrideSchema } from '@/lib/costValidators';
import { CostEngine } from '@/lib/costEngine';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireCostAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = totalOverrideSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  await connectDB();
  const constants = await CostConstant.find().lean();
  const engine = new CostEngine();
  engine.registerConstants(constants.map(c => ({ name: c.name, value: c.value })));
  const valid = engine.validateFormula(parsed.data.formula);
  engine.destroy();
  if (!valid) return NextResponse.json({ error: 'Invalid formula' }, { status: 400 });

  const { id } = await params;
  const override = await CostTotalOverride.findOneAndUpdate(
    { productId: id },
    { formula: parsed.data.formula },
    { upsert: true, new: true },
  );
  return NextResponse.json({ override });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireCostAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = await isPinAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Superadmin PIN required to reset to auto-sum' }, { status: 403 });

  await connectDB();
  const { id } = await params;
  await CostTotalOverride.deleteOne({ productId: id });
  return NextResponse.json({ success: true });
}
