'use client';
import { useEffect, useRef, useState } from 'react';
import { Plus, MoreVertical, Trash2, Pencil, X, Boxes } from 'lucide-react';
import { useCostGridStore, type CostProductLite, type CostColumnLite, type DirtyCell, type SaveState } from '@/store/costGridStore';
import { engineColLetter } from '@/lib/costEngine';
import { toEditValue } from '@/lib/currency';
import { formatCellDisplay } from '@/lib/cellFormat';
import GridCell from './GridCell';
import styles from './costTracker.module.css';

const SWATCHES = ['#22D3EE', '#A3E635', '#D2A8FF', '#FBBF24', '#F87171', '#38BDF8', '#F472B6', '#94A3B8'];
const UNITS = ['unit', 'kg', 'g', 'L', 'ml', 'pouch', 'bottle', 'box'];

interface Props {
  initialProducts: CostProductLite[];
  initialColumns: CostColumnLite[];
  initialCells: DirtyCell[];
}

export default function CostTrackerClient({ initialProducts, initialColumns, initialCells }: Props) {
  const hydrate = useCostGridStore(s => s.hydrate);
  const ready = useCostGridStore(s => s.ready);
  const products = useCostGridStore(s => s.products);
  const columns = useCostGridStore(s => s.columns);
  const saveState = useCostGridStore(s => s.saveState);
  const toast = useCostGridStore(s => s.toast);
  const selected = useCostGridStore(s => s.selected);
  const select = useCostGridStore(s => s.select);
  const cellMap = useCostGridStore(s => s.cellMap);
  const commitCell = useCostGridStore(s => s.commitCell);
  const setToast = useCostGridStore(s => s.setToast);
  const addProduct = useCostGridStore(s => s.addProduct);
  const removeProduct = useCostGridStore(s => s.removeProduct);
  const patchProduct = useCostGridStore(s => s.patchProduct);
  const addColumn = useCostGridStore(s => s.addColumn);
  const removeColumn = useCostGridStore(s => s.removeColumn);
  const patchColumn = useCostGridStore(s => s.patchColumn);

  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    hydrate(initialProducts, initialColumns, initialCells);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [confirm, setConfirm] = useState<null | { title: string; body: string; onConfirm: () => void }>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  function navigate(pi: number, ci: number, dRow: number, dCol: number) {
    if (products.length === 0 || columns.length === 0) return;
    const nextPi = Math.min(Math.max(pi + dRow, 0), products.length - 1);
    const nextCi = Math.min(Math.max(ci + dCol, 0), columns.length - 1);
    select(nextPi + 1, nextCi + 1);
  }

  async function handleDeleteProduct(p: CostProductLite) {
    setConfirm({
      title: 'Delete product?',
      body: `"${p.name}" and all its cost cells will be removed. This can't be undone.`,
      onConfirm: async () => {
        setConfirm(null);
        removeProduct(p._id);
        const res = await fetch(`/api/cost-tracker/products/${p._id}`, { method: 'DELETE' });
        if (!res.ok) setToast('Failed to delete product', 'error');
      },
    });
  }

  async function handleDeleteColumn(c: CostColumnLite, force = false) {
    const res = await fetch(`/api/cost-tracker/columns/${c._id}${force ? '?force=true' : ''}`, { method: 'DELETE' });
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

  if (!ready) return <div className={styles.ctRoot}><div className={styles.emptyState}>Loading…</div></div>;

  const selectedProductIndex = selected ? selected.row - 1 : -1;
  const selectedColumnIndex = selected ? selected.col - 1 : -1;
  const selectedIsExpense = selected && selectedColumnIndex >= 0 && selectedColumnIndex < columns.length;
  const selectedKey = selectedIsExpense ? `${products[selectedProductIndex]?._id}:${columns[selectedColumnIndex]?._id}` : null;
  const selectedAddress = selected ? `${engineColLetter(selected.col)}${selected.row + 1}` : '';

  return (
    <div className={styles.ctRoot}>
      <div className={styles.topbar}>
        <div className={styles.topbarTitle}>⬡ COST<span>_TRACKER</span></div>
        <div className={styles.topbarActions}>
          <button className={styles.btn} onClick={() => setShowAddProduct(true)}><Plus size={14} /> Product</button>
          <button className={styles.btn} onClick={() => setShowAddColumn(true)}><Plus size={14} /> Column</button>
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
          onChange={(e) => {
            if (selectedIsExpense) commitCell(selectedProductIndex, selectedColumnIndex, e.target.value);
          }}
        />
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
                <th className={styles.colLetterCell}>A</th>
                {columns.map((c, i) => (
                  <th key={c._id} className={styles.colLetterCell}>{engineColLetter(i + 1)}</th>
                ))}
                <th className={styles.colLetterCell}>{engineColLetter(columns.length + 1)}</th>
              </tr>
              <tr>
                <th className={styles.cornerCell} />
                <th className={`${styles.th} ${styles.thProduct}`}>
                  <span className={styles.thLabel}>Product</span>
                </th>
                {columns.map(c => (
                  <th key={c._id} className={styles.th} style={{ position: 'sticky' }}>
                    <div className={styles.thHead}>
                      <span className={styles.thAccent} style={{ background: c.color }} />
                      <span className={styles.thLabel} style={{ flex: 1 }}>{c.label}</span>
                      <div style={{ position: 'relative' }}>
                        <button className={styles.thMenuBtn} onClick={() => setOpenMenu(openMenu === c._id ? null : c._id)}>
                          <MoreVertical size={13} />
                        </button>
                        {openMenu === c._id && (
                          <div className={styles.menuPopover} onMouseLeave={() => setOpenMenu(null)}>
                            <button
                              className={styles.menuItem}
                              onClick={() => {
                                const label = window.prompt('Rename column', c.label);
                                setOpenMenu(null);
                                if (label && label.trim() && label !== c.label) {
                                  patchColumn(c._id, { label: label.trim() });
                                  fetch(`/api/cost-tracker/columns/${c._id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ label: label.trim() }),
                                  }).catch(() => setToast('Failed to rename column', 'error'));
                                }
                              }}
                            >
                              <Pencil size={12} style={{ marginRight: 6, display: 'inline' }} /> Rename
                            </button>
                            <button
                              className={`${styles.menuItem} ${styles.menuItemDanger}`}
                              onClick={() => { setOpenMenu(null); handleDeleteColumn(c); }}
                            >
                              <Trash2 size={12} style={{ marginRight: 6, display: 'inline' }} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </th>
                ))}
                <th className={`${styles.th} ${styles.thTotal}`}>
                  <span className={styles.thLabel} style={{ color: 'inherit' }}>✦ Final Cost ₹</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, pi) => (
                <tr key={p._id} className={styles.tr}>
                  <td className={styles.rowNumCell}>{pi + 2}</td>
                  <td className={styles.productCell}>
                    <div className={styles.productRow}>
                      <div className={styles.productThumb}>{p.name.slice(0, 1).toUpperCase()}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <input
                          className={styles.productName}
                          defaultValue={p.name}
                          onBlur={(e) => {
                            const name = e.target.value.trim();
                            if (name && name !== p.name) {
                              patchProduct(p._id, { name });
                              fetch(`/api/cost-tracker/products/${p._id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ name }),
                              }).catch(() => setToast('Failed to rename product', 'error'));
                            } else {
                              e.target.value = p.name;
                            }
                          }}
                        />
                        <div className={styles.productMeta}>{p.sku ? `${p.sku} · ` : ''}{p.unit}</div>
                      </div>
                      <button className={styles.thMenuBtn} onClick={() => handleDeleteProduct(p)} title="Delete product">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                  {columns.map((c, ci) => (
                    <GridCell
                      key={c._id}
                      productIndex={pi}
                      columnIndex={ci}
                      column={c}
                      styles={styles}
                      onNavigate={(dRow, dCol) => navigate(pi, ci, dRow, dCol)}
                    />
                  ))}
                  <TotalCell productIndex={pi} columnCount={columns.length} styles={styles} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddProduct && (
        <AddProductModal
          onClose={() => setShowAddProduct(false)}
          onCreate={async (data) => {
            const res = await fetch('/api/cost-tracker/products', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            });
            if (!res.ok) { setToast('Failed to add product', 'error'); return; }
            const { product } = await res.json();
            addProduct({ _id: product._id, name: product.name, sku: product.sku, unit: product.unit, position: product.position });
            setShowAddProduct(false);
          }}
        />
      )}

      {showAddColumn && (
        <AddColumnModal
          onClose={() => setShowAddColumn(false)}
          onCreate={async (data) => {
            const res = await fetch('/api/cost-tracker/columns', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            });
            if (!res.ok) { setToast('Failed to add column', 'error'); return; }
            const { column } = await res.json();
            addColumn({ _id: column._id, label: column.label, type: column.type, color: column.color, position: column.position });
            setShowAddColumn(false);
          }}
        />
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

      {toast && <div className={styles.toast}>{toast.message}</div>}
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  const label = state === 'saved' ? 'SAVED' : state === 'syncing' ? 'SYNCING' : 'OFFLINE — RETRYING';
  const cls = state === 'saved' ? 'saveSaved' : state === 'syncing' ? 'saveSyncing' : 'saveOffline';
  return (
    <span className={`${styles.saveIndicator} ${(styles as any)[cls]}`}>
      <span className={styles.saveDot} />{label}
    </span>
  );
}

function TotalCell({ productIndex, columnCount, styles }: { productIndex: number; columnCount: number; styles: Record<string, string> }) {
  const engine = useCostGridStore(s => s.engine);
  const row = productIndex + 1;
  const col = columnCount + 1;
  const value = engine.getValue({ row, col });
  const { text } = formatCellDisplay(value ?? 0, 'currency');
  return <td className={styles.totalCell}>{text || '₹0.00'}</td>;
}

function AddProductModal({ onClose, onCreate }: { onClose: () => void; onCreate: (data: { name: string; sku?: string; unit: string }) => void }) {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState('unit');
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
        <div className={styles.modalActions}>
          <button className={styles.btn} onClick={onClose}><X size={13} /> Cancel</button>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={!name.trim()}
            onClick={() => onCreate({ name: name.trim(), sku: sku.trim() || undefined, unit })}
          >
            <Plus size={13} /> Add
          </button>
        </div>
      </div>
    </div>
  );
}

function AddColumnModal({ onClose, onCreate }: { onClose: () => void; onCreate: (data: { label: string; type: string; color: string }) => void }) {
  const [label, setLabel] = useState('');
  const [type, setType] = useState<'currency' | 'percent' | 'number'>('currency');
  const [color, setColor] = useState(SWATCHES[0]);
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
              <button
                key={sw}
                type="button"
                className={`${styles.swatch} ${sw === color ? styles.swatchActive : ''}`}
                style={{ background: sw }}
                onClick={() => setColor(sw)}
              />
            ))}
          </div>
        </div>
        <div className={styles.modalActions}>
          <button className={styles.btn} onClick={onClose}><X size={13} /> Cancel</button>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={!label.trim()}
            onClick={() => onCreate({ label: label.trim(), type, color })}
          >
            <Plus size={13} /> Add
          </button>
        </div>
      </div>
    </div>
  );
}
