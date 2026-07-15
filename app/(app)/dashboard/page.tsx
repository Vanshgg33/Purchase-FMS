'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle, CheckCircle, Clock, Package, ShoppingCart, Truck, XCircle,
  Receipt, Paperclip, CheckCircle2, ChevronUp, ChevronDown, ArrowUpDown, X,
} from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';

interface Stats {
  openRequests: number; awaitingApproval: number; withVendor: number;
  arrivingSoon: number; overdue: number; completedThisMonth: number;
}

interface PO {
  _id: string; poNumber: string; status: string;
  materials: Array<{ name: string; requestedQty: number }>;
  requestedByName: string;
  vendor?: { name?: string };
  deadlines: { neededBy?: string; deliveryDeadline?: string };
  updatedAt: string; createdAt: string;
}

const STAT_FILTER_MAP: Record<string, string> = {
  openRequests: 'REQUESTED',
  awaitingApproval: 'PO_CREATED',
  withVendor: '__WITH_VENDOR',
  arrivingSoon: 'BILL_UPLOADED',
  overdue: '__OVERDUE',
  completedThisMonth: '__DONE_MONTH',
};

const FILTER_LABELS: Record<string, string> = {
  __WITH_VENDOR: 'With Vendor',
  __OVERDUE: 'Overdue',
  __DONE_MONTH: 'Done This Month',
};

const statCards = (s: Stats) => [
  { key: 'openRequests',      label: 'Open Requests',      value: s.openRequests,      icon: ShoppingCart, iconColor: '#2563EB' },
  { key: 'awaitingApproval',  label: 'Awaiting Approval',  value: s.awaitingApproval,  icon: Clock,        iconColor: '#B45309' },
  { key: 'withVendor',        label: 'With Vendor',        value: s.withVendor,        icon: Package,      iconColor: '#7C3AED' },
  { key: 'arrivingSoon',      label: 'Arriving Soon',      value: s.arrivingSoon,      icon: Truck,        iconColor: '#0284C7' },
  { key: 'overdue',           label: 'Overdue',             value: s.overdue,           icon: AlertCircle,  iconColor: '#DC2626' },
  { key: 'completedThisMonth',label: 'Done This Month',    value: s.completedThisMonth,icon: CheckCircle,  iconColor: '#16A34A' },
];

const STATUS_OPTIONS = ['REQUESTED','PO_CREATED','APPROVED','REJECTED','SENT_TO_VENDOR','BILL_UPLOADED','RECEIVED','CLOSED','CANCELLED'];

const ACTION_META: Record<string, { icon: any; color: string; bg: string }> = {
  REQUEST_CREATED:  { icon: ShoppingCart, color: '#1D4ED8', bg: '#EFF6FF' },
  PO_CREATED:       { icon: Receipt,      color: '#92400E', bg: '#FFFBEB' },
  APPROVED:         { icon: CheckCircle,  color: '#166534', bg: '#F0FDF4' },
  REJECTED:         { icon: XCircle,      color: '#B91C1C', bg: '#FEF2F2' },
  CANCELLED:        { icon: XCircle,      color: '#B91C1C', bg: '#FEF2F2' },
  SENT_TO_VENDOR:   { icon: Truck,        color: '#6D28D9', bg: '#F5F3FF' },
  BILL_UPLOADED:    { icon: Receipt,      color: '#0369A1', bg: '#E0F2FE' },
  ATTACHMENT_ADDED: { icon: Paperclip,    color: '#6B7280', bg: '#F9FAFB' },
  RECEIVED:         { icon: Truck,        color: '#0F766E', bg: '#F0FDFA' },
  CLOSED:           { icon: CheckCircle2, color: '#6B7280', bg: '#F9FAFB' },
};

function getDeadline(po: PO) { return po.deadlines?.deliveryDeadline || po.deadlines?.neededBy || null; }

function isOverdue(po: PO) {
  const dl = getDeadline(po);
  return !!dl && new Date(dl) < new Date() && !['CLOSED', 'CANCELLED'].includes(po.status);
}

