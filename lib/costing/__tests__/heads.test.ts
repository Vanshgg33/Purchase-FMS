import { describe, it, expect } from 'vitest';
import { computeLabourCost, computeElectricityCost, computeTotalPackagingCostPerUnit, computeOverheadRatePerUnit } from '../heads';

describe('cost heads', () => {
  it('T11: labour cost, 3 workers x 8 hrs x ₹65 -> ₹1,560.00', () => {
    expect(computeLabourCost([{ totalHours: 3 * 8, hourlyRate: 65 }])).toBe(1560);
  });

  it('T12: electricity, 7.5 x ₹92 -> ₹690.00', () => {
    expect(computeElectricityCost([{ hours: 7.5, electricityRatePerHour: 92 }])).toBe(690);
  });

  it('T13: packaging with fractional BOM qty (carton 0.1111) -> ₹20.00/unit', () => {
    const totalPerUnit = computeTotalPackagingCostPerUnit([
      { qtyPerUnit: 1, rateSnapshot: 12.5 }, // bottle
      { qtyPerUnit: 1, rateSnapshot: 1.8 }, // cap
      { qtyPerUnit: 1, rateSnapshot: 2.2 }, // label
      { qtyPerUnit: 0.1111, rateSnapshot: 31.5 }, // carton (9 units/carton)
    ]);
    expect(totalPerUnit).toBe(20.0);
  });

  it('T14: overhead rate 180000 / 6000 -> ₹30.0000', () => {
    expect(computeOverheadRatePerUnit(180000, 6000)).toBe(30.0);
  });
});
