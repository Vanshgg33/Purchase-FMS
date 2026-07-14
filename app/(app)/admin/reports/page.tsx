'use client';
import { useState } from 'react';
import { Download, FileSpreadsheet, BarChart3, AlertTriangle, Clock } from 'lucide-react';

const reports = [
  {
    type: 'po-register',
    label: 'PO Register',
    desc: 'Complete list of all Purchase Orders with status, vendor, materials, and timeline.',
    icon: FileSpreadsheet,
    accent: '#1D4ED8',
    bg: '#EFF6FF',
  },
  {
    type: 'discrepancy',
    label: 'Discrepancy Report',
    desc: 'POs where the received quantity differed from the ordered quantity.',
    icon: AlertTriangle,
    accent: '#C2410C',
    bg: '#FFF7ED',
  },
  {
    type: 'delay',
    label: 'Delay Report',
    desc: 'POs that were received after the expected delivery deadline.',
    icon: Clock,
    accent: '#B91C1C',
    bg: '#FEF2F2',
  },
];

export default function AdminReportsPage() {
  const [from, setFrom]     = useState('');
  const [to, setTo]         = useState('');
  const [loading, setLoading] = useState('');

  const downloadReport = async (type: string) => {
    setLoading(type);
    const params = new URLSearchParams({ type, ...(from && { from }), ...(to && { to }) });
    const res = await fetch(`/api/admin/reports?${params}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-report-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setLoading('');
  };

  return (
    <div style={{ maxWidth: '780px' }} className="fade-up">
      <div className="page-header">
        <h1 className="page-title">Reports & Export</h1>
        <p className="page-sub">Download Excel reports for purchase analysis</p>
      </div>

      {/* Date range filter */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: '22px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={15} style={{ color: 'var(--amber)' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14px', color: 'var(--text-base)' }}>Date Range Filter</span>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label className="label">From</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="field" style={{ width: '160px' }} />
            </div>
            <div>
              <label className="label">To</label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)} className="field" style={{ width: '160px' }} />
            </div>
            {(from || to) && (
              <button onClick={() => { setFrom(''); setTo(''); }} className="btn btn-ghost btn-sm" style={{ marginBottom: '1px' }}>
                Clear
              </button>
            )}
          </div>
        </div>
        {!from && !to && (
          <p style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '10px' }}>
            Leave blank to export all-time data
          </p>
        )}
      </div>

      {/* Report cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {reports.map(r => {
          const isLoading = loading === r.type;
          return (
            <div key={r.type} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: r.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <r.icon size={20} style={{ color: r.accent }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', color: 'var(--text-base)', marginBottom: '3px' }}>{r.label}</p>
                <p style={{ fontSize: '12.5px', color: 'var(--text-3)' }}>{r.desc}</p>
              </div>
              <button
                onClick={() => downloadReport(r.type)}
                disabled={isLoading}
                className="btn btn-primary btn-sm"
                style={{ flexShrink: 0 }}
              >
                <Download size={13} />
                {isLoading ? 'Generating…' : 'Export Excel'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
