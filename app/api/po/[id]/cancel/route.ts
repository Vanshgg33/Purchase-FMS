import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import PurchaseOrder from '@/models/PurchaseOrder';

const CANCELLABLE = ['REQUESTED', 'PO_CREATED', 'REJECTED'];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || !['PO_CREATOR', 'SUPERADMIN'].includes(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const po = await PurchaseOrder.findById(id);
  if (!po) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!CANCELLABLE.includes(po.status)) return NextResponse.json({ error: `Cannot cancel a PO with status ${po.status}` }, { status: 400 });

  const { reason } = await req.json();
  po.status = 'CANCELLED';
  po.timeline.push({ action: 'CANCELLED', byUserId: user.userId, byName: user.name, at: new Date(), note: reason || 'Cancelled' });
  await po.save();

  return NextResponse.json({ success: true });
}