function countdownInfo(dl: string) {
  const days = Math.ceil((new Date(dl).getTime() - Date.now()) / 86400000);
  if (days < 0)  return { text: `${Math.abs(days)}d overdue`, color: 'var(--red)',   bg: 'var(--red-light)' };
  if (days === 0) return { text: 'Due today',                  color: 'var(--amber)', bg: 'var(--amber-light)' };
  if (days === 1) return { text: 'Tomorrow',                   color: 'var(--amber)', bg: 'var(--amber-light)' };
  return          { text: `In ${days}d`,                       color: 'var(--green)', bg: 'var(--green-light)' };
}

type SortKey = 'poNumber' | 'status' | 'deadline' | 'requestedBy' | null;

export default function DashboardPage() {
  const [stats, setStats]     = useState<Stats>({ openRequests: 0, awaitingApproval: 0, withVendor: 0, arrivingSoon: 0, overdue: 0, completedThisMonth: 0 });
  const [pos, setPos]         = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('');
  const [activity, setActivity] = useState<any[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [flowMounted, setFlowMounted] = useState(false);

  useEffect(() => {
    (async () => {
      const [sRes, pRes, aRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/dashboard/pos'),
        fetch('/api/dashboard/activity'),
      ]);
      if (sRes.ok) setStats(await sRes.json());
      if (pRes.ok) setPos((await pRes.json()).pos || []);
      if (aRes.ok) setActivity((await aRes.json()).activity || []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (loading) return;
    const id = requestAnimationFrame(() => setFlowMounted(true));
    return () => cancelAnimationFrame(id);
  }, [loading]);

  const cards = statCards(stats);
  const startOfMonth = useMemo(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); }, []);

  const toggleStub = (key: string) => {
    const token = STAT_FILTER_MAP[key];
    setFilter(prev => (prev === token ? '' : token));
  };

  const filtered = pos.filter(po => {
    const q = search.toLowerCase();
    const matchSearch = !q || po.poNumber.toLowerCase().includes(q) || po.materials.some(m => m.name.toLowerCase().includes(q));
    let matchFilter = true;
    if (filter === '__WITH_VENDOR') matchFilter = ['SENT_TO_VENDOR', 'BILL_UPLOADED'].includes(po.status);
    else if (filter === '__OVERDUE') matchFilter = isOverdue(po);
    else if (filter === '__DONE_MONTH') matchFilter = po.status === 'CLOSED' && new Date(po.updatedAt) >= startOfMonth;
    else if (filter) matchFilter = po.status === filter;
    return matchSearch && matchFilter;
  });

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const mul = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      let av: string | number = '', bv: string | number = '';
      if (sortKey === 'poNumber') { av = a.poNumber; bv = b.poNumber; }
      else if (sortKey === 'status') { av = a.status; bv = b.status; }
      else if (sortKey === 'requestedBy') { av = a.requestedByName; bv = b.requestedByName; }
      else if (sortKey === 'deadline') {
        const ad = getDeadline(a), bd = getDeadline(b);
        av = ad ? new Date(ad).getTime() : Infinity;
        bv = bd ? new Date(bd).getTime() : Infinity;
      }
      if (av < bv) return -1 * mul;
      if (av > bv) return 1 * mul;
      return 0;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const arrivingSoonPos = useMemo(() => {
    return pos
      .filter(po => {
        const dl = getDeadline(po);
        if (!dl || ['CLOSED', 'CANCELLED', 'RECEIVED'].includes(po.status)) return false;
        const days = (new Date(dl).getTime() - Date.now()) / 86400000;
        return days <= 7;
      })
      .sort((a, b) => new Date(getDeadline(a)!).getTime() - new Date(getDeadline(b)!).getTime());
  }, [pos]);

  const stageData = [
    { label: 'Requested',  count: pos.filter(p => p.status === 'REQUESTED').length },
    { label: 'PO Created', count: pos.filter(p => p.status === 'PO_CREATED').length },
    { label: 'Approved',   count: pos.filter(p => p.status === 'APPROVED').length },
    { label: 'With Vendor',count: pos.filter(p => ['SENT_TO_VENDOR', 'BILL_UPLOADED'].includes(p.status)).length },
    { label: 'Received',   count: pos.filter(p => ['RECEIVED', 'CLOSED'].includes(p.status)).length },
  ];
  const maxStage = Math.max(1, ...stageData.map(s => s.count));

  const today = new Date();
  const summaryLine = stats.overdue > 0
    ? `${stats.overdue} requisition${stats.overdue === 1 ? '' : 's'} need attention today`
    : loading ? 'Loading ledger…' : 'All requisitions on schedule';

  const SortHeader = ({ label, sk }: { label: string; sk: Exclude<SortKey, null> }) => {
    const active = sortKey === sk;
    return (
      <th onClick={() => toggleSort(sk)} style={{ cursor: 'pointer', userSelect: 'none' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          {label}
          {active ? (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : <ArrowUpDown size={10} style={{ opacity: 0.3 }} />}
        </span>
      </th>
    );
  };

  return (
    <div style={{ maxWidth: '1200px' }}>

      {/* Ledger hero strip */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', paddingBottom: '14px', marginBottom: '20px', borderBottom: '1px dashed var(--border-em)' }}>
        <div>
          <p className="display" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-base)' }}>Procurement Ledger</p>
          <p style={{ fontSize: '12.5px', color: 'var(--text-3)', marginTop: '2px' }}>
            {today.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} · {summaryLine}
          </p>
        </div>
        <p className="mono" style={{ fontSize: '11px', color: 'var(--text-3)', letterSpacing: '0.04em' }}>
          NATURELITE FOODS · {String(pos.length).padStart(4, '0')} ON RECORD
        </p>
      </div>

      {/* Stat stubs */}
      <div className="stat-grid">
        {cards.map((card, i) => {
          const active = filter === STAT_FILTER_MAP[card.key];
          return (
            <button
              key={card.key}
              type="button"
              className={`stub fade-up ${active ? 'stub--active' : ''}`}
              style={{ animationDelay: `${i * 40}ms` }}
              onClick={() => toggleStub(card.key)}
            >
              <div className="stub-body">
                <card.icon size={16} style={{ color: card.iconColor }} />
                <p className="mono" style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-base)', lineHeight: 1, marginTop: '9px' }}>
                  {loading ? '—' : card.value}
                </p>
                <p style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-3)', marginTop: '5px', lineHeight: 1.3 }}>{card.label}</p>
              </div>
              <div className="stub-tear" />
              <div className="stub-footer">{active ? 'Clear filter' : 'Click to filter'}</div>
            </button>
          );
        })}
      </div>

      {/* Arriving this week rail */}
      <div className="card fade-up" style={{ padding: '16px', marginBottom: '20px', animationDelay: '160ms' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <p className="display" style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-base)' }}>Arriving This Week</p>
          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{arrivingSoonPos.length} shipment{arrivingSoonPos.length === 1 ? '' : 's'}</span>
        </div>
        {loading ? (
          <p style={{ fontSize: '13px', color: 'var(--text-3)', padding: '8px 0' }}>Loading…</p>
        ) : arrivingSoonPos.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-3)', padding: '8px 0' }}>Nothing due in the next 7 days.</p>
        ) : (
          <div className="rail">
            {arrivingSoonPos.map(po => {
              const dl = getDeadline(po)!;
              const info = countdownInfo(dl);
              return (
                <Link key={po._id} href={`/po/${po.poNumber}`} className="rail-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className="mono" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--amber)' }}>{po.poNumber}</span>
                    <span style={{ fontSize: '10.5px', fontWeight: 700, padding: '2px 7px', borderRadius: '999px', background: info.bg, color: info.color, whiteSpace: 'nowrap' }}>{info.text}</span>
                  </div>
                  <p style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-base)', marginBottom: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {po.materials.map(m => m.name).join(', ') || 'No materials listed'}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{po.vendor?.name || 'No vendor assigned'}</span>
                    <StatusBadge status={po.status} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Main grid */}
      <div className="dash-grid">

        {/* PO Table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="filter-row">
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14px', flex: 1, minWidth: '100px' }}>Purchase Orders</span>
            {filter && (
              <button
                type="button"
                onClick={() => setFilter('')}
                className="chip"
                style={{ cursor: 'pointer', border: '1px solid var(--amber)', color: 'var(--amber-hover)', background: 'var(--amber-light)' }}
              >
                {FILTER_LABELS[filter] || filter.replace(/_/g, ' ')} <X size={11} />
              </button>
            )}
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search PO or material…"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '7px', padding: '6px 12px', fontSize: '13px', color: 'var(--text-base)', outline: 'none', flex: 1, minWidth: '140px', maxWidth: '220px' }}
            />
            <select
              value={STATUS_OPTIONS.includes(filter) ? filter : ''}
              onChange={e => setFilter(e.target.value)}
              className="field" style={{ width: 'auto', padding: '6px 28px 6px 10px', fontSize: '13px', flexShrink: 0 }}
            >
              <option value="">All Status</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>

          <div className="table-wrap" style={{ minHeight: '200px' }}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-3)' }}>Loading…</div>
            ) : sorted.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)' }}>
                <Package size={32} style={{ margin: '0 auto 10px', opacity: 0.35 }} />
                <p style={{ fontSize: '14px' }}>No purchase orders match{filter || search ? ' your filters' : ''}.</p>
                {(filter || search) && (
                  <p style={{ fontSize: '12.5px', marginTop: '4px' }}>Try clearing the search or status filter.</p>
                )}
              </div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <SortHeader label="PO No." sk="poNumber" />
                    <th>Materials</th>
                    <SortHeader label="Status" sk="status" />
                    <SortHeader label="Deadline" sk="deadline" />
                    <SortHeader label="Requested By" sk="requestedBy" />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(po => {
                    const dl = getDeadline(po);
                    const late = isOverdue(po);
                    return (
                      <tr key={po._id}>
                        <td>
                          <Link href={`/po/${po.poNumber}`} style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '13px', color: 'var(--amber)', textDecoration: 'none' }}
                            onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                            onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}>
                            {po.poNumber}
                          </Link>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {po.materials.slice(0, 2).map((m, i) => (
                              <span key={i} className="chip">{m.name} · {m.requestedQty} KG</span>
                            ))}
                            {po.materials.length > 2 && <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>+{po.materials.length - 2}</span>}
                          </div>
                        </td>
                        <td><StatusBadge status={po.status} /></td>
                        <td style={{ fontSize: '13px', color: late ? 'var(--red)' : 'var(--text-2)', fontWeight: late ? 700 : 400 }}>
                          {dl ? new Date(dl).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                          {late && ' ⚠'}
                        </td>
                        <td style={{ fontSize: '13px' }}>{po.requestedByName}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right col */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Pipeline stage flow */}
          <div className="card" style={{ padding: '16px' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '13.5px', marginBottom: '14px', color: 'var(--text-base)' }}>Pipeline Flow</p>
            <div className="stage-flow">
              {stageData.map(stage => (
                <div key={stage.label} className="stage-flow-col">
                  <span className="stage-flow-count">{stage.count}</span>
                  <div className="stage-flow-tracks">
                    <div className="stage-flow-track">
                      <div className="stage-flow-bar" style={{ height: `${flowMounted ? (stage.count / maxStage) * 64 : 0}px` }} />
                    </div>
                  </div>
                  <span className="stage-flow-label">{stage.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Logbook */}
          <div className="card" style={{ padding: '16px' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '13.5px', marginBottom: '8px', color: 'var(--text-base)' }}>Logbook</p>
            <div>
              {activity.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--text-3)', textAlign: 'center', padding: '20px 0' }}>No recent activity</p>
              ) : activity.slice(0, 8).map((a: any, i: number) => {
                const meta = ACTION_META[a.action] || { icon: Clock, color: '#9B7B55', bg: '#F5EFE4' };
                return (
                  <div key={i} className="logbook-item">
                    <div className="logbook-icon" style={{ background: meta.bg }}>
                      <meta.icon size={13} style={{ color: meta.color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, paddingTop: '2px' }}>
                      <p style={{ fontSize: '12.5px', color: 'var(--text-base)', fontWeight: 600 }}>{a.byName}</p>
                      <p style={{ fontSize: '11.5px', color: 'var(--text-3)', marginTop: '1px' }}>
                        {a.action.replace(/_/g, ' ').toLowerCase()} · <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{a.poNumber}</span>
                      </p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)', opacity: 0.75, marginTop: '3px' }}>
                        {new Date(a.at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
