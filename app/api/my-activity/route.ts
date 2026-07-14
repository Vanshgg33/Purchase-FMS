import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import PurchaseOrder from '@/models/PurchaseOrder';

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const pos = await PurchaseOrder.find({ 'timeline.byUserId': user.userId }, 'poNumber timeline').sort({ updatedAt: -1 }).limit(200).lean();

  const entries: any[] = [];
  pos.forEach(po => {
    po.timeline?.filter((t: any) => t.byUserId === user.userId).forEach((t: any) => {
      entries.push({ ...t, poNumber: po.poNumber });
    });
  });

  entries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return NextResponse.json({ entries });
}
