'use client';
import { Fragment, useEffect, useRef, useState } from 'react';
import {
  Plus, MoreVertical, Trash2, Pencil, X, Boxes, Lock, Unlock, LogOut,
  Download, Image as ImageIcon, History, Copy, ArrowUp, ArrowDown, ArrowLeftRight,
  Beaker, ChevronDown, ChevronRight, Sigma, FunctionSquare,
} from 'lucide-react';
import {
  useCostGridStore, type CostProductLite, type CostColumnLite, type DirtyCell,
  type SaveState, type CostConstantLite,
} from '@/store/costGridStore';
import { engineColLetter } from '@/lib/costEngine';
import { getColumnOffsets } from '@/lib/costMatrix';
import { toEditValue } from '@/lib/currency';
import { formatCellDisplay } from '@/lib/cellFormat';
import GridCell from './GridCell';
import QtyCell from './QtyCell';
import PricePill from './PricePill';
import UnlockDialog from './UnlockDialog';
import PhotoGallery from './PhotoGallery';
import ConstantsPanel from './ConstantsPanel';
import HistoryDrawer from './HistoryDrawer';
import FormulaInspector from './FormulaInspector';
import NotePopover from './NotePopover';
import BreakdownBar from './BreakdownBar';
import styles from './costTracker.module.css';

const SWATCHES = ['#22D3EE', '#A3E635', '#D2A8FF', '#FBBF24', '#F87171', '#38BDF8', '#F472B6', '#94A3B8'];
const UNITS = ['unit', 'kg', 'g', 'L', 'ml', 'pouch', 'bottle', 'box'];

interface Props {
  initialProducts: CostProductLite[];
  initialColumns: CostColumnLite[];
  initialCells: DirtyCell[];
  initialTotalOverrides: { productId: string; formula: string }[];
  initialConstants: CostConstantLite[];
  initialSettings: { marginThreshold: number };
  isPinAdmin: boolean;
}

