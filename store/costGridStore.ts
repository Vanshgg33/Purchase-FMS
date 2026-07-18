import { create } from 'zustand';
import { CostEngine, engineColLetter } from '@/lib/costEngine';
import { buildCostMatrix, getColumnOffsets } from '@/lib/costMatrix';
import { toStoredRaw, type ColumnType } from '@/lib/currency';

export interface CostPhoto { _id: string; url: string; isPrimary: boolean; position: number; }

export interface CostProductLite {
  _id: string;
  name: string;
  sku?: string;
  unit: string;
  batchQty: number;
  baseAmount: number;
  sellingPrice: number;
  priceLocked: boolean;
  position: number;
  photos: CostPhoto[];
}

export interface CostColumnLite {
  _id: string;
  label: string;
  type: ColumnType;
  color: string;
  position: number;
  locked: boolean;
}

export interface CostConstantLite { _id: string; name: string; value: number; description?: string; }

export interface DirtyCell { productId: string; columnId: string; rawValue: string; note?: string | null; }

export type SaveState = 'saved' | 'syncing' | 'offline';

interface UndoEntry { productId: string; columnId: string; prevRaw: string; }

type CommitResult = { ok: true } | { ok: false; error: string; locked?: boolean };

interface CostGridState {
  ready: boolean;
  isPinAdmin: boolean;
  products: CostProductLite[];
  columns: CostColumnLite[];
  cellMap: Record<string, string>;
  noteMap: Record<string, string>;
  totalOverrides: Record<string, string>;
  constants: CostConstantLite[];
  settings: { marginThreshold: number };
  engine: CostEngine;
  liveEngine: CostEngine;
  /** Bumped on every engine mutation that isn't reflected in cellMap (constants, sandbox swaps) — components read this to know to re-pull computed values from the engine. */
  recalcVersion: number;
  selected: { row: number; col: number } | null;
  flash: Set<string>;
  dirty: Map<string, DirtyCell>;
  saveState: SaveState;
  toast: { message: string; kind: 'error' | 'info' } | null;
  undoStack: UndoEntry[];

  sandbox: boolean;
  sandboxPendingCells: Map<string, DirtyCell>;
  sandboxProductOverrides: Map<string, { batchQty?: number; baseAmount?: number; sellingPrice?: number }>;

  hydrate: (data: {
    products: CostProductLite[];
    columns: CostColumnLite[];
    cells: DirtyCell[];
    totalOverrides: { productId: string; formula: string }[];
    constants: CostConstantLite[];
    settings: { marginThreshold: number };
    isPinAdmin: boolean;
  }) => void;
  rebuildEngine: () => void;
  select: (row: number, col: number) => void;

  commitCell: (productIndex: number, columnIndex: number, raw: string) => CommitResult;
  commitQty: (productIndex: number, raw: string) => CommitResult;
  commitBaseAmount: (productIndex: number, raw: string) => CommitResult;
  commitSellPrice: (productIndex: number, raw: string) => CommitResult & { needsUnlock?: boolean };
  setNote: (productId: string, columnId: string, note: string | null) => void;
  undo: () => void;

  scheduleSave: () => void;
  flush: () => Promise<void>;
  setToast: (message: string, kind?: 'error' | 'info') => void;

  addProduct: (p: CostProductLite) => void;
  removeProduct: (id: string) => void;
  patchProduct: (id: string, patch: Partial<CostProductLite>) => void;
  addColumn: (c: CostColumnLite) => void;
  removeColumn: (id: string) => void;
  patchColumn: (id: string, patch: Partial<CostColumnLite>) => void;
  moveColumn: (id: string, direction: 'left' | 'right') => void;
  moveProduct: (id: string, direction: 'up' | 'down') => void;

  setPhotos: (productId: string, photos: CostPhoto[]) => void;
  setConstants: (constants: CostConstantLite[]) => void;
  setSettings: (settings: { marginThreshold: number }) => void;
  setTotalOverride: (productId: string, formula: string | null) => void;
  setPinAdmin: (v: boolean) => void;

