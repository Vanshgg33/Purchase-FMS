// Naturelite Manufacturing Cost Tracker — DB-facing gather/execute functions.
// This is the impure half of the engine (spec §8.1): it reads/writes Mongo, then hands
// plain data to the pure computeBatchCost(). Kept separate on purpose so the pure engine
// stays unit-testable without a database.
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { AppError } from '@/lib/costErrors';
import ProductionBatch from '@/models/ProductionBatch';
import BatchConsumption from '@/models/BatchConsumption';
import LabourEntry from '@/models/LabourEntry';
import MachineHour from '@/models/MachineHour';
import ConsumableEntry from '@/models/ConsumableEntry';
import FinishedGood from '@/models/FinishedGood';
import PackagingBom from '@/models/PackagingBom';
import Overhead from '@/models/Overhead';
import Product from '@/models/Product';
import SellingCost from '@/models/SellingCost';
import InventoryLot from '@/models/InventoryLot';
import { consumeFIFO, type FifoLotInput } from './fifo';
import { generateLotCode } from './codes';
import type { Uom, Channel } from '@/types/costTracker';
import type { ComputeBatchCostInput } from './index';

export async function gatherCostInputs(batchId: string, opts?: { channel?: Channel }): Promise<ComputeBatchCostInput> {
  await connectDB();
  const batch = await ProductionBatch.findById(batchId).lean();
  if (!batch) throw new AppError('NOT_FOUND', 'Batch not found');

  const [consumptions, labourEntries, machineEntries, consumableEntries, finishedGoods, product] = await Promise.all([
    BatchConsumption.find({ batchId, isReversed: false }).lean(),
    LabourEntry.find({ batchId }).lean(),
    MachineHour.find({ batchId }).lean(),
    ConsumableEntry.find({ batchId }).lean(),
    FinishedGood.find({ batchId }).lean(),
    Product.findById((batch as any).productId).lean(),
  ]);

  const materialCost = consumptions.reduce((s: number, c: any) => s + c.lineCost, 0);
  const labourLines = labourEntries.map((l: any) => ({ totalHours: l.totalHours, hourlyRate: l.hourlyRate }));
  const machineLines = machineEntries.map((m: any) => ({ hours: m.hours, electricityRatePerHour: m.electricityRatePerHour }));
  const consumableLines = consumableEntries.map((c: any) => ({ quantity: c.quantity, ratePerUnit: c.ratePerUnit }));

  const primary = finishedGoods.find((f: any) => f.outputType === 'PRIMARY');
  const byProducts = finishedGoods
    .filter((f: any) => f.outputType === 'BY_PRODUCT')
    .map((f: any) => ({ quantity: f.quantity, realisableRatePerUnit: f.realisableRatePerUnit ?? 0 }));

  const unitsProduced = primary?.unitsProduced ?? 0;
  const primaryOutputQty = primary?.quantity ?? 0;

  let packagingComponents: ComputeBatchCostInput['packagingComponents'] = null;
  if (product) {
    const bom = await PackagingBom.findOne({ productId: (product as any)._id, isActive: true }).lean();
    if (bom) {
      packagingComponents = (bom as any).components.map((c: any) => ({ qtyPerUnit: c.qtyPerUnit, rateSnapshot: c.rateSnapshot }));
    }
  }

  const { overheadRatePerUnit, isProvisional } = await resolveOverheadRate(new Date((batch as any).productionDate));

  let sellingPrice: number | undefined;
  let sellingCostInput: ComputeBatchCostInput['sellingCostInput'];
  if (product) {
    sellingPrice = (product as any).sellingPrice;
    const sellingQuery: any = { productId: (product as any)._id, isActive: true };
    if (opts?.channel) sellingQuery.channel = opts.channel;
    const selling = await SellingCost.findOne(sellingQuery).lean();
    if (selling) {
      sellingCostInput = {
        shippingPerUnit: (selling as any).shippingPerUnit,
        adSpendPerUnit: (selling as any).adSpendPerUnit,
        paymentGatewayPercent: (selling as any).paymentGatewayPercent,
        rtoProvisionPerUnit: (selling as any).rtoProvisionPerUnit,
        discountPerUnit: (selling as any).discountPerUnit,
        supportCostPerUnit: (selling as any).supportCostPerUnit,
      };
    }
  }

  return {
    materialCost,
    labourLines,
    machineLines,
    consumableLines,
    unitsProduced,
    packagingComponents,
    overheadRatePerUnit,
    overheadIsProvisional: isProvisional,
    primaryOutputQty,
    byProducts,
    sellingPrice,
    sellingCostInput,
  };
}

