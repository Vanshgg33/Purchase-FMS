import { NextRequest, NextResponse } from 'next/server';
import { requireCostAdmin } from '@/lib/costAuth';
import { isPinAdmin } from '@/lib/costPinAuth';
import { connectDB } from '@/lib/mongodb';
import CostSetting from '@/models/CostSetting';
import { settingsUpdateSchema } from '@/lib/costValidators';

const DEFAULTS: Record<string, string> = { marginThreshold: '20' };

export async function GET() {
  const session = await requireCostAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const rows = await CostSetting.find().lean();
  const settings = { ...DEFAULTS };
  for (const r of rows) settings[r.key] = r.value;
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  const session = await requireCostAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = await isPinAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Superadmin PIN required' }, { status: 403 });

  const parsed = settingsUpdateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  await connectDB();
  if (parsed.data.marginThreshold !== undefined) {
    await CostSetting.findOneAndUpdate(
      { key: 'marginThreshold' },
      { value: String(parsed.data.marginThreshold) },
      { upsert: true },
    );
  }
  const rows = await CostSetting.find().lean();
  const settings = { ...DEFAULTS };
  for (const r of rows) settings[r.key] = r.value;
  return NextResponse.json({ settings });
}