  enterSandbox: () => void;
  applySandbox: () => Promise<{ needsUnlock: boolean }>;
  discardSandbox: () => void;
}

function cellKey(productId: string, columnId: string) { return `${productId}:${columnId}`; }

let pendingTimer: ReturnType<typeof setTimeout> | null = null;

function matrixFrom(products: CostProductLite[], columns: CostColumnLite[], cellMap: Record<string, string>, totalOverrides: Record<string, string>) {
  return buildCostMatrix(
    products.map(p => ({ _id: p._id, name: p.name, batchQty: p.batchQty, baseAmount: p.baseAmount, sellingPrice: p.sellingPrice })),
    columns.map(c => ({ _id: c._id })),
    cellMap,
    totalOverrides,
  );
}

export const useCostGridStore = create<CostGridState>((set, get) => ({
  ready: false,
  isPinAdmin: false,
  products: [],
  columns: [],
  cellMap: {},
  noteMap: {},
  totalOverrides: {},
  constants: [],
  settings: { marginThreshold: 20 },
  engine: new CostEngine(),
  liveEngine: new CostEngine(),
  recalcVersion: 0,
  selected: null,
  flash: new Set(),
  dirty: new Map(),
  saveState: 'saved',
  toast: null,
  undoStack: [],

  sandbox: false,
  sandboxPendingCells: new Map(),
  sandboxProductOverrides: new Map(),

  hydrate: ({ products, columns, cells, totalOverrides, constants, settings, isPinAdmin }) => {
    const cellMap: Record<string, string> = {};
    const noteMap: Record<string, string> = {};
    for (const c of cells) {
      cellMap[cellKey(c.productId, c.columnId)] = c.rawValue;
      if (c.note) noteMap[cellKey(c.productId, c.columnId)] = c.note;
    }
    const overrideMap: Record<string, string> = {};
    for (const o of totalOverrides) overrideMap[o.productId] = o.formula;

    const { liveEngine } = get();
    liveEngine.registerConstants(constants.map(c => ({ name: c.name, value: c.value })));
    liveEngine.hydrate(matrixFrom(products, columns, cellMap, overrideMap));

    set({
      products, columns, cellMap, noteMap, totalOverrides: overrideMap,
      constants, settings, isPinAdmin, ready: true, engine: liveEngine,
    });
  },

  rebuildEngine: () => {
    const { engine, products, columns, cellMap, totalOverrides, recalcVersion } = get();
    engine.hydrate(matrixFrom(products, columns, cellMap, totalOverrides));
    set({ products: [...products], recalcVersion: recalcVersion + 1 });
  },

  select: (row, col) => set({ selected: { row, col } }),

  commitCell: (productIndex, columnIndex, rawInput) => {
    const state = get();
    const column = state.columns[columnIndex];
    const product = state.products[productIndex];
    if (column.locked && !state.isPinAdmin && !state.sandbox) {
      return { ok: false, error: 'Locked — superadmin only', locked: true };
    }

    const raw = toStoredRaw(rawInput, column.type);
    if (raw.startsWith('=') && !state.engine.validateFormula(raw)) {
      return { ok: false, error: 'Invalid formula' };
    }

    const offsets = getColumnOffsets(state.columns.length);
    const row = productIndex + 1;
    const col = offsets.firstExpenseCol + columnIndex;
    const changes = state.engine.setCell({ row, col }, raw);

    const key = cellKey(product._id, column._id);
    const prevRaw = state.cellMap[key] ?? '';
    const nextCellMap = { ...state.cellMap, [key]: raw };

    const flash = new Set<string>();
    for (const change of changes) if ('row' in change) flash.add(`${change.row}:${change.col}`);

    if (state.sandbox) {
      const nextPending = new Map(state.sandboxPendingCells);
      nextPending.set(key, { productId: product._id, columnId: column._id, rawValue: raw });
      set({ cellMap: nextCellMap, flash, sandboxPendingCells: nextPending, recalcVersion: state.recalcVersion + 1 });
    } else {
      const undoStack = [...state.undoStack, { productId: product._id, columnId: column._id, prevRaw }].slice(-50);
      const nextDirty = new Map(state.dirty);
      const existingNote = nextDirty.get(key)?.note;
      nextDirty.set(key, { productId: product._id, columnId: column._id, rawValue: raw, note: existingNote });
      set({ cellMap: nextCellMap, flash, dirty: nextDirty, undoStack, recalcVersion: state.recalcVersion + 1 });
      get().scheduleSave();
    }

    setTimeout(() => set(s => (s.flash === flash ? { flash: new Set<string>() } : {})), 300);
    return { ok: true };
  },

  commitQty: (productIndex, rawInput) => {
    const state = get();
    const n = Number(rawInput);
    if (rawInput.trim() === '' || Number.isNaN(n) || n < 0) return { ok: false, error: 'Qty must be a non-negative number' };

    const product = state.products[productIndex];
    const row = productIndex + 1;
    const offsets = getColumnOffsets(state.columns.length);
    const changes = state.engine.setCell({ row, col: offsets.qtyCol }, String(n));
    const flash = new Set<string>();
    for (const change of changes) if ('row' in change) flash.add(`${change.row}:${change.col}`);

    if (state.sandbox) {
      const next = new Map(state.sandboxProductOverrides);
      next.set(product._id, { ...next.get(product._id), batchQty: n });
      set({ flash, sandboxProductOverrides: next, recalcVersion: state.recalcVersion + 1 });
    } else {
      const prevQty = product.batchQty;
      get().patchProduct(product._id, { batchQty: n });
      set({ flash, recalcVersion: get().recalcVersion + 1 });
      fetch(`/api/cost-tracker/products/${product._id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ batchQty: n }),
      }).then(async res => {
        if (!res.ok) {
          get().patchProduct(product._id, { batchQty: prevQty });
          state.engine.setCell({ row, col: offsets.qtyCol }, String(prevQty));
          set({ recalcVersion: get().recalcVersion + 1 });
          const body = await res.json().catch(() => ({}));
          get().setToast(body?.error || 'Failed to save quantity', 'error');
        }
      }).catch(() => get().setToast('Failed to save quantity', 'error'));
    }
    setTimeout(() => set(s => (s.flash === flash ? { flash: new Set<string>() } : {})), 300);
    return { ok: true };
  },

  commitBaseAmount: (productIndex, rawInput) => {
    const state = get();
    const n = Number(rawInput);
    if (rawInput.trim() === '' || Number.isNaN(n) || n < 0) return { ok: false, error: 'Base Amount must be a non-negative number' };

    const product = state.products[productIndex];
    const row = productIndex + 1;
    const offsets = getColumnOffsets(state.columns.length);
    const changes = state.engine.setCell({ row, col: offsets.baseAmountCol }, String(n));
    const flash = new Set<string>();
    for (const change of changes) if ('row' in change) flash.add(`${change.row}:${change.col}`);

    if (state.sandbox) {
      const next = new Map(state.sandboxProductOverrides);
      next.set(product._id, { ...next.get(product._id), baseAmount: n });
      set({ flash, sandboxProductOverrides: next, recalcVersion: state.recalcVersion + 1 });
    } else {
      const prevBase = product.baseAmount;
      get().patchProduct(product._id, { baseAmount: n });
      set({ flash, recalcVersion: get().recalcVersion + 1 });
      fetch(`/api/cost-tracker/products/${product._id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baseAmount: n }),
      }).then(async res => {
        if (!res.ok) {
          get().patchProduct(product._id, { baseAmount: prevBase });
          state.engine.setCell({ row, col: offsets.baseAmountCol }, String(prevBase));
          set({ recalcVersion: get().recalcVersion + 1 });
          const body = await res.json().catch(() => ({}));
          get().setToast(body?.error || 'Failed to save base amount', 'error');
        }
      }).catch(() => get().setToast('Failed to save base amount', 'error'));
    }
    setTimeout(() => set(s => (s.flash === flash ? { flash: new Set<string>() } : {})), 300);
    return { ok: true };
  },

  commitSellPrice: (productIndex, rawInput) => {
    const state = get();
    const product = state.products[productIndex];
    if (product.priceLocked && !state.isPinAdmin && !state.sandbox) return { ok: false, error: 'Price is locked', needsUnlock: true };
    const n = Number(rawInput);
    if (rawInput.trim() === '' || Number.isNaN(n) || n < 0) return { ok: false, error: 'Price must be a non-negative number' };

    const row = productIndex + 1;
    const offsets = getColumnOffsets(state.columns.length);
    const changes = state.engine.setCell({ row, col: offsets.sellPriceCol }, String(n));
    const flash = new Set<string>();
    for (const change of changes) if ('row' in change) flash.add(`${change.row}:${change.col}`);

    if (state.sandbox) {
      const next = new Map(state.sandboxProductOverrides);
      next.set(product._id, { ...next.get(product._id), sellingPrice: n });
      set({ flash, sandboxProductOverrides: next, recalcVersion: state.recalcVersion + 1 });
    } else {
      const prevPrice = product.sellingPrice;
      get().patchProduct(product._id, { sellingPrice: n });
      set({ flash, recalcVersion: get().recalcVersion + 1 });
      fetch(`/api/cost-tracker/products/${product._id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sellingPrice: n }),
      }).then(async res => {
        if (!res.ok) {
          get().patchProduct(product._id, { sellingPrice: prevPrice });
          state.engine.setCell({ row, col: offsets.sellPriceCol }, String(prevPrice));
          set({ recalcVersion: get().recalcVersion + 1 });
          const body = await res.json().catch(() => ({}));
          get().setToast(body?.error || 'Failed to save price', 'error');
        }
      }).catch(() => get().setToast('Failed to save price', 'error'));
    }
    setTimeout(() => set(s => (s.flash === flash ? { flash: new Set<string>() } : {})), 300);
    return { ok: true };
  },

  setNote: (productId, columnId, note) => {
    const state = get();
    const key = cellKey(productId, columnId);
    const nextNoteMap = { ...state.noteMap };
    if (note && note.trim()) nextNoteMap[key] = note.trim();
    else delete nextNoteMap[key];

    const rawValue = state.cellMap[key] ?? '';
    if (state.sandbox) {
      const nextPending = new Map(state.sandboxPendingCells);
      nextPending.set(key, { productId, columnId, rawValue, note: note?.trim() || null });
      set({ noteMap: nextNoteMap, sandboxPendingCells: nextPending });
    } else {
      const nextDirty = new Map(state.dirty);
      nextDirty.set(key, { productId, columnId, rawValue, note: note?.trim() || null });
      set({ noteMap: nextNoteMap, dirty: nextDirty });
      get().scheduleSave();
    }
  },

  undo: () => {
    const state = get();
    if (state.sandbox || state.undoStack.length === 0) return;
    const entry = state.undoStack[state.undoStack.length - 1];
    const pi = state.products.findIndex(p => p._id === entry.productId);
    const ci = state.columns.findIndex(c => c._id === entry.columnId);
    set({ undoStack: state.undoStack.slice(0, -1) });
    if (pi === -1 || ci === -1) return;

    const column = state.columns[ci];
    const row = pi + 1;
    const offsets = getColumnOffsets(state.columns.length);
    const col = offsets.firstExpenseCol + ci;
    state.engine.setCell({ row, col }, entry.prevRaw);

    const key = cellKey(entry.productId, entry.columnId);
    const nextCellMap = { ...get().cellMap, [key]: entry.prevRaw };
    const nextDirty = new Map(get().dirty);
    nextDirty.set(key, { productId: entry.productId, columnId: entry.columnId, rawValue: entry.prevRaw });
    set({ cellMap: nextCellMap, dirty: nextDirty, recalcVersion: get().recalcVersion + 1 });
    get().scheduleSave();
    void column;
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
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cells }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Save failed');
      }
      set(state => {
        const nextDirty = new Map(state.dirty);
        for (const c of cells) {
          const k = cellKey(c.productId, c.columnId);
          const current = nextDirty.get(k);
          if (current && current.rawValue === c.rawValue && current.note === c.note) nextDirty.delete(k);
        }
        return { dirty: nextDirty, saveState: nextDirty.size > 0 ? 'syncing' : 'saved' };
      });
      if (get().dirty.size > 0) {
        if (pendingTimer) clearTimeout(pendingTimer);
        pendingTimer = setTimeout(() => { get().flush(); }, 800);
      }
    } catch (e: any) {
      set({ saveState: 'offline' });
      get().setToast(e?.message === 'Locked — superadmin only' ? e.message : 'Save failed — retrying', 'error');
      if (pendingTimer) clearTimeout(pendingTimer);
      pendingTimer = setTimeout(() => { get().flush(); }, 4000);
    }
  },

  setToast: (message, kind = 'info') => {
    set({ toast: { message, kind } });
    setTimeout(() => set(s => (s.toast?.message === message ? { toast: null } : {})), 3500);
  },

  addProduct: (p) => { set(s => ({ products: [...s.products, p] })); get().rebuildEngine(); },
  removeProduct: (id) => {
    set(s => ({
      products: s.products.filter(p => p._id !== id),
      cellMap: Object.fromEntries(Object.entries(s.cellMap).filter(([k]) => !k.startsWith(`${id}:`))),
    }));
    get().rebuildEngine();
  },
  patchProduct: (id, patch) => {
    set(s => ({ products: s.products.map(p => (p._id === id ? { ...p, ...patch } : p)) }));
    get().rebuildEngine();
  },

  addColumn: (c) => { set(s => ({ columns: [...s.columns, c] })); get().rebuildEngine(); },
  removeColumn: (id) => {
    set(s => ({
      columns: s.columns.filter(c => c._id !== id),
      cellMap: Object.fromEntries(Object.entries(s.cellMap).filter(([k]) => !k.endsWith(`:${id}`))),
    }));
    get().rebuildEngine();
  },
  patchColumn: (id, patch) => {
    set(s => ({ columns: s.columns.map(c => (c._id === id ? { ...c, ...patch } : c)) }));
    get().rebuildEngine();
  },

  moveColumn: (id, direction) => {
    const columns = [...get().columns];
    const i = columns.findIndex(c => c._id === id);
    const j = direction === 'left' ? i - 1 : i + 1;
    if (i === -1 || j < 0 || j >= columns.length) return;
    [columns[i], columns[j]] = [columns[j], columns[i]];
    const reindexed = columns.map((c, idx) => ({ ...c, position: idx }));
    set({ columns: reindexed });
    get().rebuildEngine();
    Promise.all([columns[i], columns[j]].map(c =>
      fetch(`/api/cost-tracker/columns/${c._id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ position: reindexed.find(x => x._id === c._id)!.position }),
      }),
    )).catch(() => get().setToast('Failed to save column order', 'error'));
  },

  moveProduct: (id, direction) => {
    const products = [...get().products];
    const i = products.findIndex(p => p._id === id);
    const j = direction === 'up' ? i - 1 : i + 1;
    if (i === -1 || j < 0 || j >= products.length) return;
    [products[i], products[j]] = [products[j], products[i]];
    const reindexed = products.map((p, idx) => ({ ...p, position: idx }));
    set({ products: reindexed });
    get().rebuildEngine();
    Promise.all([products[i], products[j]].map(p =>
      fetch(`/api/cost-tracker/products/${p._id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ position: reindexed.find(x => x._id === p._id)!.position }),
      }),
    )).catch(() => get().setToast('Failed to save product order', 'error'));
  },

  setPhotos: (productId, photos) => {
    set(s => ({ products: s.products.map(p => (p._id === productId ? { ...p, photos } : p)) }));
  },

  setConstants: (constants) => {
    const { engine, recalcVersion } = get();
    engine.registerConstants(constants.map(c => ({ name: c.name, value: c.value })));
    // BLUEPRINT-DECISION: HyperFormula's changeNamedExpression doesn't return which cells
    // changed, so we flash the whole grid rather than computing an exact dependency diff.
    set({ constants, recalcVersion: recalcVersion + 1, flash: new Set(['*']) });
    setTimeout(() => set(s => (s.flash.has('*') ? { flash: new Set<string>() } : {})), 300);
  },

  setSettings: (settings) => set({ settings }),

  setTotalOverride: (productId, formula) => {
    set(s => {
      const next = { ...s.totalOverrides };
      if (formula) next[productId] = formula; else delete next[productId];
      return { totalOverrides: next };
    });
    get().rebuildEngine();
  },

  setPinAdmin: (v) => set({ isPinAdmin: v }),

  enterSandbox: () => {
    const state = get();
    if (state.sandbox) return;
    const sandboxEngine = new CostEngine();
    sandboxEngine.registerConstants(state.constants.map(c => ({ name: c.name, value: c.value })));
    sandboxEngine.hydrate(matrixFrom(state.products, state.columns, state.cellMap, state.totalOverrides));
    set({
      sandbox: true, engine: sandboxEngine,
      sandboxPendingCells: new Map(), sandboxProductOverrides: new Map(),
      recalcVersion: state.recalcVersion + 1,
    });
  },

  discardSandbox: () => {
    const state = get();
    if (!state.sandbox) return;
    state.engine.destroy();
    set({
      sandbox: false, engine: state.liveEngine,
      sandboxPendingCells: new Map(), sandboxProductOverrides: new Map(),
      recalcVersion: state.recalcVersion + 1,
    });
    get().rebuildEngine();
  },

  applySandbox: async () => {
    const state = get();
    if (!state.sandbox) return { needsUnlock: false };

    // check for locked-column cells among pending changes — Apply demands unlock if present
    const lockedTouched = Array.from(state.sandboxPendingCells.values()).some(c => {
      const col = state.columns.find(cc => cc._id === c.columnId);
      return col?.locked;
    });
    if (lockedTouched && !state.isPinAdmin) return { needsUnlock: true };

    const priceLockTouched = Array.from(state.sandboxProductOverrides.entries()).some(([pid, patch]) => {
      const product = state.products.find(p => p._id === pid);
      return patch.sellingPrice !== undefined && product?.priceLocked;
    });
    if (priceLockTouched && !state.isPinAdmin) return { needsUnlock: true };

    // swap back to the live engine, then replay every pending change through the normal save paths
    const sandboxEngine = state.engine;
    set({ sandbox: false, engine: state.liveEngine, recalcVersion: state.recalcVersion + 1 });

    for (const [pid, patch] of state.sandboxProductOverrides.entries()) {
      const pi = get().products.findIndex(p => p._id === pid);
      if (pi === -1) continue;
      if (patch.batchQty !== undefined) get().commitQty(pi, String(patch.batchQty));
      if (patch.baseAmount !== undefined) get().commitBaseAmount(pi, String(patch.baseAmount));
      if (patch.sellingPrice !== undefined) get().commitSellPrice(pi, String(patch.sellingPrice));
    }
    for (const cell of state.sandboxPendingCells.values()) {
      const pi = get().products.findIndex(p => p._id === cell.productId);
      const ci = get().columns.findIndex(c => c._id === cell.columnId);
      if (pi === -1 || ci === -1) continue;
      get().commitCell(pi, ci, cell.rawValue);
      if (cell.note !== undefined) get().setNote(cell.productId, cell.columnId, cell.note);
    }

    sandboxEngine.destroy();
    set({ sandboxPendingCells: new Map(), sandboxProductOverrides: new Map() });
    return { needsUnlock: false };
  },
}));

export { engineColLetter };
