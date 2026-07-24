import { describe, it, expect } from 'vitest';
import { consumeFIFO } from '../fifo';
import { AppError } from '@/lib/costErrors';

describe('consumeFIFO', () => {
  it('T06: single lot sufficient -> one allocation, correct cost', () => {
    const result = consumeFIFO(
      [{ lotId: 'L1', availableQuantity: 1000, uom: 'KG', landedCostPerUnit: 104, receivedDate: '2026-07-15' }],
      600,
      'KG'
    );
    expect(result.allocations).toHaveLength(1);
    expect(result.materialCost).toBe(62400);
  });

  it('T07: FIFO across two lots (400@104 + 200@109.50) -> ₹63,500.00', () => {
    const result = consumeFIFO(
      [
        { lotId: 'L2', availableQuantity: 200, uom: 'KG', landedCostPerUnit: 109.5, receivedDate: '2026-07-20' },
        { lotId: 'L1', availableQuantity: 400, uom: 'KG', landedCostPerUnit: 104, receivedDate: '2026-07-15' },
      ],
      600,
      'KG'
    );
    expect(result.materialCost).toBe(63500);
    expect(result.allocations[0].lotId).toBe('L1');
    expect(result.allocations[1].lotId).toBe('L2');
  });

  it('T08: FIFO insufficient stock throws INSUFFICIENT_STOCK with shortfall', () => {
    try {
      consumeFIFO([{ lotId: 'L1', availableQuantity: 340, uom: 'KG', landedCostPerUnit: 104, receivedDate: '2026-07-15' }], 600, 'KG');
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).code).toBe('INSUFFICIENT_STOCK');
      expect((e as AppError).extra?.shortfall).toBe(260);
    }
  });

  it('T09: FIFO ordering by receivedDate -> oldest lot drawn first', () => {
    const result = consumeFIFO(
      [
        { lotId: 'NEW', availableQuantity: 500, uom: 'KG', landedCostPerUnit: 200, receivedDate: '2026-08-01' },
        { lotId: 'OLD', availableQuantity: 500, uom: 'KG', landedCostPerUnit: 100, receivedDate: '2026-01-01' },
      ],
      100,
      'KG'
    );
    expect(result.allocations[0].lotId).toBe('OLD');
  });

  it('T10: UOM mismatch throws UOM_MISMATCH', () => {
    try {
      consumeFIFO([{ lotId: 'L1', availableQuantity: 1000, uom: 'LITRE', landedCostPerUnit: 104, receivedDate: '2026-07-15' }], 600, 'KG');
      expect.fail('should have thrown');
    } catch (e) {
      expect((e as AppError).code).toBe('UOM_MISMATCH');
    }
  });
});
