'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle, Clock, Package, ShoppingCart, Truck, TrendingUp } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Stats {
  openRequests: number; awaitingApproval: number; withVendor: number;
  arrivingSoon: number; overdue: number; completedThisMonth: number;
}

interface PO {
  _id: string; poNumber: string; status: string;
  materials: Array<{ name: string; requestedQty: number }>;
  requestedByName: string;
  deadlines: { neededBy?: string; deliveryDeadline?: string };
  updatedAt: string; createdAt: string;
}

const statCards = (s: Stats) => [
  { label: 'Open Requests',      value: s.openRequests,       icon: ShoppingCart, accent: '#3B82F6', bg: '#EFF6FF' },
  { label: 'Awaiting Approval',  value: s.awaitingApproval,   icon: Clock,        accent: '#F59E0B', bg: '#FFFBEB' },
  { label: 'With Vendor',        value: s.withVendor,         icon: Package,      accent: '#8B5CF6', bg: '#F5F3FF' },
  { label: 'Arriving Soon',      value: s.arrivingSoon,       icon: Truck,        accent: '#0EA5E9', bg: '#F0F9FF' },
  { label: 'Overdue',            value: s.overdue,            icon: AlertCircle,  accent: '#EF4444', bg: '#FEF2F2' },
  { label: 'Done This Month',    value: s.completedThisMonth, icon: CheckCircle,  accent: '#22C55E', bg: '#F0FDF4' },
];

const STATUS_OPTIONS = ['REQUESTED','PO_CREATED','APPROVED','REJECTED','SENT_TO_VENDOR','BILL_UPLOADED','RECEIVED','CLOSED','CANCELLED'];

export default function DashboardPage() {
  const [stats, setStats]     = useState<Stats>({ openRequests: 0, awaitingApproval: 0, withVendor: 0, arrivingSoon: 0, overdue: 0, completedThisMonth: 0 });
  const [pos, setPos]         = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('');
  const [activity, setActivity] = useState<any[]>([]);

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

  const cards = statCards(stats);

  const filtered = pos.filter(po => {
    const q = search.toLowerCase();
    const matchSearch = !q || po.poNumber.toLowerCase().includes(q) || po.materials.some(m => m.name.toLowerCase().includes(q));
    return matchSearch && (!filter || po.status === filter);
  });

  const chartData = [
    { status: 'Requested',  count: pos.filter(p => p.status === 'REQUESTED').length },
    { status: 'PO Created', count: pos.filter(p => p.status === 'PO_CREATED').length },
    { status: 'Approved',   count: pos.filter(p => p.status === 'APPROVED').length },
    { status: 'Vendor',     count: pos.filter(p => ['SENT_TO_VENDOR','BILL_UPLOADED'].includes(p.status)).length },
    { status: 'Received',   count: pos.filter(p => ['RECEIVED','CLOSED'].includes(p.status)).length },
  ];

  return (
    <div style={{ maxWidth: '1200px' }}>

      {/* Stat cards */}
      <div className="stat-grid">
        {cards.map(card => (
          <div key={card.label} style={{ background: card.bg, border: `1px solid ${card.accent}22`, borderRadius: '12px', padding: '16px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <card.icon size={17} style={{ color: card.accent }} />
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '26px', fontWeight: 600, color: card.accent, lineHeight: 1 }}>
              {loading ? '—' : card.value}
            </p>
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', marginTop: '5px', lineHeight: 1.3 }}>{card.label}</p>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="dash-grid">

        {/* PO Table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="filter-row">
            <TrendingUp size={15} style={{ color: 'var(--amber)', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14px', flex: 1, minWidth: '100px' }}>Purchase Orders</span>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search PO or material…"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '7px', padding: '6px 12px', fontSize: '13px', color: 'var(--text-base)', outline: 'none', flex: 1, minWidth: '140px', maxWidth: '220px' }}
            />
            <select value={filter} onChange={e => setFilter(e.target.value)} className="field" style={{ width: 'auto', padding: '6px 28px 6px 10px', fontSize: '13px', flexShrink: 0 }}>
              <option value="">All Status</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
            </select>
          </div>

          <div className="table-wrap" style={{ minHeight: '200px' }}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-3)' }}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)' }}>
                <Package size={32} style={{ margin: '0 auto 10px', opacity: 0.35 }} />
                <p style={{ fontSize: '14px' }}>No purchase orders found</p>
              </div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>PO No.</th>
                    <th>Materials</th>
                    <th>Status</th>
                    <th>Deadline</th>
                    <th>Requested By</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(po => {
                    const dl = po.deadlines?.deliveryDeadline || po.deadlines?.neededBy;
                    const late = dl && new Date(dl) < new Date() && !['CLOSED','CANCELLED'].includes(po.status);
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

          {/* Chart */}
          <div className="card" style={{ padding: '16px' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '13.5px', marginBottom: '14px', color: 'var(--text-base)' }}>POs by Stage</p>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="status" tick={{ fontSize: 9, fill: 'var(--text-3)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="count" fill="#B45309" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Activity feed */}
          <div className="card" style={{ padding: '16px' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '13.5px', marginBottom: '14px', color: 'var(--text-base)' }}>Live Activity</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {activity.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--text-3)', textAlign: 'center', padding: '20px 0' }}>No recent activity</p>
              ) : activity.slice(0, 8).map((a: any, i: number) => (
                <div key={i} style={{ display: 'flex', gap: '10px', padding: '9px 0', borderBottom: i < activity.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--amber)', marginTop: '6px', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-base)', fontWeight: 600 }}>{a.byName}</p>
                    <p style={{ fontSize: '11.5px', color: 'var(--text-3)', marginTop: '1px' }}>
                      {a.action.replace(/_/g, ' ').toLowerCase()} · <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{a.poNumber}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
