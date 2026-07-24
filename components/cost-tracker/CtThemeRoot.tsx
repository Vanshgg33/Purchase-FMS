'use client';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import styles from '@/app/(app)/cost-tracker/costTracker.module.css';

export default function CtThemeRoot({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const saved = localStorage.getItem('ct-theme');
    if (saved === 'dark') setTheme('dark');
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('ct-theme', next);
  };

  return (
    <div className={styles.ctRoot} data-theme={theme} style={{ minHeight: '100%' }}>
      <button onClick={toggle} className="btn btn-ghost btn-sm" style={{ position: 'absolute', top: 20, right: 28, zIndex: 5 }} title="Toggle dark mode">
        {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
      </button>
      {children}
    </div>
  );
}
