import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import PurchaseOrder from '@/models/PurchaseOrder';
import { getNextPONumber } from '@/models/Counter';
import { notifyByRole } from '@/lib/notifications';
import { sendEmailToRoles } from '@/lib/mailer';
import { toISTDate } from '@/lib/dates';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || !['REQUESTER', 'SUPERADMIN'].includes(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { materials, remark, neededBy } = body;

  if (!materials?.length) return NextResponse.json({ error: 'At least one material required' }, { status: 400 });
  for (const m of materials) {
    if (!m.materialId || !m.name || !m.requestedQty || m.requestedQty <= 0) {
      return NextResponse.json({ error: 'Invalid material data' }, { status: 400 });
    }
  }

  await connectDB();
  const poNumber = await getNextPONumber();

  const po = await PurchaseOrder.create({
    poNumber,
    status: 'REQUESTED',
    materials: materials.map((m: any) => ({ materialId: m.materialId, name: m.name, requestedQty: m.requestedQty })),
    requestRemark: remark,
    requestedBy: user.userId,
    requestedByName: user.name,
    requestedAt: new Date(),
    deadlines: { neededBy: neededBy ? new Date(neededBy) : undefined, stepDeadlines: [] },
    timeline: [{ action: 'REQUEST_CREATED', byUserId: user.userId, byName: user.name, at: new Date(), note: remark }],
    attachments: [],
    comments: [],
  });

  const matList = materials.map((m: any) => ({ name: m.name, requestedQty: m.requestedQty }));
  const subject = `New Material Request ${poNumber} — ${materials[0].name} ${materials[0].requestedQty} KG${neededBy ? ` (needed by ${toISTDate(neededBy)})` : ''}`;

  Promise.all([
    notifyByRole(['PO_CREATOR', 'SUPERADMIN'], 'New Material Request', `${poNumber} submitted by ${user.name}`, poNumber),
    sendEmailToRoles(['PO_CREATOR', 'SUPERADMIN'], subject, poNumber, 'REQUESTED', user.name, matList, neededBy ? toISTDate(neededBy) : undefined),
  ]).catch(console.error);

  return NextResponse.json({ poNumber, id: po._id });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const query = status ? { status } : {};
  const pos = await PurchaseOrder.find(query).sort({ createdAt: -1 }).limit(100).lean();
  return NextResponse.json({ pos });
}
