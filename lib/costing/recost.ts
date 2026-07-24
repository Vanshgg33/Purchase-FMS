// Naturelite Manufacturing Cost Tracker — recalculation cascade (spec §8), completion gate (§7.2)
import { connectDB } from '@/lib/mongodb';
import { AppError } from '@/lib/costErrors';
import { writeAudit } from '@/lib/costAudit';
import type { CtSession } from '@/lib/permissions';
import ProductionBatch from '@/models/ProductionBatch';
import BatchConsumption from '@/models/BatchConsumption';
import LabourEntry from '@/models/LabourEntry';
import MachineHour from '@/models/MachineHour';
import FinishedGood from '@/models/FinishedGood';
import RateMaster from '@/models/RateMaster';
import PackagingBom from '@/models/PackagingBom';
import Overhead from '@/models/Overhead';
import { gatherCostInputs, resolveOverheadRate } from './service';
import { computeBatchCost } from './index';
import { reconcileYield } from './byproduct';

const FROZEN_STATUSES = ['COMPLETED', 'CANCELLED'];

export async function recostBatch(batchId: string) {
  await connectDB();
  const batch = await ProductionBatch.findById(batchId);
  if (!batch) throw new AppError('NOT_FOUND', 'Batch not found');
  if (FROZEN_STATUSES.includes(batch.status)) throw new AppError('BATCH_FROZEN', 'Batch is completed and read-only');

  const inputs = await gatherCostInputs(batchId);
  const costs = computeBatchCost(inputs);

  batch.costs = {
    materialCost: costs.materialCost,
    labourCost: costs.labourCost,
    electricityCost: costs.electricityCost,
    consumablesCost: costs.consumablesCost,
    packagingCost: costs.packagingCost,
    overheadCost: costs.overheadCost,
    byProductCredit: costs.byProductCredit,
    grossManufacturingCost: costs.grossManufacturingCost,
    manufacturingCost: costs.manufacturingCost,
    manufacturingCostPerUnit: costs.manufacturingCostPerUnit,
    outputUnits: costs.outputUnits,
    isProvisional: costs.isProvisional,
    lastComputedAt: new Date().toISOString(),
  };
  batch.flags.hasOverheadAllocated = inputs.overheadRatePerUnit !== null;
  await batch.save();
  return batch.costs;
}

export interface CompletionCheck {
  step: string;
  label: string;
}

export async function checkCompletionGate(batchId: string): Promise<CompletionCheck[]> {
  await connectDB();
  const batch = await ProductionBatch.findById(batchId).lean();
  if (!batch) throw new AppError('NOT_FOUND', 'Batch not found');

  const missing: CompletionCheck[] = [];
  const b: any = batch;

  const [consumptionCount, labourEntries, machineCount, finishedGoods] = await Promise.all([
    BatchConsumption.countDocuments({ batchId, isReversed: false }),
    LabourEntry.find({ batchId }).lean(),
    MachineHour.countDocuments({ batchId }),
    FinishedGood.find({ batchId }).lean(),
  ]);

  if (!b.flags?.hasMaterialConsumed || consumptionCount < 1) {
    missing.push({ step: 'MATERIAL', label: 'Material consumption not recorded' });
  }
  if (!labourEntries.some((l: any) => l.totalHours > 0)) {
    missing.push({ step: 'LABOUR', label: 'Labour not recorded' });
  }
  if (machineCount < 1) {
    missing.push({ step: 'MACHINE', label: 'Machine hours not recorded' });
  }

  const primary = finishedGoods.find((f: any) => f.outputType === 'PRIMARY');
  if (!primary || primary.quantity <= 0 || !primary.unitsProduced || primary.unitsProduced <= 0) {
    missing.push({ step: 'YIELD', label: 'Yield not recorded' });
  }

  if (!(b.costs?.packagingCost > 0)) {
    missing.push({ step: 'PACKAGING', label: 'Packaging BOM not applied' });
  }

  if (!(b.costs?.overheadCost > 0 || b.flags?.hasOverheadAllocated)) {
    missing.push({ step: 'OVERHEAD', label: 'Overhead not allocated' });
  }

  if (primary) {
    const byProductQtyTotal = finishedGoods.filter((f: any) => f.outputType === 'BY_PRODUCT').reduce((s: number, f: any) => s + f.quantity, 0);
    try {
      const inputQty = (await BatchConsumption.find({ batchId, isReversed: false }).lean()).reduce((s: number, c: any) => s + c.quantityConsumed, 0);
      const { lossPercent } = reconcileYield({ inputQty, primaryOutputQty: primary.quantity, byProductQtyTotal });
      if (lossPercent < 0 || lossPercent > 15) missing.push({ step: 'YIELD_SANE', label: `Process loss ${lossPercent}% is outside the sane 0-15% range` });
    } catch {
      missing.push({ step: 'YIELD_SANE', label: 'Yield exceeds input quantity' });
    }
  }

  if (!b.costs?.lastComputedAt) {
    missing.push({ step: 'COSTS', label: 'Costs have not been computed yet' });
  }

  return missing;
}

