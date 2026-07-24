import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireCapability } from '@/lib/permissions';
import { ctRoute } from '@/lib/costApi';
import { writeAudit } from '@/lib/costAudit';
import { yieldSchema, zodFieldErrors } from '@/lib/costValidation';
import { AppError } from '@/lib/costErrors';
import { reconcileYield } from '@/lib/costing/byproduct';
import { recostBatch } from '@/lib/costing/recost';
import ProductionBatch from '@/models/ProductionBatch';
import BatchConsumption from '@/models/BatchConsumption';
import FinishedGood from '@/models/FinishedGood';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return ctRoute(async () => {
    const session = await requireCapability('RECORD_YIELD');
    await connectDB();
    const { id } = await params;
    const parsed = yieldSchema.safeParse(await req.json());
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Invalid yield data', { fields: zodFieldErrors(parsed.error) });
    const data = parsed.data;

    const batch = await ProductionBatch.findById(id);
    if (!batch) throw new AppError('NOT_FOUND', 'Batch not found');
    if (['COMPLETED', 'CANCELLED'].includes(batch.status)) throw new AppError('BATCH_FROZEN', 'Batch is completed and read-only');

    const consumptions = await BatchConsumption.find({ batchId: id, isReversed: false }).lean();
    const inputQty = consumptions.reduce((s: number, c: any) => s + c.quantityConsumed, 0);
    const byProductQtyTotal = data.byProducts.reduce((s, b) => s + b.quantity, 0);

    const reconciliation = reconcileYield({ inputQty, primaryOutputQty: data.primary.quantity, byProductQtyTotal });

    await FinishedGood.deleteMany({ batchId: id });
    await FinishedGood.create({
      batchId: id,
      outputType: 'PRIMARY',
      productId: batch.productId,
      quantity: data.primary.quantity,
      uom: data.primary.uom,
      unitsProduced: data.primary.unitsProduced,
      yieldPercent: Math.round((data.primary.quantity / inputQty) * 10000) / 100,
    });
    for (const bp of data.byProducts) {
      await FinishedGood.create({
        batchId: id,
        outputType: 'BY_PRODUCT',
        byProductName: bp.byProductName,
        quantity: bp.quantity,
        uom: bp.uom,
        realisableRatePerUnit: bp.realisableRatePerUnit,
        realisableValue: Math.round(bp.quantity * bp.realisableRatePerUnit * 100) / 100,
      });
    }

    batch.flags.hasYieldRecorded = true;
    await batch.save();
    const costs = await recostBatch(id);

    await writeAudit({ entity: 'ProductionBatch', entityId: id, action: 'UPDATE', session, changes: { yield: { before: null, after: data } } });
    return { reconciliation, costs, warnings: reconciliation.warning ? [reconciliation.warning] : [] };
  });
}
