// src/lib/costEngine.ts — the ONLY file allowed to import hyperformula
import { HyperFormula } from 'hyperformula';

export type CellCoord = { row: number; col: number }; // 0-based engine coords

/**
 * Converts a 0-based engine column index to its spreadsheet letter.
 * col 0 = A (product name), col 1 = B (qty), col 2 = C (first expense), etc.
 */
export function engineColLetter(col: number): string {
  let n = col;
  let letters = '';
  do {
    letters = String.fromCharCode(65 + (n % 26)) + letters;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return letters;
}

const CONSTANT_NAME_RE = /^[A-Z][A-Z0-9_]{1,30}$/;

export function isValidConstantName(name: string, engine: CostEngine): boolean {
  if (!CONSTANT_NAME_RE.test(name)) return false;
  const reserved = engine.getRegisteredFunctionNames().map(n => n.toUpperCase());
  return !reserved.includes(name.toUpperCase());
}

export class CostEngine {
  private hf: HyperFormula;
  private sheetId: number;

  constructor() {
    this.hf = HyperFormula.buildEmpty({
      licenseKey: 'gpl-v3', // free for this internal tool
      smartRounding: true,
    });
    this.sheetId = this.hf.getSheetId(this.hf.addSheet('costs'))!;
  }

  /** Register/update company-wide named values so formulas can use =100*SEED_RATE. Call BEFORE hydrate(). */
  registerConstants(constants: { name: string; value: number }[]) {
    const existing = this.hf.listNamedExpressions();
    for (const c of constants) {
      if (existing.includes(c.name)) this.hf.changeNamedExpression(c.name, c.value);
      else this.hf.addNamedExpression(c.name, c.value);
    }
  }

  getRegisteredFunctionNames() {
    return this.hf.getRegisteredFunctionNames();
  }

  /** Rebuild the whole sheet from DB data (load, add/remove product or column). */
  hydrate(matrix: (string | number | null)[][]) {
    this.hf.setSheetContent(this.sheetId, matrix);
  }

  /** Write raw user input ("450" or "=100*SEED_RATE"). Returns all changed cells. */
  setCell({ row, col }: CellCoord, raw: string) {
    const value = raw.trim() === '' ? null
      : raw.startsWith('=') ? raw
      : isNaN(Number(raw)) ? raw : Number(raw);
    return this.hf.setCellContents({ sheet: this.sheetId, row, col }, [[value]]);
  }

  getValue(c: CellCoord) { return this.hf.getCellValue({ sheet: this.sheetId, ...c }); }
  getFormula(c: CellCoord) { return this.hf.getCellFormula({ sheet: this.sheetId, ...c }); }

  getPrecedents(c: CellCoord) { return this.hf.getCellPrecedents({ sheet: this.sheetId, ...c }); }
  getDependents(c: CellCoord) { return this.hf.getCellDependents({ sheet: this.sheetId, ...c }); }

  validateFormula(raw: string) { return this.hf.validateFormula(raw); }

  destroy() { this.hf.destroy(); }
}
