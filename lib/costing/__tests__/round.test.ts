import { describe, it, expect } from 'vitest';
import { round2, round4 } from '../round';

describe('round2 / round4', () => {
  it('T30: 0.1 + 0.2 through the money pipeline is 0.30, never 0.30000000000000004', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });

  it('rounds half up on positives', () => {
    expect(round2(1.005)).toBeCloseTo(1.01, 2);
    expect(round4(1.00005)).toBeCloseTo(1.0001, 4);
  });
});