/** §5.6 overhead timing: use this month's LOCKED rate if present, else the most recent locked prior month's rate (provisional). */
export async function resolveOverheadRate(productionDate: Date): Promise<{ overheadRatePerUnit: number | null; isProvisional: boolean }> {
  const month = productionDate.getMonth() + 1;
  const year = productionDate.getFullYear();

  const current = await Overhead.findOne({ year, month }).lean();
  if (current && (current as any).isLocked) {
    return { overheadRatePerUnit: (current as any).overheadRatePerUnit, isProvisional: false };
  }

  const prior = await Overhead.find({ isLocked: true, $or: [{ year: { $lt: year } }, { year, month: { $lt: month } }] })
    .sort({ year: -1, month: -1 })
    .limit(1)
    .lean();

  if (prior.length > 0) {
    return { overheadRatePerUnit: (prior[0] as any).overheadRatePerUnit, isProvisional: true };
  }
  if (current) {
    // Current month exists but isn't locked yet, and there's no prior locked month to fall back on.
    return { overheadRatePerUnit: (current as any).overheadRatePerUnit, isProvisional: true };
  }
  return { overheadRatePerUnit: null, isProvisional: true };
}

/** Executes FIFO consumption transactionally: decrements lots, inserts BatchConsumption rows. */
export async function executeFifoConsumption(opts: {
  batchId: string;
  rawMaterialId: string;
  quantity: number;
  uom: Uom;
}) {
  await connectDB();
  const dbSession = await mongoose.startSession();
  let result: { materialCost: number; allocations: any[] } | null = null;

  try {
    await dbSession.withTransaction(async () => {
      const lots = await InventoryLot.find({
        rawMaterialId: opts.rawMaterialId,
        status: { $in: ['AVAILABLE', 'PARTIAL'] },
        availableQuantity: { $gt: 0 },
      })
        .sort({ receivedDate: 1, _id: 1 })
        .session(dbSession);

      const fifoInputs: FifoLotInput[] = lots.map((l: any) => ({
        lotId: l._id.toString(),
        lotCode: l.lotCode,
        availableQuantity: l.availableQuantity,
        uom: l.uom,
        landedCostPerUnit: l.landedCostPerUnit,
        receivedDate: l.receivedDate,
      }));

      const fifo = consumeFIFO(fifoInputs, opts.quantity, opts.uom);

      for (const alloc of fifo.allocations) {
        const lot = lots.find((l: any) => l._id.toString() === alloc.lotId)!;
        lot.availableQuantity = alloc.remainingAvailableQuantity;
        lot.consumedQuantity = lot.consumedQuantity + alloc.quantityConsumed;
        lot.status = lot.availableQuantity <= 0 ? 'EXHAUSTED' : 'PARTIAL';

        if (Math.abs(lot.availableQuantity + lot.consumedQuantity - lot.originalQuantity) > 0.0005) {
          throw new AppError('LOT_INTEGRITY_ERROR', `Lot ${lot.lotCode} invariant violated`);
        }
        await lot.save({ session: dbSession });

        await BatchConsumption.create(
          [{
            batchId: opts.batchId,
            lotId: lot._id,
            rawMaterialId: opts.rawMaterialId,
            quantityConsumed: alloc.quantityConsumed,
            uom: opts.uom,
            landedCostPerUnit: alloc.landedCostPerUnit,
            lineCost: alloc.lineCost,
            consumedAt: new Date(),
          }],
          { session: dbSession }
        );
      }

      await ProductionBatch.findByIdAndUpdate(
        opts.batchId,
        { $set: { 'flags.hasMaterialConsumed': true, status: 'IN_PROGRESS' } },
        { session: dbSession }
      );

      result = { materialCost: fifo.materialCost, allocations: fifo.allocations };
    });
  } finally {
    await dbSession.endSession();
  }

  return result!;
}

export async function nextLotCode() {
  return generateLotCode(InventoryLot);
}
