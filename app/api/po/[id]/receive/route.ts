import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import PurchaseOrder from '@/models/PurchaseOrder';
import { notifyByRole } from '@/lib/notifications';
import { sendEmailToRoles } from '@/lib/mailer';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || !['RECEIVER', 'SUPERADMIN'].includes(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const po = await PurchaseOrder.findById(id);
  if (!po) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (po.status !== 'BILL_UPLOADED') return NextResponse.json({ error: 'PO not ready for GRN' }, { status: 400 });

  const { materials, conditionRemark, physicalBillUrl, physicalBillType } = await req.json();

  let hasDiscrepancy = false;
  const updatedMaterials = po.materials.map((m: any, i: number) => {
    const received = materials[i];
    const receivedQty = Number(received?.receivedQty) || 0;
    const orderedQty = m.orderedQty || m.requestedQty;
    const differenceQty = receivedQty - orderedQty;
    if (differenceQty !== 0) hasDiscrepancy = true;
    return { ...m.toObject(), receivedQty, differenceQty };
  });

  po.materials = updatedMaterials;
  po.receiving = { receivedBy: user.userId, receivedByName: user.name, receivedAt: new Date(), conditionRemark, hasDiscrepancy };
  if (physicalBillUrl) {
    po.physicalBill = { fileUrl: physicalBillUrl, fileType: physicalBillType, label: 'Physical Bill', uploadedBy: user.name, uploadedAt: new Date() };
  }
  po.status = 'RECEIVED';
  po.timeline.push({ action: 'RECEIVED', byUserId: user.userId, byName: user.name, at: new Date(), note: conditionRemark || (hasDiscrepancy ? 'Discrepancy found' : 'Received as ordered') });
  po.status = 'CLOSED';
  po.timeline.push({ action: 'CLOSED', byUserId: 'system', byName: 'System', at: new Date(), note: 'Cycle complete' });
  await po.save();

  const matList = po.materials.map((m: any) => ({ name: m.name, requestedQty: m.receivedQty }));
  const discNote = hasDiscrepancy ? 'DISCREPANCY FOUND — check quantities' : undefined;
  const subject = `${po.poNumber} RECEIVED — ${hasDiscrepancy ? 'discrepancy found' : 'complete'}`;

  Promise.all([
    notifyByRole(['REQUESTER', 'PO_CREATOR', 'APPROVER', 'SUPERADMIN'], 'Material Received', `${po.poNumber} GRN complete${hasDiscrepancy ? ' — with discrepancy' : ''}`, po.poNumber),
    sendEmailToRoles(['REQUESTER', 'PO_CREATOR', 'APPROVER', 'SUPERADMIN'], subject, po.poNumber, 'RECEIVED', user.name, matList, undefined, discNote),
  ]).catch(console.error);

  return NextResponse.json({ success: true });
}
