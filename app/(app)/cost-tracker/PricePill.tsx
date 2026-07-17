'use client';
import { useEffect, useRef, useState } from 'react';
import { useCostGridStore, type CostProductLite } from '@/store/costGridStore';
import { formatINR, formatDelta } from '@/lib/currency';

export default function PricePill({ product, productIndex, styles, onNeedUnlock }: {
  product: CostProductLite;
  productIndex: number;
  styles: Record<string, string>;
  onNeedUnlock: () => void;
}) {
  const commitSellPrice = useCostGridStore(s => s.commitSellPrice);
  const isPinAdmin = useCostGridStore(s => s.isPinAdmin);
  const sandbox = useCostGridStore(s => s.sandbox);
  const setToast = useCostGridStore(s => s.setToast);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [prevPrice, setPrevPrice] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const locked = product.priceLocked && !isPinAdmin && !sandbox;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/cost-tracker/snapshots?productId=${product._id}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled || !data?.snapshots?.length) return;
        setPrevPrice(data.snapshots[data.snapshots.length - 1].sellingPrice);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [product._id]);

  useEffect(() => { if (editing) { inputRef.current?.focus(); inputRef.current?.select(); } }, [editing]);

  function open() {
    if (locked) { onNeedUnlock(); return; }
    setDraft(String(product.sellingPrice));
    setEditing(true);
  }

  function commit() {
    const result = commitSellPrice(productIndex, draft);
    if (!result.ok) {
      if (result.needsUnlock) { setEditing(false); onNeedUnlock(); return; }
      setToast(result.error, 'error');
      return;
    }
    setEditing(false);
  }

  const delta = prevPrice !== null ? formatDelta(product.sellingPrice, prevPrice) : null;

  if (editing) {
    return (
      <input
        ref={inputRef}
        className={styles.pricePillInput}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit(); }
          if (e.key === 'Escape') { e.preventDefault(); setEditing(false); }
        }}
      />
    );
  }

  return (
    <button type="button" className={`${styles.pricePill} ${locked ? styles.pricePillLocked : ''}`} onClick={open} title={locked ? 'Locked — superadmin only' : 'Click to edit selling price'}>
      {formatINR(product.sellingPrice)}
      {delta && delta.direction !== 'flat' && (
        <span className={delta.direction === 'up' ? styles.deltaUp : styles.deltaDown}>
          {delta.direction === 'up' ? '▲' : '▼'}{delta.text}
        </span>
      )}
    </button>
  );
}
