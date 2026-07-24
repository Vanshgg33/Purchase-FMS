import RateMaster from '@/models/RateMaster';
import { AppError } from '@/lib/costErrors';
import type { RateType } from '@/types/costTracker';

/** Rate lookup rule (spec §4.17): the row with the latest effectiveFrom that is <= productionDate. Never just "the active one." */
export async function resolveRate(rateType: RateType, productionDate: Date): Promise<number> {
  const rate = await RateMaster.findOne({ rateType, isActive: true, effectiveFrom: { $lte: productionDate } })
    .sort({ effectiveFrom: -1 })
    .lean();
  if (!rate) throw new AppError('NOT_FOUND', `No effective ${rateType} rate found for ${productionDate.toDateString()}`);
  return (rate as any).rate;
}

export function labourRateType(labourType: 'SKILLED' | 'UNSKILLED' | 'CONTRACT'): RateType {
  return `LABOUR_${labourType}` as RateType;
}
