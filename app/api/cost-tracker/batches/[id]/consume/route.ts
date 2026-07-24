import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireCapability } from '@/lib/permissions';
import { ctRoute } from '@/lib/costApi';
import { writeAudit } from '@/lib/costAudit';
import { consumeSchema, zodFieldErrors } from '@/lib/costValidation';
import { AppError } from '@/lib/costErrors';
import { executeFifoConsumption } from '@/lib/costing/service';
import { recostBatch } from '@/lib/costing/recost';
import CtRawMaterial from '@/models/CtRawMaterial';
import ProductionBatch from '@/models/ProductionBatch';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return ctRoute(async () => {
    const session = await requireCapability('RECORD_BATCH_INPUTS');
    await connectDB();
    const { id } = await params;
    const parsed = consumeSchema.safeParse(await req.json());
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Invalid consumption data', { fields: zodFieldErrors(parsed.error) });

    const batch = await ProductionBatch.findById(id);
    if (!batch) throw new AppError('NOT_FOUND', 'Batch not found');
    if (['COMPLETED', 'CANCELLED'].includes(batch.status)) throw new AppError('BATCH_FROZEN', 'Batch is completed and read-only');

    const rm = await CtRawMaterial.findById(parsed.data.rawMaterialId).lean();
    if (!rm) throw new AppError('NOT_FOUND', 'Raw material not found');
    if ((rm as any).uom !== parsed.data.uom) throw new AppError('UOM_MISMATCH', `${(rm as any).name} is tracked in ${(rm as any).uom}`);

    const result = await executeFifoConsumption({ batchId: id, rawMaterialId: parsed.data.rawMaterialId, quantity: parsed.data.quantity, uom: parsed.data.uom });
    const costs = await recostBatch(id);

    await writeAudit({ entity: 'ProductionBatch', entityId: id, action: 'UPDATE', session, changes: { consumption: { before: null, after: result } } });
    return { allocations: result.allocations, materialCost: result.materialCost, costs };
  });
}
