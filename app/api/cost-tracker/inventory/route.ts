import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireCapability } from '@/lib/permissions';
import { ctRoute } from '@/lib/costApi';
import InventoryLot from '@/models/InventoryLot';
import CtRawMaterial from '@/models/CtRawMaterial';

export async function GET(req: NextRequest) {
  return ctRoute(async () => {
    const session = await requireCapability('VIEW_INVENTORY');
    await connectDB();
    const { searchParams } = new URL(req.url);
    const rawMaterialId = searchParams.get('rawMaterialId');
    const includeExhausted = searchParams.get('includeExhausted') === 'true';

    const query: Record<string, unknown> = {};
    if (rawMaterialId) query.rawMaterialId = rawMaterialId;
    if (!includeExhausted) query.status = { $in: ['AVAILABLE', 'PARTIAL'] };

    const lots = await InventoryLot.find(query).populate('rawMaterialId', 'name code uom').populate('vendorId', 'name').sort({ receivedDate: 1 }).lean();

    const byMaterial = new Map<string, any>();
    for (const lot of lots as any[]) {
      const rmId = lot.rawMaterialId?._id?.toString() ?? String(lot.rawMaterialId);
      if (!byMaterial.has(rmId)) {
        byMaterial.set(rmId, { rawMaterial: lot.rawMaterialId, totalAvailableQty: 0, weightedCostSum: 0, lots: [] });
      }
      const bucket = byMaterial.get(rmId);
      bucket.lots.push(lot);
      if (lot.status === 'AVAILABLE' || lot.status === 'PARTIAL') {
        bucket.totalAvailableQty += lot.availableQuantity;
        bucket.weightedCostSum += lot.availableQuantity * lot.landedCostPerUnit;
      }
    }

    const isAdmin = session.role === 'ADMIN';
    const result = Array.from(byMaterial.values()).map(b => ({
      rawMaterial: b.rawMaterial,
      totalAvailableQty: Math.round(b.totalAvailableQty * 10000) / 10000,
      weightedAvgCost: isAdmin && b.totalAvailableQty > 0 ? Math.round((b.weightedCostSum / b.totalAvailableQty) * 10000) / 10000 : null,
      lots: b.lots.map((l: any) => (isAdmin ? l : { ...l, landedCostPerUnit: undefined })),
    }));

    if (rawMaterialId) {
      const materials = await CtRawMaterial.find({ isActive: true }).lean();
      return { materials, ...result[0] };
    }
    return result;
  });
}
