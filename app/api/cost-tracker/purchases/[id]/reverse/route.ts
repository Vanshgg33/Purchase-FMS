import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireCapability } from '@/lib/permissions';
import { ctRoute } from '@/lib/costApi';
import { writeAudit } from '@/lib/costAudit';
import { AppError } from '@/lib/costErrors';
import Purchase from '@/models/Purchase';
import InventoryLot from '@/models/InventoryLot';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return ctRoute(async () => {
    const session = await requireCapability('REVERSE_PURCHASE');
    await connectDB();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    if (!body.reason || String(body.reason).trim().length === 0) {
      throw new AppError('REASON_REQUIRED', 'A reason is required to reverse a purchase');
    }

    const purchase = await Purchase.findById(id);
    if (!purchase) throw new AppError('NOT_FOUND', 'Purchase not found');

    const lots = await InventoryLot.find({ purchaseId: id });
    if (lots.some(l => l.consumedQuantity > 0)) {
      throw new AppError('LOT_ALREADY_CONSUMED', 'Cannot reverse: one or more lots from this purchase have already been consumed');
    }

    purchase.status = 'REVERSED';
    await purchase.save();
    await InventoryLot.updateMany({ purchaseId: id }, { $set: { status: 'REVERSED', availableQuantity: 0 } });

    await writeAudit({ entity: 'Purchase', entityId: id, action: 'REVERSE', session, reason: body.reason });
    return purchase.toObject();
  });
}
