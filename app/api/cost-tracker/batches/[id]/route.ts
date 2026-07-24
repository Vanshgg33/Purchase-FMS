import { connectDB } from '@/lib/mongodb';
import { requireCapability, stripCostFields } from '@/lib/permissions';
import { ctRoute } from '@/lib/costApi';
import { AppError } from '@/lib/costErrors';
import ProductionBatch from '@/models/ProductionBatch';
import BatchConsumption from '@/models/BatchConsumption';
import LabourEntry from '@/models/LabourEntry';
import MachineHour from '@/models/MachineHour';
import ConsumableEntry from '@/models/ConsumableEntry';
import FinishedGood from '@/models/FinishedGood';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return ctRoute(async () => {
    const session = await requireCapability('CREATE_BATCH');
    await connectDB();
    const { id } = await params;

    const [batch, consumption, labour, machine, consumables, finishedGoods] = await Promise.all([
      ProductionBatch.findById(id).populate('productId').lean(),
      BatchConsumption.find({ batchId: id }).populate('lotId').sort({ consumedAt: 1 }).lean(),
      LabourEntry.find({ batchId: id }).sort({ createdAt: 1 }).lean(),
      MachineHour.find({ batchId: id }).sort({ createdAt: 1 }).lean(),
      ConsumableEntry.find({ batchId: id }).sort({ createdAt: 1 }).lean(),
      FinishedGood.find({ batchId: id }).lean(),
    ]);
    if (!batch) throw new AppError('NOT_FOUND', 'Batch not found');

    const safeBatch = session.role === 'PRODUCTION' ? stripCostFields(batch as any, session.role, ['costs', 'snapshot']) : batch;

    return { batch: safeBatch, consumption, labour, machine, consumables, finishedGoods };
  });
}
