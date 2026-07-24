import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireCapability } from '@/lib/permissions';
import { ctRoute } from '@/lib/costApi';
import { writeAudit } from '@/lib/costAudit';
import { AppError } from '@/lib/costErrors';
import { recostBatch } from '@/lib/costing/recost';
import ProductionBatch from '@/models/ProductionBatch';
import PackagingBom from '@/models/PackagingBom';
import FinishedGood from '@/models/FinishedGood';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return ctRoute(async () => {
    const session = await requireCapability('APPLY_PACKAGING');
    await connectDB();
    const { id } = await params;

    const batch = await ProductionBatch.findById(id);
    if (!batch) throw new AppError('NOT_FOUND', 'Batch not found');
    if (['COMPLETED', 'CANCELLED'].includes(batch.status)) throw new AppError('BATCH_FROZEN', 'Batch is completed and read-only');

    const primary = await FinishedGood.findOne({ batchId: id, outputType: 'PRIMARY' }).lean();
    if (!primary || !(primary as any).unitsProduced) throw new AppError('YIELD_REQUIRED_FIRST', 'Record yield before applying packaging');

    const bom = await PackagingBom.findOne({ productId: batch.productId, isActive: true });
    if (!bom) throw new AppError('NOT_FOUND', 'No active packaging BOM for this product');

    batch.flags.hasPackagingRecorded = true;
    await batch.save();
    const costs = await recostBatch(id);

    await writeAudit({ entity: 'ProductionBatch', entityId: id, action: 'UPDATE', session, changes: { packaging: { before: null, after: bom._id } } });
    return { bom: bom.toObject(), costs };
  });
}
