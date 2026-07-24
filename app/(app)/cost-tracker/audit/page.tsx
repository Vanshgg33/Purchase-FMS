'use client';
import { Fragment, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ctFetch } from '@/lib/ctClient';
import { formatIST } from '@/lib/costFormat';

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => { ctFetch('/api/cost-tracker/audit').then((d: any) => setLogs(d.logs)).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="skeleton" style={{ height: 300, borderRadius: 12 }} />;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div className="card">
        <table className="tbl">
          <thead><tr><th></th><th>When (IST)</th><th>Entity</th><th>Action</th><th>By</th><th>Reason</th></tr></thead>
          <tbody>
            {logs.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)' }}>No audit entries yet.</td></tr>}
            {logs.map((log: any) => (
              <Fragment key={log._id}>
                <tr onClick={() => setOpen(open === log._id ? null : log._id)} style={{ cursor: log.changes ? 'pointer' : 'default' }}>
                  <td>{log.changes ? (open === log._id ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : null}</td>
                  <td className="mono" style={{ fontSize: 12 }}>{formatIST(log.at)}</td>
                  <td>{log.entity}</td>
                  <td><span className="chip">{log.action}</span></td>
                  <td>{log.userName}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{log.reason || '—'}</td>
                </tr>
                {open === log._id && log.changes && (
                  <tr>
                    <td colSpan={6}>
                      <pre style={{ background: 'var(--bg-surface)', padding: 12, borderRadius: 8, fontSize: 11, overflowX: 'auto' }}>{JSON.stringify(log.changes, null, 2)}</pre>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
