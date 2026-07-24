// Naturelite Manufacturing Cost Tracker — by-product credit & yield reconciliation (spec §5.5)
import { round2 } from './round';
import { AppError } from '@/lib/costErrors';

export interface ByProductRow {
  quantity: number;
  realisableRatePerUnit: number;
}

export function computeByProductCredit(byProducts: ByProductRow[]): number {
  return round2(byProducts.reduce((s, bp) => s + round2(bp.quantity * bp.realisableRatePerUnit), 0));
}

export interface YieldReconciliationInput {
  inputQty: number;
  primaryOutputQty: number;
  byProductQtyTotal: number;
}

export interface YieldReconciliationResult {
  outputQty: number;
  lossPercent: number;
  warning: string | null;
}

export function reconcileYield(input: YieldReconciliationInput): YieldReconciliationResult {
  const { inputQty, primaryOutputQty, byProductQtyTotal } = input;
  const outputQty = round2(primaryOutputQty + byProductQtyTotal);
  const lossPercent = inputQty === 0 ? 0 : round2(((inputQty - outputQty) / inputQty) * 100);

  if (lossPercent < 0) {
    throw new AppError('YIELD_EXCEEDS_INPUT', 'Output quantity exceeds input quantity');
  }
  const warning = lossPercent > 5 ? 'Unusually high process loss' : null;
  return { outputQty, lossPercent, warning };
}
