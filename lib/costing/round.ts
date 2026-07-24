// Naturelite Manufacturing Cost Tracker — rounding rules (spec §5.2, R1–R7)

export const round2 = (n: number): number =>
  Math.round((n + Number.EPSILON) * 100) / 100;

export const round4 = (n: number): number =>
  Math.round((n + Number.EPSILON) * 10000) / 10000;

/** R5 — never compare money with ===. */
export const moneyEquals = (a: number, b: number): boolean => Math.abs(a - b) < 0.005;
