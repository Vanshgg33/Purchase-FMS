import { NextRequest, NextResponse } from 'next/server';
import { requireCostAdmin } from '@/lib/costAuth';
import { isPinAdmin } from '@/lib/costPinAuth';
import { connectDB } from '@/lib/mongodb';
import CostConstant from '@/models/CostConstant';
import CostCell from '@/models/CostCell';
import CostTotalOverride from '@/models/CostTotalOverride';
import { constantUpdateSchema } from '@/lib/costValidators';
import { CostEngine, isValidConstantName } from '@/lib/costEngine';

async function findFormulasReferencing(name: string) {
  const pattern = new RegExp(`\\b${name}\\b`);
  const [cells, overrides] = await Promise.all([
    CostCell.find({ rawValue: { $regex: '^=' } }).lean(),
    CostTotalOverride.find().lean(),
  ]);
  const affectedCells = cells.filter(c => pattern.test(c.rawValue)).map(c => ({ productId: c.productId, columnId: c.columnId, rawValue: c.rawValue }));
  const affectedOverrides = overrides.filter(o => pattern.test(o.formula)).map(o => ({ productId: o.productId, formula: o.formula }));
  return { affectedCells, affectedOverrides };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireCostAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = await isPinAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Superadmin PIN required' }, { status: 403 });

  const body = await req.json();
  const force = body?.force === true;
  const parsed = constantUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  await connectDB();
  const { id } = await params;
  const constant = await CostConstant.findById(id);
  if (!constant) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (parsed.data.name && parsed.data.name !== constant.name) {
    const engine = new CostEngine();
    const valid = isValidConstantName(parsed.data.name, engine);
    engine.destroy();
    if (!valid) return NextResponse.json({ error: 'Invalid constant name' }, { status: 400 });

    const clash = await CostConstant.findOne({ name: parsed.data.name });
    if (clash) return NextResponse.json({ error: 'A constant with this name already exists' }, { status: 409 });

    if (!force) {
      const { affectedCells, affectedOverrides } = await findFormulasReferencing(constant.name);
      if (affectedCells.length > 0 || affectedOverrides.length > 0) {
        return NextResponse.json({ error: 'Constant referenced by formulas', affected: [...affectedCells, ...affectedOverrides] }, { status: 409 });
      }
    }
  }

  Object.assign(constant, parsed.data);
  await constant.save();
  return NextResponse.json({ constant: constant.toObject() });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireCostAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = await isPinAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Superadmin PIN required' }, { status: 403 });

  await connectDB();
  const { id } = await params;
  const force = new URL(req.url).searchParams.get('force') === 'true';
  const constant = await CostConstant.findById(id);
  if (!constant) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (!force) {
    const { affectedCells, affectedOverrides } = await findFormulasReferencing(constant.name);
    if (affectedCells.length > 0 || affectedOverrides.length > 0) {
      return NextResponse.json({ error: 'Constant referenced by formulas', affected: [...affectedCells, ...affectedOverrides] }, { status: 409 });
    }
  }

  await constant.deleteOne();
  return NextResponse.json({ success: true });
}
