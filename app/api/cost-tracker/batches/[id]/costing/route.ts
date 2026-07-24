import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireCapability } from '@/lib/permissions';
import { ctRoute } from '@/lib/costApi';
import { AppError } from '@/lib/costErrors';
import { gatherCostInputs } from '@/lib/costing/service';
import { computeBatchCost } from '@/lib/costing/index';
import { checkCompletionGate } from '@/lib/costing/recost';
import ProductionBatch from '@/models/ProductionBatch';
import BatchConsumption from '@/models/BatchConsumption';
import LabourEntry from '@/models/LabourEntry';
import MachineHour from '@/models/MachineHour';
import ConsumableEntry from '@/models/ConsumableEntry';
import FinishedGood from '@/models/FinishedGood';
import Product from '@/models/Product';
import type { Channel } from '@/types/costTracker';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return ctRoute(async () => {
    await requireCapability('VIEW_COSTING');
    await connectDB();
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const channel = (searchParams.get('channel') as Channel) || undefined;

    const batch = await ProductionBatch.findById(id).lean();
    if (!batch) throw new AppError('NOT_FOUND', 'Batch not found');

    const product = await Product.findById((batch as any).productId).lean();

    const isFrozen = ['COMPLETED', 'CANCELLED'].includes((batch as any).status);
    const inputs = await gatherCostInputs(id, { channel });
    const computed = computeBatchCost(inputs);

    const [consumption, labour, machine, consumables, finishedGoods, missing] = await Promise.all([
      BatchConsumption.find({ batchId: id, isReversed: false }).populate('lotId').lean(),
      LabourEntry.find({ batchId: id }).lean(),
      MachineHour.find({ batchId: id }).lean(),
      ConsumableEntry.find({ batchId: id }).lean(),
      FinishedGood.find({ batchId: id }).lean(),
      isFrozen ? Promise.resolve([]) : checkCompletionGate(id),
    ]);

    return {
      batch,
      product,
      computed,
      isFrozen,
      consumption,
      labour,
      machine,
      consumables,
      finishedGoods,
      missing,
    };
  });
}
