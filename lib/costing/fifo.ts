// Naturelite Manufacturing Cost Tracker — FIFO lot consumption (spec §5.4)
import { round2, round4 } from './round';
import { AppError } from '@/lib/costErrors';
import type { Uom } from '@/types/costTracker';

export interface FifoLotInput {
  lotId: string;
  lotCode?: string;
  availableQuantity: number;
  uom: Uom;
  landedCostPerUnit: number;
  receivedDate: string | Date;
}

export interface FifoAllocation {
  lotId: string;
  lotCode?: string;
  quantityConsumed: number;
  landedCostPerUnit: number;
  lineCost: number;
  remainingAvailableQuantity: number;
}

export interface FifoConsumptionResult {
  allocations: FifoAllocation[];
  materialCost: number;
}

/** Draws from the oldest available lot first. Never averages — sums the blended cost of the lots actually consumed. */
export function consumeFIFO(lots: FifoLotInput[], requiredQty: number, uom: Uom): FifoConsumptionResult {
  if (requiredQty <= 0) throw new AppError('INVALID_QUANTITY', 'Required quantity must be greater than zero');

  const sorted = [...lots]
    .filter(l => l.availableQuantity > 0)
    .sort((a, b) => new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime());

  const totalAvailable = round4(sorted.reduce((s, l) => s + l.availableQuantity, 0));
  if (totalAvailable < requiredQty) {
    throw new AppError('INSUFFICIENT_STOCK', `Only ${totalAvailable} available, ${requiredQty} required`, {
      extra: { required: requiredQty, available: totalAvailable, shortfall: round4(requiredQty - totalAvailable) },
    });
  }

  let remaining = requiredQty;
  const allocations: FifoAllocation[] = [];

  for (const lot of sorted) {
    if (remaining <= 0) break;
    if (lot.uom !== uom) {
      throw new AppError('UOM_MISMATCH', `Lot ${lot.lotCode ?? lot.lotId} is in ${lot.uom}, consumption requested in ${uom}`);
    }
    const take = Math.min(lot.availableQuantity, remaining);
    const lineCost = round2(take * lot.landedCostPerUnit);
    allocations.push({
      lotId: lot.lotId,
      lotCode: lot.lotCode,
      quantityConsumed: take,
      landedCostPerUnit: lot.landedCostPerUnit,
      lineCost,
      remainingAvailableQuantity: round4(lot.availableQuantity - take),
    });
    remaining -= take;
  }

  const materialCost = round2(allocations.reduce((s, a) => s + a.lineCost, 0));
  return { allocations, materialCost };
}