export async function completeBatch(batchId: string, session: CtSession) {
  await connectDB();
  const missing = await checkCompletionGate(batchId);
  if (missing.length > 0) {
    throw new AppError('INCOMPLETE_BATCH', 'Batch cannot be completed', { extra: { missing } });
  }

  await recostBatch(batchId);
  const batch = await ProductionBatch.findById(batchId);
  if (!batch) throw new AppError('NOT_FOUND', 'Batch not found');

  const [labourEntries, machineEntries, bom] = await Promise.all([
    LabourEntry.find({ batchId }).lean(),
    MachineHour.find({ batchId }).lean(),
    PackagingBom.findOne({ productId: batch.productId, isActive: true }).lean(),
  ]);
  const consumptions = await BatchConsumption.find({ batchId, isReversed: false }).populate('lotId').lean();

  const labourRates: Record<string, number> = {};
  for (const l of labourEntries as any[]) labourRates[l.labourType] = l.hourlyRate;

  const snapshot = {
    labourRates,
    electricityRate: (machineEntries[0] as any)?.electricityRatePerHour ?? 0,
    overheadRatePerUnit: batch.costs.overheadCost && batch.costs.outputUnits ? batch.costs.overheadCost / batch.costs.outputUnits : 0,
    overheadIsProvisional: batch.costs.isProvisional,
    packagingRates: bom ? (bom as any).components.map((c: any) => ({ code: String(c.componentId), rate: c.rateSnapshot })) : [],
    lotCosts: (consumptions as any[]).map(c => ({ lotCode: c.lotId?.lotCode ?? '', rate: c.landedCostPerUnit })),
    frozenAt: new Date().toISOString(),
  };

  batch.snapshot = snapshot;
  batch.status = 'COMPLETED';
  batch.completedAt = new Date();
  batch.completedBy = session.userId as any;
  await batch.save();

  await writeAudit({ entity: 'ProductionBatch', entityId: batchId, action: 'COMPLETE', session });
  return batch;
}

export async function reopenBatch(batchId: string, reason: string, session: CtSession) {
  if (!reason || reason.trim().length < 10) throw new AppError('REASON_REQUIRED', 'Reopen reason must be at least 10 characters');
  await connectDB();
  const batch = await ProductionBatch.findById(batchId);
  if (!batch) throw new AppError('NOT_FOUND', 'Batch not found');
  if (batch.status !== 'COMPLETED') throw new AppError('VALIDATION_ERROR', 'Only completed batches can be reopened');

  const previousSnapshot = batch.snapshot;
  const previousList = (previousSnapshot as any)?.previous ?? [];
  batch.snapshot = { ...(previousSnapshot as any), previous: [...previousList, { ...previousSnapshot, previous: undefined }] };
  batch.status = 'REOPENED';
  batch.reopenReason = reason;
  await batch.save();

  await writeAudit({ entity: 'ProductionBatch', entityId: batchId, action: 'REOPEN', session, reason });
  return batch;
}

/** §8.3 — locking an overhead month mass-recosts every COMPLETED batch in that month, replacing only overheadCost. */
export async function massRecostOnOverheadLock(overheadId: string, session: CtSession) {
  await connectDB();
  const overhead = await Overhead.findById(overheadId);
  if (!overhead) throw new AppError('NOT_FOUND', 'Overhead record not found');

  const start = new Date(Date.UTC(overhead.year, overhead.month - 1, 1));
  const end = new Date(Date.UTC(overhead.year, overhead.month, 1));

  const batches = await ProductionBatch.find({ status: 'COMPLETED', productionDate: { $gte: start, $lt: end } });

  for (const batch of batches) {
    const before = batch.costs.overheadCost;
    const overheadCost = Math.round(batch.costs.outputUnits * overhead.overheadRatePerUnit * 100) / 100;
    const grossManufacturingCost = Math.round((batch.costs.materialCost + batch.costs.labourCost + batch.costs.electricityCost + batch.costs.consumablesCost + batch.costs.packagingCost + overheadCost) * 100) / 100;
    const manufacturingCost = Math.round((grossManufacturingCost - batch.costs.byProductCredit) * 100) / 100;
    const manufacturingCostPerUnit = batch.costs.outputUnits > 0 ? Math.round((manufacturingCost / batch.costs.outputUnits) * 10000) / 10000 : null;

    batch.costs.overheadCost = overheadCost;
    batch.costs.grossManufacturingCost = grossManufacturingCost;
    batch.costs.manufacturingCost = manufacturingCost;
    batch.costs.manufacturingCostPerUnit = manufacturingCostPerUnit;
    batch.costs.isProvisional = false;
    batch.costs.lastComputedAt = new Date().toISOString();
    if (batch.snapshot) (batch.snapshot as any).overheadRatePerUnit = overhead.overheadRatePerUnit;
    await batch.save();

    await writeAudit({
      entity: 'ProductionBatch',
      entityId: batch._id.toString(),
      action: 'RECOST',
      session,
      changes: { overheadCost: { before, after: overheadCost } },
    });
  }

  overhead.isLocked = true;
  await overhead.save();
  await writeAudit({ entity: 'Overhead', entityId: overheadId, action: 'UPDATE', session, changes: { isLocked: { before: false, after: true } } });

  return { recostedBatches: batches.length };
}
