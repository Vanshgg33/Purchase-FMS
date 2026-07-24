import { describe, it, expect } from 'vitest';
import { computeByProductCredit, reconcileYield } from '../byproduct';
import { AppError } from '@/lib/costErrors';

describe('by-product credit & yield reconciliation', () => {
  it('T15: by-product credit 420 x 28 -> ₹11,760.00', () => {
    expect(computeByProductCredit([{ quantity: 420, realisableRatePerUnit: 28 }])).toBe(11760);
  });

  it('T28: yield exceeds input throws YIELD_EXCEEDS_INPUT', () => {
    try {
      reconcileYield({ inputQty: 600, primaryOutputQty: 500, byProductQtyTotal: 200 });
      expect.fail('should have thrown');
    } catch (e) {
      expect((e as AppError).code).toBe('YIELD_EXCEEDS_INPUT');
    }
  });

  it('T29: loss > 5% returns a warning, does not throw', () => {
    const result = reconcileYield({ inputQty: 600, primaryOutputQty: 168, byProductQtyTotal: 380 });
    expect(result.warning).toBe('Unusually high process loss');
    expect(result.lossPercent).toBeGreaterThan(5);
  });

  it('normal loss (2%) within tolerance -> no warning', () => {
    const result = reconcileYield({ inputQty: 600, primaryOutputQty: 168, byProductQtyTotal: 420 });
    expect(result.lossPercent).toBe(2);
    expect(result.warning).toBeNull();
  });
});
