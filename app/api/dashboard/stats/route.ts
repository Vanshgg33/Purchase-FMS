import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import PurchaseOrder from '@/models/PurchaseOrder';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [openRequests, awaitingApproval, withVendor, arrivingSoon, completedThisMonth, all] = await Promise.all([
    PurchaseOrder.countDocuments({ status: 'REQUESTED' }),
    PurchaseOrder.countDocuments({ status: 'PO_CREATED' }),
    PurchaseOrder.countDocuments({ status: { $in: ['SENT_TO_VENDOR', 'BILL_UPLOADED'] } }),
    PurchaseOrder.countDocuments({ status: 'BILL_UPLOADED' }),
    PurchaseOrder.countDocuments({ status: 'CLOSED', updatedAt: { $gte: startOfMonth } }),
    PurchaseOrder.find({ status: { $in: ['REQUESTED', 'PO_CREATED', 'APPROVED', 'SENT_TO_VENDOR', 'BILL_UPLOADED'] } }, 'deadlines.neededBy deadlines.deliveryDeadline'),
  ]);

  const overdue = all.filter(po => {
    const d = po.deadlines?.deliveryDeadline || po.deadlines?.neededBy;
    return d && new Date(d) < now;
  }).length;

  return NextResponse.json({ openRequests, awaitingApproval, withVendor, arrivingSoon, overdue, completedThisMonth });
}
