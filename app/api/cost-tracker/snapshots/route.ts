import { NextRequest, NextResponse } from 'next/server';
import { requireCostAdmin } from '@/lib/costAuth';
import { connectDB } from '@/lib/mongodb';
import CostSnapshot from '@/models/CostSnapshot';
import { computeAllCosts, ensureDailySnapshot } from '@/lib/costSnapshotService';

export async function GET(req: NextRequest) {
  const session = await requireCostAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const productId = new URL(req.url).searchParams.get('productId');
  if (!productId) return NextResponse.json({ error: 'productId is required' }, { status: 400 });
  const snapshots = await CostSnapshot.find({ productId }).sort({ date: 1 }).lean();
  return NextResponse.json({ snapshots });
}

export async function POST(req: NextRequest) {
  const session = await requireCostAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();

  const force = new URL(req.url).searchParams.get('force') === 'true';
  if (!force) {
    await ensureDailySnapshot();
    return NextResponse.json({ success: true });
  }

  const results = await computeAllCosts();
  if (results.length === 0) return NextResponse.json({ snapshots: [] });
  const now = new Date();
  const docs = await CostSnapshot.insertMany(results.map(r => ({ ...r, date: now })));
  return NextResponse.json({ snapshots: docs });
}
