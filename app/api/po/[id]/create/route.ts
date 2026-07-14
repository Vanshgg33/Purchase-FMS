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
  if (!user || !['PO_CREATOR', 'SUPERADMIN'].includes(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const po = await PurchaseOrder.findById(id);
  if (!po) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!['REQUESTED', 'REJECTED'].includes(po.status)) return NextResponse.json({ error: 'PO cannot be processed in its current state' }, { status: 400 });

  const { vendorId, vendorName, vendorPhone, materials, expectedDelivery } = await req.json();
  if (!vendorId || !vendorName) return NextResponse.json({ error: 'Vendor is required' }, { status: 400 });
  if (!materials?.length) return NextResponse.json({ error: 'Materials are required' }, { status: 400 });

  const wasRejected = po.status === 'REJECTED';
  po.status = 'PO_CREATED';
  po.vendor = { vendorId, name: vendorName, phone: vendorPhone };
  po.poCreatedBy = user.userId;
  po.poCreatedByName = user.name;
  po.poCreatedAt = new Date();
  po.approval = {};
  po.materials = materials.map((m: any) => ({ ...m, orderedQty: Number(m.orderedQty), expectedRate: Number(m.expectedRate) || 0 }));
  if (expectedDelivery) po.deadlines.deliveryDeadline = new Date(expectedDelivery);
  po.timeline.push({ action: 'PO_CREATED', byUserId: user.userId, byName: user.name, at: new Date(), note: `${wasRejected ? 'Re-submitted. ' : ''}Vendor: ${vendorName}` });
  await po.save();

  const matList = po.materials.map((m: any) => ({ name: m.name, requestedQty: m.orderedQty || m.requestedQty }));
  const subject = `${po.poNumber} created — awaiting approval`;

  Promise.all([
    notifyByRole(['APPROVER', 'SUPERADMIN'], 'PO Ready for Approval', `${po.poNumber} from ${vendorName} needs your approval`, po.poNumber),
    sendEmailToRoles(['APPROVER', 'REQUESTER', 'SUPERADMIN'], subject, po.poNumber, 'PO_CREATED', user.name, matList, expectedDelivery ? toISTDate(expectedDelivery) : undefined),
  ]).catch(console.error);

  return NextResponse.json({ poNumber: po.poNumber });
}
