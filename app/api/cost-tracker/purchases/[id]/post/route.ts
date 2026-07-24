import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { requireCapability } from '@/lib/permissions';
import { ctRoute } from '@/lib/costApi';
import { writeAudit } from '@/lib/costAudit';
import { AppError } from '@/lib/costErrors';
import { generateLotCode } from '@/lib/costing/codes';
import Purchase from '@/models/Purchase';
import InventoryLot from '@/models/InventoryLot';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return ctRoute(async () => {
    const session = await requireCapability('POST_PURCHASE');
    await connectDB();
    const { id } = await params;

    const purchase = await Purchase.findById(id);
    if (!purchase) throw new AppError('NOT_FOUND', 'Purchase not found');
    if (purchase.status === 'POSTED') throw new AppError('ALREADY_POSTED', 'Purchase already posted');
    if (purchase.status === 'REVERSED') throw new AppError('VALIDATION_ERROR', 'Purchase was reversed');

    const dbSession = await mongoose.startSession();
    const createdLots: any[] = [];
    try {
      await dbSession.withTransaction(async () => {
        for (const item of purchase.items) {
          const lotCode = await generateLotCode(InventoryLot);
          const [lot] = await InventoryLot.create(
            [{
              lotCode,
              rawMaterialId: item.rawMaterialId,
              purchaseId: purchase._id,
              vendorId: purchase.vendorId,
              receivedDate: purchase.receivedDate,
              originalQuantity: item.quantity,
              availableQuantity: item.quantity,
              consumedQuantity: 0,
              uom: item.uom,
              landedCostPerUnit: item.landedCostPerUnit,
              status: 'AVAILABLE',
            }],
            { session: dbSession }
          );
          createdLots.push(lot.toObject());
        }
        purchase.status = 'POSTED';
        await purchase.save({ session: dbSession });
      });
    } finally {
      await dbSession.endSession();
    }

    await writeAudit({ entity: 'Purchase', entityId: id, action: 'POST', session });
    return { purchase: purchase.toObject(), lots: createdLots };
  });
}
