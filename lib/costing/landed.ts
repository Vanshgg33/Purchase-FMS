// Naturelite Manufacturing Cost Tracker — landed cost apportionment (spec §5.3)
import { round2, round4 } from './round';
import { AppError } from '@/lib/costErrors';
import type { GstTreatment } from '@/types/costTracker';

export interface LandedCostItemInput {
  quantity: number;
  ratePerUnit: number;
  gstRate: number;
}

export interface LandedCostInput {
  items: LandedCostItemInput[];
  freightCharges: number;
  loadingCharges: number;
  otherCharges: number;
  gstTreatment: GstTreatment;
}

export interface LandedCostItemResult {
  taxableValue: number;
  gstValue: number;
  allocatedFreight: number;
  allocatedLoading: number;
  allocatedOther: number;
  landedValue: number;
  landedCostPerUnit: number;
}

export interface LandedCostResult {
  items: LandedCostItemResult[];
  basicAmount: number;
  gstAmount: number;
  totalLandedAmount: number;
}

/** R7 — allocate all but the last line normally, last line absorbs the residual. */
function allocateWithResidual(total: number, weights: number[]): number[] {
  const out: number[] = [];
  let runningSum = 0;
  for (let i = 0; i < weights.length - 1; i++) {
    const share = round2(total * weights[i]);
    out.push(share);
    runningSum += share;
  }
  out.push(round2(total - runningSum));
  return out;
}

export function computeLandedCost(input: LandedCostInput): LandedCostResult {
  const { items, freightCharges, loadingCharges, otherCharges, gstTreatment } = input;
  if (items.length === 0) throw new AppError('EMPTY_PURCHASE', 'Purchase must have at least one line item');

  const taxableValues = items.map(i => i.quantity * i.ratePerUnit);
  const gstValues = items.map((i, idx) => (taxableValues[idx] * i.gstRate) / 100);

  const basicAmountRaw = taxableValues.reduce((a, b) => a + b, 0);
  if (basicAmountRaw === 0) {
    throw new AppError('INVALID_PURCHASE_ZERO_VALUE', 'Basic amount is zero');
  }
  const gstAmountRaw = gstValues.reduce((a, b) => a + b, 0);
  const weights = taxableValues.map(tv => tv / basicAmountRaw);

  const freightAlloc = allocateWithResidual(freightCharges, weights);
  const loadingAlloc = allocateWithResidual(loadingCharges, weights);
  const otherAlloc = allocateWithResidual(otherCharges, weights);

  const itemResults: LandedCostItemResult[] = items.map((item, i) => {
    const taxableValue = round2(taxableValues[i]);
    const gstValue = round2(gstValues[i]);
    const allocatedFreight = freightAlloc[i];
    const allocatedLoading = loadingAlloc[i];
    const allocatedOther = otherAlloc[i];

    let landedValue = taxableValue + allocatedFreight + allocatedLoading + allocatedOther;
    if (gstTreatment === 'INCLUSIVE') landedValue += gstValue;
    landedValue = round2(landedValue);

    const landedCostPerUnit = round4(landedValue / item.quantity);

    return { taxableValue, gstValue, allocatedFreight, allocatedLoading, allocatedOther, landedValue, landedCostPerUnit };
  });

  const basicAmount = round2(basicAmountRaw);
  const gstAmount = round2(gstAmountRaw);
  const totalLandedAmount = round2(itemResults.reduce((a, r) => a + r.landedValue, 0));

  return { items: itemResults, basicAmount, gstAmount, totalLandedAmount };
}
