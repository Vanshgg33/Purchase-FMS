import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireCapability } from '@/lib/permissions';
import { ctRoute } from '@/lib/costApi';
import { writeAudit } from '@/lib/costAudit';
import { machineSchema, zodFieldErrors } from '@/lib/costValidation';
import { AppError } from '@/lib/costErrors';
import { resolveRate } from '@/lib/costing/rates';
import { recostBatch } from '@/lib/costing/recost';
import ProductionBatch from '@/models/ProductionBatch';
import MachineHour from '@/models/MachineHour';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return ctRoute(async () => {
    const session = await requireCapability('RECORD_BATCH_INPUTS');
    await connectDB();
    const { id } = await params;
    const parsed = machineSchema.safeParse(await req.json());
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Invalid machine hour entry', { fields: zodFieldErrors(parsed.error) });

    const batch = await ProductionBatch.findById(id);
    if (!batch) throw new AppError('NOT_FOUND', 'Batch not found');
    if (['COMPLETED', 'CANCELLED'].includes(batch.status)) throw new AppError('BATCH_FROZEN', 'Batch is completed and read-only');

    const electricityRatePerHour = await resolveRate('ELECTRICITY', batch.productionDate);
    const lineCost = Math.round(parsed.data.hours * electricityRatePerHour * 100) / 100;

    const entry = await MachineHour.create({ batchId: id, ...parsed.data, electricityRatePerHour, lineCost });
    batch.flags.hasMachineRecorded = true;
    await batch.save();
    const costs = await recostBatch(id);

    await writeAudit({ entity: 'MachineHour', entityId: entry._id.toString(), action: 'CREATE', session });
    return { entry: entry.toObject(), costs };
  });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return ctRoute(async () => {
    await requireCapability('RECORD_BATCH_INPUTS');
    await connectDB();
    const { id } = await params;
    return MachineHour.find({ batchId: id }).sort({ createdAt: 1 }).lean();
  });
}
