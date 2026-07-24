import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireCapability } from '@/lib/permissions';
import { ctRoute } from '@/lib/costApi';
import { writeAudit } from '@/lib/costAudit';
import { consumableSchema, zodFieldErrors } from '@/lib/costValidation';
import { AppError } from '@/lib/costErrors';
import { recostBatch } from '@/lib/costing/recost';
import ProductionBatch from '@/models/ProductionBatch';
import ConsumableEntry from '@/models/ConsumableEntry';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return ctRoute(async () => {
    const session = await requireCapability('RECORD_BATCH_INPUTS');
    await connectDB();
    const { id } = await params;
    const parsed = consumableSchema.safeParse(await req.json());
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Invalid consumable entry', { fields: zodFieldErrors(parsed.error) });

    const batch = await ProductionBatch.findById(id);
    if (!batch) throw new AppError('NOT_FOUND', 'Batch not found');
    if (['COMPLETED', 'CANCELLED'].includes(batch.status)) throw new AppError('BATCH_FROZEN', 'Batch is completed and read-only');

    const lineCost = Math.round(parsed.data.quantity * parsed.data.ratePerUnit * 100) / 100;
    const entry = await ConsumableEntry.create({ batchId: id, ...parsed.data, lineCost });
    batch.flags.hasConsumablesRecorded = true;
    await batch.save();
    const costs = await recostBatch(id);

    await writeAudit({ entity: 'ConsumableEntry', entityId: entry._id.toString(), action: 'CREATE', session });
    return { entry: entry.toObject(), costs };
  });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return ctRoute(async () => {
    await requireCapability('RECORD_BATCH_INPUTS');
    await connectDB();
    const { id } = await params;
    return ConsumableEntry.find({ batchId: id }).sort({ createdAt: 1 }).lean();
  });
}
