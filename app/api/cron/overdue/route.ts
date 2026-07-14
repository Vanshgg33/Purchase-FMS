import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import PurchaseOrder from '@/models/PurchaseOrder';
import { sendEmailToRoles } from '@/lib/mailer';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const now = new Date();

  const openPOs = await PurchaseOrder.find({
    status: { $nin: ['CLOSED', 'CANCELLED', 'REJECTED'] },
    'deadlines.deliveryDeadline': { $lt: now },
  });

  let count = 0;
  for (const po of openPOs) {
    const matList = po.materials.map((m: any) => ({ name: m.name, requestedQty: m.orderedQty || m.requestedQty }));
    const daysOverdue = Math.ceil((now.getTime() - new Date(po.deadlines.deliveryDeadline!).getTime()) / 86400000);
    await sendEmailToRoles(
      ['SUPERADMIN'],
      `OVERDUE: ${po.poNumber} pending ${po.status.replace('_', ' ')} for ${daysOverdue} day(s)`,
      po.poNumber, po.status, 'System', matList
    );
    count++;
  }

  return NextResponse.json({ processed: count, at: now.toISOString() });
}
