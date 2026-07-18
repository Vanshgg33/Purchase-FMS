'use client';
import { useEffect, useRef, useState } from 'react';
import { useCostGridStore, type CostProductLite } from '@/store/costGridStore';
import { formatINR } from '@/lib/currency';

export default function BaseAmountBox({ product, productIndex, styles }: {
  product: CostProductLite;
  productIndex: number;
  styles: Record<string, string>;
}) {
  const commitBaseAmount = useCostGridStore(s => s.commitBaseAmount);
  const setToast = useCostGridStore(s => s.setToast);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) { inputRef.current?.focus(); inputRef.current?.select(); } }, [editing]);

  function open() {
    setDraft(String(product.baseAmount));
    setEditing(true);
  }

  function commit() {
    const result = commitBaseAmount(productIndex, draft);
    if (!result.ok) { setToast(result.error, 'error'); return; }
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className={styles.baseAmountInput}
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
    <button type="button" className={styles.baseAmountBox} onClick={open} title="Base Amount — always added to Batch Total. Click to edit.">
      <span className={styles.baseAmountLabel}>BASE</span> {formatINR(product.baseAmount)}
    </button>
  );
}
