'use client';
import { useEffect, useRef, useState } from 'react';
import { useCostGridStore } from '@/store/costGridStore';

export default function NotePopover({ productId, columnId, anchor, styles, onClose }: {
  productId: string;
  columnId: string;
  anchor: HTMLElement;
  styles: Record<string, string>;
  onClose: () => void;
}) {
  const noteMap = useCostGridStore(s => s.noteMap);
  const setNote = useCostGridStore(s => s.setNote);
  const key = `${productId}:${columnId}`;
  const [value, setValue] = useState(noteMap[key] || '');
  const ref = useRef<HTMLDivElement>(null);
  const rect = anchor.getBoundingClientRect();

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) save();
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function save() {
    setNote(productId, columnId, value.trim() || null);
    onClose();
  }

  return (
    <div
      ref={ref}
      className={styles.notePopover}
      style={{ position: 'fixed', top: rect.bottom + 4, left: Math.min(rect.left, window.innerWidth - 240) }}
      onClick={(e) => e.stopPropagation()}
    >
      <textarea
        className={styles.noteTextarea}
        maxLength={300}
        placeholder="Quote from Sharma Traders, Jan 2026…"
        value={value}
        autoFocus
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); if (e.key === 'Enter' && e.metaKey) save(); }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 6 }}>
        <button className={styles.btn} onClick={onClose}>Cancel</button>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={save}>Save</button>
      </div>
    </div>
  );
}
