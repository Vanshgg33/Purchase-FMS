import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import PurchaseOrder from '@/models/PurchaseOrder';
import * as XLSX from 'xlsx';
import { toIST } from '@/lib/dates';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== 'SUPERADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const url = new URL(req.url);
  const type = url.searchParams.get('type') || 'po-register';
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  const dateFilter: any = {};
  if (from) dateFilter.$gte = new Date(from);
  if (to) dateFilter.$lte = new Date(to + 'T23:59:59');

  const query: any = {};
  if (Object.keys(dateFilter).length) query.createdAt = dateFilter;
  if (type === 'discrepancy') query['receiving.hasDiscrepancy'] = true;

  const pos = await PurchaseOrder.find(query).sort({ createdAt: -1 }).lean();

  let rows: any[] = [];

  if (type === 'po-register') {
    rows = pos.map(po => ({
      'PO Number': po.poNumber,
      'Status': po.status,
      'Requested By': po.requestedByName,
      'Request Date': toIST(po.requestedAt),
      'Materials': po.materials.map((m: any) => `${m.name} (${m.orderedQty || m.requestedQty} KG)`).join(', '),
      'Vendor': po.vendor?.name || '-',
      'PO Created By': po.poCreatedByName || '-',
      'PO Created Date': po.poCreatedAt ? toIST(po.poCreatedAt) : '-',
      'Approved By': po.approval?.decidedByName || '-',
      'Approval Date': po.approval?.decidedAt ? toIST(po.approval.decidedAt) : '-',
      'Expected Delivery': po.deadlines?.deliveryDeadline ? toIST(po.deadlines.deliveryDeadline) : '-',
      'Received By': po.receiving?.receivedByName || '-',
      'Received Date': po.receiving?.receivedAt ? toIST(po.receiving.receivedAt) : '-',
      'Discrepancy': po.receiving?.hasDiscrepancy ? 'Yes' : 'No',
    }));
  } else if (type === 'discrepancy') {
    rows = pos.flatMap(po =>
      po.materials.filter((m: any) => m.differenceQty !== 0 && m.differenceQty != null).map((m: any) => ({
        'PO Number': po.poNumber,
        'Material': m.name,
        'Ordered KG': m.orderedQty || m.requestedQty,
        'Received KG': m.receivedQty || 0,
        'Difference KG': m.differenceQty || 0,
        'Vendor': po.vendor?.name || '-',
        'Received Date': po.receiving?.receivedAt ? toIST(po.receiving.receivedAt) : '-',
        'Condition': po.receiving?.conditionRemark || '-',
      }))
    );
  } else if (type === 'delay') {
    rows = pos.filter(po => po.deadlines?.deliveryDeadline && po.receiving?.receivedAt && new Date(po.receiving.receivedAt) > new Date(po.deadlines.deliveryDeadline))
      .map(po => ({
        'PO Number': po.poNumber,
        'Vendor': po.vendor?.name || '-',
        'Expected Delivery': toIST(po.deadlines.deliveryDeadline!),
        'Actual Received': toIST(po.receiving!.receivedAt!),
        'Delay Days': Math.ceil((new Date(po.receiving!.receivedAt!).getTime() - new Date(po.deadlines.deliveryDeadline!).getTime()) / 86400000),
        'Materials': po.materials.map((m: any) => `${m.name} (${m.orderedQty || m.requestedQty} KG)`).join(', '),
      }));
  }

  if (rows.length === 0) rows = [{ 'No data': 'No records found for the selected criteria' }];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, type.toUpperCase());
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${type}-${new Date().toISOString().split('T')[0]}.xlsx"`,
    },
  });
}
