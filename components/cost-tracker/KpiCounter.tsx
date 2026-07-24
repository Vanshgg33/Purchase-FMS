'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, useAnimationFrame } from 'framer-motion';
import styles from '@/app/(app)/cost-tracker/costTracker.module.css';

export default function KpiCounter({ label, value, format = (n: number) => n.toLocaleString('en-IN'), delta }: {
  label: string;
  value: number;
  format?: (n: number) => string;
  delta?: number | null;
}) {
  const [display, setDisplay] = useState(0);
  const start = useRef<number | null>(null);
  const duration = 700;

  useAnimationFrame((t) => {
    if (start.current === null) start.current = t;
    const elapsed = t - start.current;
    const progress = Math.min(1, elapsed / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    setDisplay(value * eased);
  });

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`card ${styles.kpiCard}`}>
      <div className={styles.kpiLabel}>{label}</div>
      <div className={styles.kpiValue}>{format(display)}</div>
      {delta !== undefined && delta !== null && (
        <div className={`${styles.kpiDelta} ${delta >= 0 ? styles.up : styles.down}`}>{delta >= 0 ? '+' : ''}{delta.toFixed(1)}%</div>
      )}
    </motion.div>
  );
}
