import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireCapability } from '@/lib/permissions';
import { ctRoute } from '@/lib/costApi';
import { writeAudit } from '@/lib/costAudit';
import { AppError } from '@/lib/costErrors';
import CtVendor from '@/models/CtVendor';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return ctRoute(async () => {
    const session = await requireCapability('MANAGE_MASTERS');
    await connectDB();
    const { id } = await params;
    const body = await req.json();
    const vendor = await CtVendor.findById(id);
    if (!vendor) throw new AppError('NOT_FOUND', 'Vendor not found');

    const before = vendor.toObject();
    for (const key of ['name', 'gstin', 'phone', 'city', 'state', 'paymentTerms', 'isActive'] as const) {
      if (body[key] !== undefined) (vendor as any)[key] = body[key];
    }
    await vendor.save();
    await writeAudit({
      entity: 'CtVendor', entityId: id, action: 'UPDATE', session,
      changes: { before: { before }, after: { after: vendor.toObject() } } as any,
    });
    return vendor.toObject();
  });
}
