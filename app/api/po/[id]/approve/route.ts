import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import PurchaseOrder from '@/models/PurchaseOrder';
import { notifyByRole } from '@/lib/notifications';
import { sendEmailToRoles } from '@/lib/mailer';
import { toISTDate } from '@/lib/dates';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || !['APPROVER', 'SUPERADMIN'].includes(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const po = await PurchaseOrder.findById(id);
  if (!po) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (po.status !== 'PO_CREATED') return NextResponse.json({ error: 'PO not in PO_CREATED state' }, { status: 400 });

  const { decision, rejectionReason } = await req.json();
  if (!['APPROVED', 'REJECTED'].includes(decision)) return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });

  po.approval = { decidedBy: user.userId, decidedByName: user.name, decidedAt: new Date(), decision, rejectionReason };
  po.status = decision === 'APPROVED' ? 'SENT_TO_VENDOR' : 'REJECTED';
  po.timeline.push({ action: decision, byUserId: user.userId, byName: user.name, at: new Date(), note: rejectionReason || undefined });
  await po.save();

  const matList = po.materials.map((m: any) => ({ name: m.name, requestedQty: m.orderedQty || m.requestedQty }));
  const delivery = po.deadlines?.deliveryDeadline ? toISTDate(po.deadlines.deliveryDeadline) : undefined;

  if (decision === 'APPROVED') {
    const subject = `${po.poNumber} APPROVED — sent to vendor ${po.vendor?.name}`;
    Promise.all([
      notifyByRole(['REQUESTER', 'PO_CREATOR', 'RECEIVER', 'SUPERADMIN'], 'PO Approved', `${po.poNumber} approved. Sent to ${po.vendor?.name}`, po.poNumber),
      sendEmailToRoles(['REQUESTER', 'PO_CREATOR', 'RECEIVER', 'SUPERADMIN'], subject, po.poNumber, 'APPROVED', user.name, matList, delivery),
    ]).catch(console.error);
  } else {
    const subject = `${po.poNumber} REJECTED — reason inside`;
    Promise.all([
      notifyByRole(['PO_CREATOR', 'REQUESTER', 'SUPERADMIN'], 'PO Rejected', `${po.poNumber} rejected: ${rejectionReason}`, po.poNumber),
      sendEmailToRoles(['PO_CREATOR', 'REQUESTER', 'SUPERADMIN'], subject, po.poNumber, 'REJECTED', user.name, matList, delivery, rejectionReason),
    ]).catch(console.error);
  }

  return NextResponse.json({ success: true, status: po.status });
}
