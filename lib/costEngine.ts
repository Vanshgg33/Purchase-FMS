import HyperFormula from 'hyperformula';

const SHEET_NAME = 'CostGrid';

export class CostEngine {
  private hf: HyperFormula;
  private sheetNumId: number;

  constructor() {
    this.hf = (HyperFormula as any).buildEmpty({ licenseKey: 'gpl-v3' });
    this.hf.addSheet(SHEET_NAME);
    this.sheetNumId = this.hf.getSheetId(SHEET_NAME)!;
  }

  registerConstants(constants: { name: string; value: number }[]) {
    for (const { name, value } of constants) {
      try {
        const expr = String(value);
        if (this.hf.isItPossibleToAddNamedExpression(name, expr)) {
          this.hf.addNamedExpression(name, expr);
        } else if (this.hf.isItPossibleToChangeNamedExpression(name, expr)) {
          this.hf.changeNamedExpression(name, expr);
        }
      } catch { /* ignore invalid names */ }
    }
  }

  hydrate(matrix: (string | number | null)[][]) {
    this.hf.setSheetContent(this.sheetNumId, matrix);
  }

  validateFormula(raw: string): boolean {
    try {
      return this.hf.validateFormula(raw);
    } catch {
      return false;
    }
  }

  setCell(address: { row: number; col: number }, raw: string): { row: number; col: number }[] {
    const value = raw === '' ? null : raw;
    const changes = this.hf.setCellContents(
      { sheet: this.sheetNumId, row: address.row, col: address.col },
      [[value]],
    );
    return changes
      .filter((c: any) => c.address)
      .map((c: any) => ({ row: c.address.row, col: c.address.col }));
  }

  destroy() {
    this.hf.destroy();
  }
}

export function engineColLetter(col: number): string {
  let result = '';
  let n = col + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}
