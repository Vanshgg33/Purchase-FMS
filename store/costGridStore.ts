import { create } from 'zustand';
import { CostEngine, engineColLetter } from '@/lib/costEngine';
import { toStoredRaw, type ColumnType } from '@/lib/currency';

export interface CostProductLite {
  _id: string;
  name: string;
  sku?: string;
  unit: string;
  position: number;
}

export interface CostColumnLite {
  _id: string;
  label: string;
  type: ColumnType;
  color: string;
  position: number;
}

export interface DirtyCell { productId: string; columnId: string; rawValue: string; }

export type SaveState = 'saved' | 'syncing' | 'offline';

interface CostGridState {
  ready: boolean;
  products: CostProductLite[];
  columns: CostColumnLite[];
  cellMap: Record<string, string>;
  engine: CostEngine;
  selected: { row: number; col: number } | null;
  flash: Set<string>;
  dirty: Map<string, DirtyCell>;
  saveState: SaveState;
  toast: { message: string; kind: 'error' | 'info' } | null;

  hydrate: (products: CostProductLite[], columns: CostColumnLite[], cells: DirtyCell[]) => void;
  rebuildEngine: () => void;
  select: (row: number, col: number) => void;
  commitCell: (productIndex: number, columnIndex: number, raw: string) => { ok: true } | { ok: false; error: string };
  scheduleSave: () => void;
  flush: () => Promise<void>;
  setToast: (message: string, kind?: 'error' | 'info') => void;

  addProduct: (p: CostProductLite) => void;
  removeProduct: (id: string) => void;
  patchProduct: (id: string, patch: Partial<CostProductLite>) => void;
  addColumn: (c: CostColumnLite) => void;
  removeColumn: (id: string) => void;
  patchColumn: (id: string, patch: Partial<CostColumnLite>) => void;
}

function cellKey(productId: string, columnId: string) { return `${productId}:${columnId}`; }

/** Engine col 0 = product name (A), col 1..N = expense columns (B..), col N+1 = virtual Final Cost. */
function buildMatrix(
  products: CostProductLite[],
  columns: CostColumnLite[],
  cellMap: Record<string, string>,
): (string | number | null)[][] {
  const header = ['Product', ...columns.map(c => c.label), 'Final Cost'];
  const rows = products.map((p, pi) => {
    const sheetRow = pi + 2; // 1-based sheet row; header occupies row 1
    const expenseCells = columns.map(c => {
      const raw = cellMap[cellKey(p._id, c._id)] ?? '';
      if (raw === '') return null;
      if (raw.startsWith('=')) return raw;
      const num = Number(raw);
      return Number.isNaN(num) ? raw : num;
    });
    const total = columns.length === 0
      ? 0
      : `=SUM(B${sheetRow}:${engineColLetter(columns.length)}${sheetRow})`;
    return [p.name, ...expenseCells, total];
  });
  return [header, ...rows];
}

let pendingTimer: ReturnType<typeof setTimeout> | null = null;

export const useCostGridStore = create<CostGridState>((set, get) => ({
  ready: false,
  products: [],
  columns: [],
  cellMap: {},
  engine: new CostEngine(),
  selected: null,
  flash: new Set(),
  dirty: new Map(),
  saveState: 'saved',
  toast: null,

  hydrate: (products, columns, cells) => {
    const cellMap: Record<string, string> = {};
    for (const c of cells) cellMap[cellKey(c.productId, c.columnId)] = c.rawValue;
    get().engine.hydrate(buildMatrix(products, columns, cellMap));
    set({ products, columns, cellMap, ready: true });
  },

  rebuildEngine: () => {
    const { engine, products, columns, cellMap } = get();
    engine.hydrate(buildMatrix(products, columns, cellMap));
    set({ products: [...products] });
  },

  select: (row, col) => set({ selected: { row, col } }),

  commitCell: (productIndex, columnIndex, rawInput) => {
    const { engine, products, columns, cellMap, dirty } = get();
    const column = columns[columnIndex];
    const product = products[productIndex];
    const raw = toStoredRaw(rawInput, column.type);

    if (raw.startsWith('=') && !engine.validateFormula(raw)) {
      return { ok: false, error: 'Invalid formula' };
    }

    const row = productIndex + 1;
    const col = columnIndex + 1;
    const changes = engine.setCell({ row, col }, raw);

    const key = cellKey(product._id, column._id);
    const nextCellMap = { ...cellMap, [key]: raw };

    const flash = new Set<string>();
    for (const change of changes) {
      if ('row' in change) flash.add(`${change.row}:${change.col}`);
    }

    const nextDirty = new Map(dirty);
    nextDirty.set(key, { productId: product._id, columnId: column._id, rawValue: raw });

    set({ cellMap: nextCellMap, flash, dirty: nextDirty });
    setTimeout(() => set(state => {
      if (state.flash !== flash) return {};
      return { flash: new Set<string>() };
    }), 300);

    get().scheduleSave();
    return { ok: true };
  },

  scheduleSave: () => {
    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => { get().flush(); }, 800);
  },

  flush: async () => {
    const cells = Array.from(get().dirty.values());
    if (cells.length === 0) return;
    set({ saveState: 'syncing' });
    try {
      const res = await fetch('/api/cost-tracker/cells', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cells }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Save failed');
      }
      set(state => {
        const nextDirty = new Map(state.dirty);
        for (const c of cells) {
          const k = cellKey(c.productId, c.columnId);
          // only drop it if nothing newer overwrote it while this request was in flight
          if (nextDirty.get(k)?.rawValue === c.rawValue) nextDirty.delete(k);
        }
        return { dirty: nextDirty, saveState: nextDirty.size > 0 ? 'syncing' : 'saved' };
      });
      if (get().dirty.size > 0) {
        if (pendingTimer) clearTimeout(pendingTimer);
        pendingTimer = setTimeout(() => { get().flush(); }, 800);
      }
    } catch {
      set({ saveState: 'offline' });
      get().setToast('Save failed — retrying', 'error');
      if (pendingTimer) clearTimeout(pendingTimer);
      pendingTimer = setTimeout(() => { get().flush(); }, 4000);
    }
  },

  setToast: (message, kind = 'info') => {
    set({ toast: { message, kind } });
    setTimeout(() => set(state => (state.toast?.message === message ? { toast: null } : {})), 3500);
  },

  addProduct: (p) => {
    set(state => ({ products: [...state.products, p] }));
    get().rebuildEngine();
  },
  removeProduct: (id) => {
    set(state => ({
      products: state.products.filter(p => p._id !== id),
      cellMap: Object.fromEntries(Object.entries(state.cellMap).filter(([k]) => !k.startsWith(`${id}:`))),
    }));
    get().rebuildEngine();
  },
  patchProduct: (id, patch) => {
    set(state => ({ products: state.products.map(p => (p._id === id ? { ...p, ...patch } : p)) }));
    get().rebuildEngine();
  },

  addColumn: (c) => {
    set(state => ({ columns: [...state.columns, c] }));
    get().rebuildEngine();
  },
  removeColumn: (id) => {
    set(state => ({
      columns: state.columns.filter(c => c._id !== id),
      cellMap: Object.fromEntries(Object.entries(state.cellMap).filter(([k]) => !k.endsWith(`:${id}`))),
    }));
    get().rebuildEngine();
  },
  patchColumn: (id, patch) => {
    set(state => ({ columns: state.columns.map(c => (c._id === id ? { ...c, ...patch } : c)) }));
    get().rebuildEngine();
  },
}));
