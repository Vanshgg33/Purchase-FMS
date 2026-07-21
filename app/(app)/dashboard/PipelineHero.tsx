'use client';
import { FilePlus, FileText, CheckCircle2, Package, PackageCheck } from 'lucide-react';
import type { DashboardPO } from './types';

const STAGES = [
  { label: 'Requested',   icon: FilePlus,      match: (s: string) => s === 'REQUESTED' },
  { label: 'PO Created',  icon: FileText,      match: (s: string) => s === 'PO_CREATED' },
  { label: 'Approved',    icon: CheckCircle2,  match: (s: string) => s === 'APPROVED' },
  { label: 'With Vendor', icon: Package,       match: (s: string) => ['SENT_TO_VENDOR', 'BILL_UPLOADED'].includes(s) },
  { label: 'Received',    icon: PackageCheck,  match: (s: string) => ['RECEIVED', 'CLOSED'].includes(s) },
];

export default function PipelineHero({ pos, title, dateLine, summaryLine, totalOnRecord }: {
  pos: DashboardPO[];
  title: string;
  dateLine: string;
  summaryLine: string;
  totalOnRecord: number;
}) {
  const stageCounts = STAGES.map(stage => pos.filter(p => stage.match(p.status)));
  let activeIndex = -1;
  for (let i = stageCounts.length - 1; i >= 0; i--) {
    if (stageCounts[i].length > 0) { activeIndex = i; break; }
  }

  const progressPct = activeIndex >= 0 ? (activeIndex / (STAGES.length - 1)) * 80 : 0;

  const activeAvatars = activeIndex >= 0
    ? Array.from(new Map(stageCounts[activeIndex].map(p => [p.requestedBy, p])).values()).slice(0, 2)
    : [];
  const activeAvatarOverflow = activeIndex >= 0
    ? new Set(stageCounts[activeIndex].map(p => p.requestedBy)).size - activeAvatars.length
    : 0;

  return (
    <div className="cd-hero">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '22px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', margin: 0, color: '#fff' }}>{title}</h1>
          <p style={{ margin: '6px 0 0', color: 'hsl(45,40%,85%)', fontSize: '13.5px' }}>
            {dateLine} · <span style={{ color: 'var(--cd-mustard)', fontWeight: 600 }}>{summaryLine}</span>
          </p>
        </div>
        <div style={{ textAlign: 'right', fontSize: '11px', letterSpacing: '0.1em', color: 'hsl(45,20%,70%)', textTransform: 'uppercase' }}>
          Naturelite Foods · {String(totalOnRecord).padStart(4, '0')} on record
        </div>
      </div>

      <div className="cd-pipeline-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '22px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', margin: 0, color: '#fff' }}>Pipeline Flow</h2>
          <span style={{ fontSize: '11px', color: 'hsl(45,20%,70%)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>5 stages · live</span>
        </div>

        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 6px' }}>
          <div style={{ position: 'absolute', left: '10%', right: '10%', top: '28px', height: '4px', background: 'rgba(255,255,255,.12)', borderRadius: '4px' }} />
          {progressPct > 0 && (
            <div style={{ position: 'absolute', left: '10%', width: `${progressPct}%`, top: '28px', height: '4px', background: 'linear-gradient(90deg, var(--cd-mustard-dark), var(--cd-mustard))', borderRadius: '4px' }} />
          )}

          {STAGES.map((stage, i) => {
            const active = i === activeIndex;
            const count = stageCounts[i].length;
            return (
              <div key={stage.label} className="cd-node" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: active ? '6px' : '8px', width: '20%' }} tabIndex={0}>
                {active && (
                  <div style={{ display: 'flex', marginBottom: '2px', minHeight: '28px' }}>
                    {activeAvatars.map((p, idx) => (
                      p.requestedByPhoto ? (
                        <img key={p.requestedBy} src={p.requestedByPhoto} alt={p.requestedByName}
                          style={{ width: '28px', height: '28px', border: '2px solid var(--cd-forest)', marginRight: idx < activeAvatars.length - 1 ? '-9px' : 0, objectFit: 'cover', borderRadius: '50%' }} />
                      ) : (
                        <div key={p.requestedBy} style={{ width: '28px', height: '28px', border: '2px solid var(--cd-forest)', marginRight: idx < activeAvatars.length - 1 ? '-9px' : 0, borderRadius: '50%', background: 'var(--cd-mustard)', color: 'var(--cd-forest)', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {p.requestedByName?.[0] || '?'}
                        </div>
                      )
                    ))}
                    {activeAvatarOverflow > 0 && (
                      <span style={{ marginLeft: '3px', fontSize: '10px', color: 'hsl(45,20%,75%)', alignSelf: 'center' }}>+{activeAvatarOverflow}</span>
                    )}
                  </div>
                )}
                <div style={{
                  width: active ? '66px' : '56px', height: active ? '66px' : '56px', borderRadius: '50%',
                  background: active ? 'var(--cd-mustard)' : 'rgba(255,255,255,.08)',
                  border: active ? 'none' : '2px solid rgba(255,255,255,.15)',
                  display: 'grid', placeItems: 'center',
                  color: active ? 'var(--cd-forest)' : 'hsl(45,20%,75%)',
                  boxShadow: active ? '0 0 0 6px hsl(42 87% 55% / 0.2)' : 'none',
                }}>
                  <stage.icon size={active ? 26 : 22} />
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: active ? '26px' : '24px', fontWeight: 700, color: active ? 'var(--cd-mustard)' : '#fff' }}>{count}</div>
                <div style={{ fontSize: '11px', color: active ? '#fff' : 'hsl(45,20%,70%)', fontWeight: active ? 600 : 400 }}>{stage.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
