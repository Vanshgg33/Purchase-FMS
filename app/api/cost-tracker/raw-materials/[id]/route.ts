import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireCapability } from '@/lib/permissions';
import { ctRoute } from '@/lib/costApi';
import { writeAudit } from '@/lib/costAudit';
import { AppError } from '@/lib/costErrors';
import CtRawMaterial from '@/models/CtRawMaterial';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return ctRoute(async () => {
    const session = await requireCapability('MANAGE_MASTERS');
    await connectDB();
    const { id } = await params;
    const body = await req.json();
    const material = await CtRawMaterial.findById(id);
    if (!material) throw new AppError('NOT_FOUND', 'Raw material not found');

    for (const key of ['name', 'category', 'uom', 'hsnCode', 'defaultGstRate', 'reorderLevel', 'standardYieldPercent', 'isActive'] as const) {
      if (body[key] !== undefined) (material as any)[key] = body[key];
    }
    await material.save();
    await writeAudit({ entity: 'CtRawMaterial', entityId: id, action: 'UPDATE', session });
    return material.toObject();
  });
}
