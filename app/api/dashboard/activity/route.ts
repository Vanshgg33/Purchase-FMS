import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import PurchaseOrder from '@/models/PurchaseOrder';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const pos = await PurchaseOrder.find({}, 'poNumber timeline').sort({ updatedAt: -1 }).limit(20).lean();

  const activity: any[] = [];
  pos.forEach(po => {
    if (po.timeline?.length) {
      const last = po.timeline[po.timeline.length - 1];
      activity.push({ ...last, poNumber: po.poNumber });
    }
  });

  activity.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return NextResponse.json({ activity: activity.slice(0, 15) });
}