export default function CostTrackerClient(props: Props) {
  const hydrate = useCostGridStore(s => s.hydrate);
  const ready = useCostGridStore(s => s.ready);
  const products = useCostGridStore(s => s.products);
  const columns = useCostGridStore(s => s.columns);
  const saveState = useCostGridStore(s => s.saveState);
  const toast = useCostGridStore(s => s.toast);
  const selected = useCostGridStore(s => s.selected);
  const select = useCostGridStore(s => s.select);
  const cellMap = useCostGridStore(s => s.cellMap);
  const totalOverrides = useCostGridStore(s => s.totalOverrides);
  const settings = useCostGridStore(s => s.settings);
  const isPinAdmin = useCostGridStore(s => s.isPinAdmin);
  const sandbox = useCostGridStore(s => s.sandbox);
  const engine = useCostGridStore(s => s.engine);
  useCostGridStore(s => s.recalcVersion);
  const commitCell = useCostGridStore(s => s.commitCell);
  const setToast = useCostGridStore(s => s.setToast);
  const addProduct = useCostGridStore(s => s.addProduct);
  const removeProduct = useCostGridStore(s => s.removeProduct);
  const patchProduct = useCostGridStore(s => s.patchProduct);
  const addColumn = useCostGridStore(s => s.addColumn);
  const removeColumn = useCostGridStore(s => s.removeColumn);
  const patchColumn = useCostGridStore(s => s.patchColumn);
  const moveColumn = useCostGridStore(s => s.moveColumn);
  const moveProduct = useCostGridStore(s => s.moveProduct);
  const setTotalOverride = useCostGridStore(s => s.setTotalOverride);
  const undo = useCostGridStore(s => s.undo);
  const enterSandbox = useCostGridStore(s => s.enterSandbox);
  const applySandbox = useCostGridStore(s => s.applySandbox);
  const discardSandbox = useCostGridStore(s => s.discardSandbox);

  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    hydrate({
      products: props.initialProducts, columns: props.initialColumns, cells: props.initialCells,
      totalOverrides: props.initialTotalOverrides, constants: props.initialConstants,
      settings: props.initialSettings, isPinAdmin: props.isPinAdmin,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [confirm, setConfirm] = useState<null | { title: string; body: string; onConfirm: () => void }>(null);
  const [openColMenu, setOpenColMenu] = useState<string | null>(null);
  const [openRowMenu, setOpenRowMenu] = useState<string | null>(null);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [galleryProduct, setGalleryProduct] = useState<CostProductLite | null>(null);
  const [historyProduct, setHistoryProduct] = useState<CostProductLite | null>(null);
  const [constantsOpen, setConstantsOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [note, setNoteAnchor] = useState<{ productId: string; columnId: string; anchor: HTMLElement } | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo]);

  function navigate(pi: number, ci: number, dRow: number, dCol: number) {
    if (products.length === 0) return;
    const nextPi = Math.min(Math.max(pi + dRow, 0), products.length - 1);
    const nextCi = Math.min(Math.max(ci + dCol, 0), Math.max(columns.length - 1, 0));
    select(nextPi + 1, nextCi + 2);
  }

  async function handleDeleteProduct(p: CostProductLite) {
    setConfirm({
      title: 'Delete product?',
      body: `"${p.name}" and all its cost cells, photos and history will be removed. This can't be undone.`,
      onConfirm: async () => {
        setConfirm(null);
        const res = await fetch(`/api/cost-tracker/products/${p._id}`, { method: 'DELETE' });
        if (res.status === 403) { setUnlockOpen(true); return; }
        if (!res.ok) { setToast('Failed to delete product', 'error'); return; }
        removeProduct(p._id);
      },
    });
  }

  async function handleDeleteColumn(c: CostColumnLite, force = false) {
    const res = await fetch(`/api/cost-tracker/columns/${c._id}${force ? '?force=true' : ''}`, { method: 'DELETE' });
    if (res.status === 403) { setUnlockOpen(true); return; }
    if (res.status === 409) {
      const body = await res.json();
      setConfirm({
        title: 'Column is used in formulas',
        body: `"${c.label}" is referenced by ${body.affected?.length ?? 'some'} formula cell(s). Deleting will turn those into #REF! errors. Delete anyway?`,
        onConfirm: () => { setConfirm(null); handleDeleteColumn(c, true); },
      });
      return;
    }
    if (!res.ok) { setToast('Failed to delete column', 'error'); return; }
    removeColumn(c._id);
  }

  async function toggleColumnLock(c: CostColumnLite) {
    const res = await fetch(`/api/cost-tracker/columns/${c._id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locked: !c.locked }),
    });
    if (res.status === 403) { setUnlockOpen(true); return; }
    if (!res.ok) { setToast('Failed to toggle lock', 'error'); return; }
    patchColumn(c._id, { locked: !c.locked });
  }

  async function duplicateProduct(p: CostProductLite) {
    const res = await fetch('/api/cost-tracker/products', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `${p.name} (copy)`, sku: p.sku, unit: p.unit, batchQty: p.batchQty, sellingPrice: p.sellingPrice }),
    });
    if (!res.ok) { setToast('Failed to duplicate product', 'error'); return; }
    const { product } = await res.json();
    addProduct({ ...product, _id: product._id, photos: [] });

    const cells = columns
      .map(c => ({ productId: product._id, columnId: c._id, rawValue: cellMap[`${p._id}:${c._id}`] ?? '' }))
      .filter(c => c.rawValue !== '');
    if (cells.length > 0) {
      await fetch('/api/cost-tracker/cells', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cells }),
      });
      const store = useCostGridStore.getState();
      const nextCellMap = { ...store.cellMap };
      for (const c of cells) nextCellMap[`${c.productId}:${c.columnId}`] = c.rawValue;
      useCostGridStore.setState({ cellMap: nextCellMap });
      store.rebuildEngine();
    }
  }

  async function handleApplySandbox() {
    const result = await applySandbox();
    if (result.needsUnlock) { setUnlockOpen(true); return; }
    setToast('Sandbox changes applied', 'info');
  }

  if (!ready) return <div className={styles.ctRoot}><div className={styles.emptyState}>Loading…</div></div>;

  const offsets = getColumnOffsets(columns.length);
  const selectedProductIndex = selected ? selected.row - 1 : -1;
  const selectedColumnIndex = selected ? selected.col - offsets.firstExpenseCol : -1;
  const selectedIsExpense = selected && selectedColumnIndex >= 0 && selectedColumnIndex < columns.length;
  const selectedKey = selectedIsExpense ? `${products[selectedProductIndex]?._id}:${columns[selectedColumnIndex]?._id}` : null;
  const selectedAddress = selected ? `${engineColLetter(selected.col)}${selected.row + 1}` : '';
  const selectedHasFormula = selected ? !!engine.getFormula({ row: selected.row, col: selected.col }) : false;

  return (
    <div className={`${styles.ctRoot} ${sandbox ? styles.sandboxActive : ''}`}>
      {sandbox && (
        <div className={styles.sandboxBanner}>
          <span>◤ SANDBOX — CHANGES NOT SAVED ◢</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={styles.btn} onClick={discardSandbox}>Discard</button>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleApplySandbox}>Apply</button>
          </div>
        </div>
      )}

      <div className={styles.topbar}>
        <div className={styles.topbarTitle}>⬡ COST<span>_TRACKER_PRO</span></div>
        <div className={styles.topbarActions}>
          <button className={styles.btn} onClick={() => setShowAddProduct(true)}><Plus size={14} /> Product</button>
          <button className={styles.btn} onClick={() => setShowAddColumn(true)}><Plus size={14} /> Column</button>
          <button className={styles.btn} onClick={() => setConstantsOpen(true)}><Sigma size={14} /> Constants</button>
          <button className={styles.btn} onClick={() => (sandbox ? discardSandbox() : enterSandbox())}>
            <Beaker size={14} /> {sandbox ? 'Exit Sandbox' : 'Sandbox'}
          </button>
          <div style={{ position: 'relative' }}>
            <button className={styles.btn} onClick={() => setExportOpen(v => !v)}><Download size={14} /></button>
            {exportOpen && (
              <div className={styles.menuPopover} onMouseLeave={() => setExportOpen(false)}>
                <a className={styles.menuItem} href="/api/cost-tracker/export?format=csv">CSV (computed)</a>
                <a className={styles.menuItem} href="/api/cost-tracker/export?format=json">JSON (raw backup)</a>
              </div>
            )}
          </div>
          {isPinAdmin ? (
            <button className={`${styles.authPill} ${styles.authPillAdmin}`} onClick={async () => {
              await fetch('/api/cost-tracker/auth/unlock', { method: 'DELETE' });
              useCostGridStore.getState().setPinAdmin(false);
              setToast('Locked again', 'info');
            }}>
              <Unlock size={11} /> SUPERADMIN <LogOut size={11} />
            </button>
          ) : (
            <button className={`${styles.authPill} ${styles.authPillStaff}`} onClick={() => setUnlockOpen(true)}>
              <Lock size={11} /> STAFF
            </button>
          )}
          <SaveIndicator state={saveState} />
        </div>
      </div>

      <div className={styles.formulaBar}>
        <span className={styles.formulaBarGlyph}>ƒx</span>
        <span className={styles.formulaBarAddress}>{selectedAddress || '—'}</span>
        <input
          className={styles.formulaBarInput}
          disabled={!selectedIsExpense}
          value={selectedKey ? toEditValue(cellMap[selectedKey] ?? '', columns[selectedColumnIndex]?.type) : ''}
          placeholder={selectedIsExpense ? 'Type a number or =formula' : 'Select an expense cell to edit its formula'}
          onChange={(e) => { if (selectedIsExpense) commitCell(selectedProductIndex, selectedColumnIndex, e.target.value); }}
        />
        {selectedHasFormula && (
          <button className={styles.thMenuBtn} onClick={() => setInspectorOpen(v => !v)} title="Formula inspector">
            <FunctionSquare size={15} />
          </button>
        )}
      </div>

      {products.length === 0 ? (
        <div className={styles.emptyState}>
          <Boxes size={32} />
          <div className={styles.emptyBracket}>[ NO PRODUCTS YET ]</div>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowAddProduct(true)}>
            <Plus size={14} /> Add your first product
          </button>
        </div>
      ) : (
        <div className={styles.gridWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.cornerCell} />
                <th className={styles.cornerCell} />
                <th className={styles.colLetterCell}>A</th>
                <th className={styles.colLetterCell}>B</th>
                {columns.map((c, i) => <th key={c._id} className={styles.colLetterCell}>{engineColLetter(offsets.firstExpenseCol + i)}</th>)}
                <th className={styles.colLetterCell}>{engineColLetter(offsets.batchTotalCol)}</th>
                <th className={styles.colLetterCell}>{engineColLetter(offsets.costUnitCol)}</th>
                <th className={styles.colLetterCell}>{engineColLetter(offsets.marginCol)}</th>
              </tr>
              <tr>
                <th className={styles.cornerCell} />
                <th className={`${styles.th} ${styles.thProduct}`}><span className={styles.thLabel}>Product</span></th>
                <th className={styles.th}><span className={styles.thLabel}>Qty</span></th>
                {columns.map(c => (
                  <th key={c._id} className={styles.th}>
                    <div className={styles.thHead}>
                      <span className={styles.thAccent} style={{ background: c.color }} />
                      <span className={`${styles.thLabel} ${c.locked ? styles.thLocked : ''}`} style={{ flex: 1 }}>{c.locked && <Lock size={10} style={{ marginRight: 3, display: 'inline' }} />}{c.label}</span>
                      <div style={{ position: 'relative' }}>
                        <button className={styles.thMenuBtn} onClick={() => setOpenColMenu(openColMenu === c._id ? null : c._id)}><MoreVertical size={13} /></button>
                        {openColMenu === c._id && (
                          <div className={styles.menuPopover} onMouseLeave={() => setOpenColMenu(null)}>
                            <button className={styles.menuItem} onClick={() => {
                              const label = window.prompt('Rename column', c.label);
                              setOpenColMenu(null);
                              if (label && label.trim() && label !== c.label) {
                                patchColumn(c._id, { label: label.trim() });
                                fetch(`/api/cost-tracker/columns/${c._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label: label.trim() }) }).catch(() => setToast('Failed to rename column', 'error'));
                              }
                            }}><Pencil size={12} style={{ marginRight: 6 }} /> Rename</button>
                            <button className={styles.menuItem} onClick={() => { setOpenColMenu(null); toggleColumnLock(c); }}>
                              {c.locked ? <Unlock size={12} style={{ marginRight: 6 }} /> : <Lock size={12} style={{ marginRight: 6 }} />} {c.locked ? 'Unlock column' : 'Lock column'}
                            </button>
                            <button className={styles.menuItem} onClick={() => { setOpenColMenu(null); moveColumn(c._id, 'left'); }}><ArrowLeftRight size={12} style={{ marginRight: 6, transform: 'scaleX(-1)' }} /> Move left</button>
                            <button className={styles.menuItem} onClick={() => { setOpenColMenu(null); moveColumn(c._id, 'right'); }}><ArrowLeftRight size={12} style={{ marginRight: 6 }} /> Move right</button>
                            <button className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={() => { setOpenColMenu(null); handleDeleteColumn(c); }}><Trash2 size={12} style={{ marginRight: 6 }} /> Delete</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </th>
                ))}
                <th className={`${styles.th} ${styles.thTotal}`}><span className={styles.thLabel} style={{ color: 'inherit' }}>Batch Total ₹</span></th>
                <th className={`${styles.th} ${styles.thTotal}`}><span className={styles.thLabel} style={{ color: 'inherit' }}>✦ Cost/Unit ₹</span></th>
                <th className={styles.th}><span className={styles.thLabel}>Margin %</span></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, pi) => {
                const row = pi + 1;
                const marginValue = engine.getValue({ row, col: offsets.marginCol });
                const marginPct = typeof marginValue === 'number' ? marginValue * 100 : null;
                const belowThreshold = marginPct !== null && marginPct < settings.marginThreshold;
                const override = totalOverrides[p._id];
                return (
                  <Fragment key={p._id}>
                    <tr className={styles.tr}>
                      <td className={styles.rowNumCell} style={{ position: 'relative' }}>
                        <button className={styles.expanderBtn} onClick={() => setExpanded(s => { const n = new Set(s); n.has(p._id) ? n.delete(p._id) : n.add(p._id); return n; })}>
                          {expanded.has(p._id) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </button>
                        {pi + 2}
                      </td>
                      <td className={styles.productCell}>
                        <div className={styles.productRow}>
                          <div className={styles.productThumb} onClick={() => setGalleryProduct(p)} style={{ cursor: 'pointer', overflow: 'hidden' }}>
                            {(() => {
                              const primary = p.photos.find(ph => ph.isPrimary) || p.photos[0];
                              return primary ? <img src={primary.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p.name.slice(0, 1).toUpperCase();
                            })()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <input
                                className={styles.productName}
                                defaultValue={p.name}
                                style={{ width: 'auto', flex: '0 1 auto' }}
                                onBlur={(e) => {
                                  const name = e.target.value.trim();
                                  if (name && name !== p.name) {
                                    patchProduct(p._id, { name });
                                    fetch(`/api/cost-tracker/products/${p._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }).catch(() => setToast('Failed to rename product', 'error'));
                                  } else { e.target.value = p.name; }
                                }}
                              />
                              <PricePill product={p} productIndex={pi} styles={styles} onNeedUnlock={() => setUnlockOpen(true)} />
                            </div>
                            <div className={styles.productMeta}>{p.sku ? `${p.sku} · ` : ''}{p.unit}</div>
                          </div>
                          <div style={{ position: 'relative' }}>
                            <button className={styles.thMenuBtn} onClick={() => setOpenRowMenu(openRowMenu === p._id ? null : p._id)}><MoreVertical size={13} /></button>
                            {openRowMenu === p._id && (
                              <div className={styles.menuPopover} onMouseLeave={() => setOpenRowMenu(null)}>
                                <button className={styles.menuItem} onClick={() => { setOpenRowMenu(null); setGalleryProduct(p); }}><ImageIcon size={12} style={{ marginRight: 6 }} /> Photos</button>
                                <button className={styles.menuItem} onClick={() => { setOpenRowMenu(null); setHistoryProduct(p); }}><History size={12} style={{ marginRight: 6 }} /> History</button>
                                <button className={styles.menuItem} onClick={() => { setOpenRowMenu(null); duplicateProduct(p); }}><Copy size={12} style={{ marginRight: 6 }} /> Duplicate</button>
                                <button className={styles.menuItem} onClick={() => { setOpenRowMenu(null); moveProduct(p._id, 'up'); }}><ArrowUp size={12} style={{ marginRight: 6 }} /> Move up</button>
                                <button className={styles.menuItem} onClick={() => { setOpenRowMenu(null); moveProduct(p._id, 'down'); }}><ArrowDown size={12} style={{ marginRight: 6 }} /> Move down</button>
                                <button className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={() => { setOpenRowMenu(null); handleDeleteProduct(p); }}><Trash2 size={12} style={{ marginRight: 6 }} /> Delete</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <QtyCell productIndex={pi} styles={styles} onNavigate={(dr, dc) => navigate(pi, -1, dr, dc)} />
                      {columns.map((c, ci) => (
                        <GridCell key={c._id} productIndex={pi} columnIndex={ci} column={c} styles={styles}
                          onNavigate={(dr, dc) => navigate(pi, ci, dr, dc)}
                          onNoteRequest={(productId, columnId, anchor) => setNoteAnchor({ productId, columnId, anchor })}
                        />
                      ))}
                      <TotalCell productIndex={pi} styles={styles} override={!!override} onEdit={async () => {
                        const current = engine.getFormula({ row, col: offsets.batchTotalCol }) || String(engine.getValue({ row, col: offsets.batchTotalCol }));
                        const formula = window.prompt('Batch Total formula', override || current || `=SUM(...)`);
                        if (!formula) return;
                        const res = await fetch(`/api/cost-tracker/products/${p._id}/total-override`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ formula }) });
                        if (!res.ok) { setToast('Invalid formula', 'error'); return; }
                        setTotalOverride(p._id, formula);
                      }} onReset={async () => {
                        const res = await fetch(`/api/cost-tracker/products/${p._id}/total-override`, { method: 'DELETE' });
                        if (res.status === 403) { setUnlockOpen(true); return; }
                        setTotalOverride(p._id, null);
                      }} />
                      <CostUnitCell productIndex={pi} styles={styles} />
                      <td className={`${styles.cell} ${belowThreshold ? styles.marginBad : ''}`} style={{ color: belowThreshold ? undefined : 'var(--ct-accent-2)' }}>
                        {marginPct !== null ? `${marginPct.toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                    {expanded.has(p._id) && <BreakdownBar productIndex={pi} columns={columns} styles={styles} />}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAddProduct && (
        <AddProductModal onClose={() => setShowAddProduct(false)} onCreate={async (data) => {
          const res = await fetch('/api/cost-tracker/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
          if (!res.ok) { setToast('Failed to add product', 'error'); return; }
          const { product } = await res.json();
          addProduct({ ...product, photos: [] });
          setShowAddProduct(false);
        }} />
      )}

      {showAddColumn && (
        <AddColumnModal onClose={() => setShowAddColumn(false)} onCreate={async (data) => {
          const res = await fetch('/api/cost-tracker/columns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
          if (!res.ok) { setToast('Failed to add column', 'error'); return; }
          const { column } = await res.json();
          addColumn(column);
          setShowAddColumn(false);
        }} />
      )}

      {confirm && (
        <div className={styles.modalBackdrop} onClick={() => setConfirm(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>{confirm.title}</div>
            <p style={{ fontSize: 13, color: 'var(--ct-text-dim)', marginBottom: 4 }}>{confirm.body}</p>
            <div className={styles.modalActions}>
              <button className={styles.btn} onClick={() => setConfirm(null)}>Cancel</button>
              <button className={`${styles.btn} ${styles.btnDanger}`} onClick={confirm.onConfirm}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {unlockOpen && <UnlockDialog styles={styles} onClose={() => setUnlockOpen(false)} />}
      {galleryProduct && <PhotoGallery product={products.find(p => p._id === galleryProduct._id) || galleryProduct} styles={styles} onClose={() => setGalleryProduct(null)} />}
      {historyProduct && <HistoryDrawer product={historyProduct} styles={styles} onClose={() => setHistoryProduct(null)} />}
      {constantsOpen && <ConstantsPanel styles={styles} onClose={() => setConstantsOpen(false)} onNeedUnlock={() => setUnlockOpen(true)} />}
      {inspectorOpen && selectedHasFormula && <FormulaInspector styles={styles} onClose={() => setInspectorOpen(false)} />}
      {note && <NotePopover productId={note.productId} columnId={note.columnId} anchor={note.anchor} styles={styles} onClose={() => setNoteAnchor(null)} />}

      {toast && <div className={styles.toast}>{toast.message}</div>}
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  const label = state === 'saved' ? 'SAVED' : state === 'syncing' ? 'SYNCING' : 'OFFLINE — RETRYING';
  const cls = state === 'saved' ? 'saveSaved' : state === 'syncing' ? 'saveSyncing' : 'saveOffline';
  return <span className={`${styles.saveIndicator} ${(styles as any)[cls]}`}><span className={styles.saveDot} />{label}</span>;
}

function TotalCell({ productIndex, styles: s, override, onEdit, onReset }: {
  productIndex: number; styles: Record<string, string>; override: boolean;
  onEdit: () => void; onReset: () => void;
}) {
  const engine = useCostGridStore(st => st.engine);
  const columns = useCostGridStore(st => st.columns);
  useCostGridStore(st => st.recalcVersion);
  const offsets = getColumnOffsets(columns.length);
  const value = engine.getValue({ row: productIndex + 1, col: offsets.batchTotalCol });
  const { text } = formatCellDisplay(value ?? 0, 'currency');
  return (
    <td className={s.totalCell} onDoubleClick={onEdit} style={{ cursor: 'pointer' }} title="Double-click to edit Batch Total formula">
      {override && <span className={s.fxBadge} onClick={(e) => { e.stopPropagation(); onReset(); }} title="Reset to auto-sum">ƒx</span>}
      {text || '₹0.00'}
    </td>
  );
}

function CostUnitCell({ productIndex, styles: s }: { productIndex: number; styles: Record<string, string> }) {
  const engine = useCostGridStore(st => st.engine);
  const columns = useCostGridStore(st => st.columns);
  useCostGridStore(st => st.recalcVersion);
  const offsets = getColumnOffsets(columns.length);
  const value = engine.getValue({ row: productIndex + 1, col: offsets.costUnitCol });
  const { text } = formatCellDisplay(value ?? 0, 'currency');
  return <td className={s.totalCell}>{text || '₹0.00'}</td>;
}

function AddProductModal({ onClose, onCreate }: { onClose: () => void; onCreate: (data: { name: string; sku?: string; unit: string; batchQty: number; sellingPrice: number }) => void }) {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState('unit');
  const [batchQty, setBatchQty] = useState('1');
  const [sellingPrice, setSellingPrice] = useState('0');
  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalTitle}>Add Product</div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Name</label>
          <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Wood-Pressed Groundnut Oil 1L" />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>SKU (optional)</label>
          <input className={styles.input} value={sku} onChange={(e) => setSku(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Unit</label>
          <select className={styles.select} value={unit} onChange={(e) => setUnit(e.target.value)}>
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className={styles.field} style={{ flex: 1 }}>
            <label className={styles.fieldLabel}>Batch Qty</label>
            <input className={styles.input} value={batchQty} onChange={(e) => setBatchQty(e.target.value)} />
          </div>
          <div className={styles.field} style={{ flex: 1 }}>
            <label className={styles.fieldLabel}>Selling Price ₹</label>
            <input className={styles.input} value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} />
          </div>
        </div>
        <div className={styles.modalActions}>
          <button className={styles.btn} onClick={onClose}><X size={13} /> Cancel</button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={!name.trim()} onClick={() => onCreate({
            name: name.trim(), sku: sku.trim() || undefined, unit,
            batchQty: Number(batchQty) || 1, sellingPrice: Number(sellingPrice) || 0,
          })}><Plus size={13} /> Add</button>
        </div>
      </div>
    </div>
  );
}

function AddColumnModal({ onClose, onCreate }: { onClose: () => void; onCreate: (data: { label: string; type: string; color: string; locked: boolean }) => void }) {
  const [label, setLabel] = useState('');
  const [type, setType] = useState<'currency' | 'percent' | 'number'>('currency');
  const [color, setColor] = useState(SWATCHES[0]);
  const [locked, setLocked] = useState(false);
  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalTitle}>Add Expense Column</div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Label</label>
          <input className={styles.input} value={label} onChange={(e) => setLabel(e.target.value)} autoFocus placeholder="Raw Material" />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Type</label>
          <select className={styles.select} value={type} onChange={(e) => setType(e.target.value as any)}>
            <option value="currency">Currency ₹</option>
            <option value="percent">Percent %</option>
            <option value="number">Number</option>
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Accent color</label>
          <div className={styles.swatchRow}>
            {SWATCHES.map(sw => (
              <button key={sw} type="button" className={`${styles.swatch} ${sw === color ? styles.swatchActive : ''}`} style={{ background: sw }} onClick={() => setColor(sw)} />
            ))}
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--ct-text-dim)', cursor: 'pointer' }}>
          <input type="checkbox" checked={locked} onChange={(e) => setLocked(e.target.checked)} />
          Start locked (superadmin-only editing)
        </label>
        <div className={styles.modalActions}>
          <button className={styles.btn} onClick={onClose}><X size={13} /> Cancel</button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={!label.trim()} onClick={() => onCreate({ label: label.trim(), type, color, locked })}><Plus size={13} /> Add</button>
        </div>
      </div>
    </div>
  );
}
