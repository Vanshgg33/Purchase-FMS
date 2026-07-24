import { describe, it, expect } from 'vitest';
import { computeLandedCost } from '../landed';
import { AppError } from '@/lib/costErrors';

describe('computeLandedCost', () => {
  it('T01: landed cost, single line, worked example -> 104.0000/kg', () => {
    const result = computeLandedCost({
      items: [{ quantity: 1000, ratePerUnit: 95, gstRate: 5 }],
      freightCharges: 3000,
      loadingCharges: 800,
      otherCharges: 450,
      gstTreatment: 'INCLUSIVE',
    });
    expect(result.items[0].landedCostPerUnit).toBe(104.0);
    expect(result.totalLandedAmount).toBe(104000.0);
  });

  it('T02: landed cost with gstTreatment CREDITABLE -> 99.2500/kg', () => {
    const result = computeLandedCost({
      items: [{ quantity: 1000, ratePerUnit: 95, gstRate: 5 }],
      freightCharges: 3000,
      loadingCharges: 800,
      otherCharges: 450,
      gstTreatment: 'CREDITABLE',
    });
    expect(result.items[0].landedCostPerUnit).toBe(99.25);
  });

  it('T03: freight apportionment across 2 lines by value sums exactly to the total', () => {
    const result = computeLandedCost({
      items: [
        { quantity: 600, ratePerUnit: 100, gstRate: 5 },
        { quantity: 400, ratePerUnit: 50, gstRate: 5 },
      ],
      freightCharges: 1000,
      loadingCharges: 0,
      otherCharges: 0,
      gstTreatment: 'INCLUSIVE',
    });
    const sum = result.items.reduce((s, i) => s + i.allocatedFreight, 0);
    expect(sum).toBe(1000);
  });

  it('T04: apportionment residual on 3 lines with ₹1,000 freight sums to 1000.00, no 999.99', () => {
    const result = computeLandedCost({
      items: [
        { quantity: 333, ratePerUnit: 1, gstRate: 0 },
        { quantity: 333, ratePerUnit: 1, gstRate: 0 },
        { quantity: 334, ratePerUnit: 1, gstRate: 0 },
      ],
      freightCharges: 1000,
      loadingCharges: 0,
      otherCharges: 0,
      gstTreatment: 'INCLUSIVE',
    });
    const sum = result.items.reduce((s, i) => s + i.allocatedFreight, 0);
    expect(sum).toBe(1000);
  });

  it('T05: zero basic amount throws INVALID_PURCHASE_ZERO_VALUE', () => {
    expect(() =>
      computeLandedCost({
        items: [{ quantity: 0, ratePerUnit: 0, gstRate: 5 }],
        freightCharges: 0,
        loadingCharges: 0,
        otherCharges: 0,
        gstTreatment: 'INCLUSIVE',
      })
    ).toThrow(AppError);
    try {
      computeLandedCost({
        items: [{ quantity: 0, ratePerUnit: 0, gstRate: 5 }],
        freightCharges: 0,
        loadingCharges: 0,
        otherCharges: 0,
        gstTreatment: 'INCLUSIVE',
      });
    } catch (e) {
      expect((e as AppError).code).toBe('INVALID_PURCHASE_ZERO_VALUE');
    }
  });
});
