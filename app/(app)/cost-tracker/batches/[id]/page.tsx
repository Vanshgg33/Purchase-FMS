'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft, CheckCircle2, Circle, AlertTriangle, ChevronDown, ChevronUp,
  Package, Users, Zap, Beaker, Sprout, Box, Gauge, RotateCcw, FileText,
} from 'lucide-react';
import { ctFetch } from '@/lib/ctClient';
import { formatMoney, formatDateIST, statusChipClass } from '@/lib/costFormat';
import { UOM } from '@/types/costTracker';
import styles from '../../costTracker.module.css';

type CtRole = 'ADMIN' | 'PRODUCTION';

export default function BatchCockpitPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const rawRole = (session?.user as any)?.role;
  const role: CtRole | null = rawRole === 'SUPERADMIN' ? 'ADMIN' : rawRole === 'PRODUCTION' ? 'PRODUCTION' : null;

  const [data, setData] = useState<any>(null);
  const [computed, setComputed] = useState<any>(null);
  const [missing, setMissing] = useState<any[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>('material');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [showComplete, setShowComplete] = useState(false);
  const [showReopen, setShowReopen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  const load = useCallback(async () => {
    const base = await ctFetch(`/api/cost-tracker/batches/${id}`);
    setData(base);
    if (role === 'ADMIN') {
      const c = await ctFetch(`/api/cost-tracker/batches/${id}/costing`);
      setComputed(c.computed);
      setMissing(c.missing);
    }
  }, [id, role]);

  useEffect(() => { if (role) load(); }, [id, role, load]);
  useEffect(() => { ctFetch('/api/cost-tracker/raw-materials').then(setRawMaterials); }, []);

  const notify = (msg: string, type: 'ok' | 'err' = 'ok') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const run = async (action: () => Promise<any>, successMsg: string) => {
    setBusy(true);
    try { await action(); await load(); notify(successMsg, 'ok'); }
    catch (err: any) { notify(err.message || 'Something went wrong', 'err'); throw err; }
    finally { setBusy(false); }
  };

  if (!role) return null;
  if (!data) return <div className="skeleton" style={{ height: 400, borderRadius: 12 }} />;

  const { batch, consumption, labour, machine, consumables, finishedGoods } = data;
  const isFrozen = ['COMPLETED', 'CANCELLED'].includes(batch.status);
  const primary = finishedGoods.find((f: any) => f.outputType === 'PRIMARY');
  const byProducts = finishedGoods.filter((f: any) => f.outputType === 'BY_PRODUCT');

  const complete = async () => {
    try {
      await run(() => ctFetch(`/api/cost-tracker/batches/${id}/complete`, { method: 'POST' }), 'Batch completed and frozen');
      setShowComplete(false);
    } catch (err: any) {
      if (err.code === 'INCOMPLETE_BATCH' && err.extra?.missing) setMissing(err.extra.missing);
      setShowComplete(false);
    }
  };

  const reopen = async () => {
    await run(() => ctFetch(`/api/cost-tracker/batches/${id}/reopen`, { method: 'POST', body: JSON.stringify({ reason: reopenReason }) }), 'Batch reopened');
    setShowReopen(false); setReopenReason('');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} style={{ maxWidth: 920 }}>
      <button onClick={() => router.back()} className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }}><ArrowLeft size={14} /> Back</button>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`alert ${toast.type === 'ok' ? 'alert-ok' : 'alert-err'}`} style={{ marginBottom: 14 }}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="card" style={{ padding: 22, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 className="display" style={{ fontSize: 19, fontWeight: 700 }}>{batch.batchCode}</h2>
              <span className={`${styles.statusChip} ${styles[statusChipClass(batch.status)]}`}>{batch.status}</span>
              {computed?.isProvisional && !isFrozen && <span className="chip" style={{ color: 'var(--ct-warning)' }}>Provisional Overhead</span>}
              {batch.snapshot?.previous?.length > 0 && <span className="chip" style={{ color: 'var(--red)' }}>Revised</span>}
            </div>
            <p className="page-sub" style={{ margin: '4px 0 0' }}>{batch.productId?.name} ({batch.productId?.sku}) · {formatDateIST(batch.productionDate)}{batch.shift ? ` · ${batch.shift} Shift` : ''}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {role === 'ADMIN' && <Link href={`/cost-tracker/batches/${id}/costing`} className="btn btn-ghost btn-sm"><FileText size={14} /> Cost Sheet</Link>}
            {!isFrozen && batch.status !== 'CANCELLED' && (
              <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => setShowComplete(true)}>
                <CheckCircle2 size={14} /> Complete Batch
              </button>
            )}
            {isFrozen && batch.status === 'COMPLETED' && role === 'ADMIN' && (
              <button className="btn btn-danger btn-sm" onClick={() => setShowReopen(true)}><RotateCcw size={14} /> Reopen & Recost</button>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, marginBottom: 16 }}>
        <div className={styles.stepper}>
          <Step id="material" icon={<Package size={14} />} title="1. Material Consumption" done={batch.flags?.hasMaterialConsumed}
            meta={consumption.length ? `${consumption.reduce((s: number, c: any) => s + c.quantityConsumed, 0)} consumed across ${consumption.length} lot(s)` : 'Not recorded'}
            expanded={expanded} setExpanded={setExpanded} disabled={isFrozen}>
            {consumption.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {consumption.map((c: any) => (
                  <div key={c._id} className="mono" style={{ fontSize: 12, color: 'var(--text-3)', padding: '4px 0' }}>
                    {c.lotId?.lotCode} · {c.quantityConsumed} {c.uom}{role === 'ADMIN' ? ` @ ${formatMoney(c.landedCostPerUnit)}` : ''}
                  </div>
                ))}
              </div>
            )}
            {!isFrozen && <ConsumeForm materials={rawMaterials} busy={busy} onSubmit={(v: any) => run(() => ctFetch(`/api/cost-tracker/batches/${id}/consume`, { method: 'POST', body: JSON.stringify(v) }), 'Material consumed (FIFO)')} />}
          </Step>

          <Step id="labour" icon={<Users size={14} />} title="2. Labour" done={batch.flags?.hasLabourRecorded}
            meta={labour.length ? `${labour.reduce((s: number, l: any) => s + l.totalHours, 0)} hrs across ${labour.length} entr${labour.length === 1 ? 'y' : 'ies'}` : 'Not recorded'}
            expanded={expanded} setExpanded={setExpanded} disabled={isFrozen}>
            {!isFrozen && <LabourForm busy={busy} onSubmit={(v: any) => run(() => ctFetch(`/api/cost-tracker/batches/${id}/labour`, { method: 'POST', body: JSON.stringify(v) }), 'Labour recorded')} />}
          </Step>

          <Step id="machine" icon={<Zap size={14} />} title="3. Machine Hours & Power" done={batch.flags?.hasMachineRecorded}
            meta={machine.length ? `${machine.reduce((s: number, m: any) => s + m.hours, 0)} hrs across ${machine.length} entr${machine.length === 1 ? 'y' : 'ies'}` : 'Not recorded'}
            expanded={expanded} setExpanded={setExpanded} disabled={isFrozen}>
            {!isFrozen && <MachineForm busy={busy} onSubmit={(v: any) => run(() => ctFetch(`/api/cost-tracker/batches/${id}/machine`, { method: 'POST', body: JSON.stringify(v) }), 'Machine hours recorded')} />}
          </Step>

          <Step id="consumables" icon={<Beaker size={14} />} title="4. Consumables" done={batch.flags?.hasConsumablesRecorded}
            meta={consumables.length ? `${consumables.length} item(s) — Optional` : 'Optional'}
            expanded={expanded} setExpanded={setExpanded} disabled={isFrozen}>
            {!isFrozen && <ConsumableForm busy={busy} onSubmit={(v: any) => run(() => ctFetch(`/api/cost-tracker/batches/${id}/consumables`, { method: 'POST', body: JSON.stringify(v) }), 'Consumable recorded')} />}
          </Step>

          <Step id="yield" icon={<Sprout size={14} />} title="5. Yield & By-Products" done={batch.flags?.hasYieldRecorded}
            meta={primary ? `${primary.quantity} ${primary.uom} → ${primary.unitsProduced} units${byProducts.length ? ` + ${byProducts.length} by-product(s)` : ''}` : 'Not recorded'}
            expanded={expanded} setExpanded={setExpanded} disabled={isFrozen}>
            {!isFrozen && <YieldForm busy={busy} onSubmit={(v: any) => run(() => ctFetch(`/api/cost-tracker/batches/${id}/yield`, { method: 'POST', body: JSON.stringify(v) }), 'Yield recorded')} />}
          </Step>

          <Step id="packaging" icon={<Box size={14} />} title="6. Packaging BOM" done={batch.flags?.hasPackagingRecorded}
            meta={batch.flags?.hasPackagingRecorded ? 'Applied' : (primary ? 'Ready to apply' : 'Record yield first')}
            expanded={expanded} setExpanded={setExpanded} disabled={isFrozen}>
            {!isFrozen && (
              <button className="btn btn-primary btn-sm" disabled={busy || !primary} onClick={() => run(() => ctFetch(`/api/cost-tracker/batches/${id}/packaging`, { method: 'POST' }), 'Packaging BOM applied')}>
                Apply Active BOM
              </button>
            )}
          </Step>

          <Step id="overhead" icon={<Gauge size={14} />} title="7. Overhead Allocation" done={batch.flags?.hasOverheadAllocated}
            meta={role === 'ADMIN' ? (computed?.isProvisional ? 'Provisional (month open)' : batch.flags?.hasOverheadAllocated ? 'Locked rate applied' : 'No overhead month recorded yet') : 'Automatic'}
            expanded={expanded} setExpanded={setExpanded} disabled last>
            <p style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Overhead is allocated automatically from the monthly overhead rate for this batch's production month. Set it under Masters → Overheads.</p>
          </Step>
        </div>
      </div>

      {role === 'ADMIN' && computed && (
        <div className={styles.costStrip}>
          <span>Live cost: <strong className={styles.money}>{formatMoney(computed.manufacturingCost)}</strong></span>
          <span className={styles.money}>{computed.manufacturingCostPerUnit != null ? `${formatMoney(computed.manufacturingCostPerUnit)}/unit` : '—'}</span>
        </div>
      )}

      {showComplete && (
        <div className="modal-backdrop">
          <div className="card" style={{ width: '100%', maxWidth: 440, padding: 26 }}>
            <h3 className="display" style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Complete Batch?</h3>
            {missing.length > 0 ? (
              <div className="alert alert-warn" style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} /> Cannot complete yet:</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>{missing.map((m: any) => <li key={m.step}>{m.label}</li>)}</ul>
              </div>
            ) : (
              <p style={{ fontSize: 13.5, color: 'var(--text-2)', marginBottom: 14 }}>All required steps are recorded. Completing will freeze this batch's rates permanently.</p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setShowComplete(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={busy} onClick={complete}>Complete Batch</button>
            </div>
          </div>
        </div>
      )}

      {showReopen && (
        <div className="modal-backdrop">
          <div className="card" style={{ width: '100%', maxWidth: 440, padding: 26 }}>
            <h3 className="display" style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Reopen & Recost</h3>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 10 }}>This permanently records why a completed, reported batch is being reopened.</p>
            <label className="label">Reason (min. 10 characters)</label>
            <textarea className="field" rows={3} value={reopenReason} onChange={e => setReopenReason(e.target.value)} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
              <button className="btn btn-ghost" onClick={() => setShowReopen(false)}>Cancel</button>
              <button className="btn btn-danger" disabled={busy || reopenReason.trim().length < 10} onClick={reopen}>Reopen</button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function Step({ id, icon, title, done, meta, expanded, setExpanded, disabled, last, children }: any) {
  const isOpen = expanded === id;
  return (
    <div className={styles.step} style={{ borderBottom: last ? 'none' : undefined, flexDirection: 'column', alignItems: 'stretch', cursor: 'default' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: disabled && id !== 'overhead' ? 'default' : 'pointer' }} onClick={() => setExpanded(isOpen ? null : id)}>
        <div className={`${styles.stepIcon} ${done ? styles.done : ''}`}>{done ? <CheckCircle2 size={15} /> : icon}</div>
        <div className={styles.stepBody}>
          <div className={styles.stepTitle}>{title}</div>
          <div className={styles.stepMeta}>{meta}</div>
        </div>
        {!disabled && (isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '4px 0 14px 38px' }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ConsumeForm({ materials, busy, onSubmit }: any) {
  const [rawMaterialId, setRawMaterialId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [uom, setUom] = useState('KG');
  const submit = (e: React.FormEvent) => { e.preventDefault(); onSubmit({ rawMaterialId, quantity: Number(quantity), uom }).then(() => { setQuantity(''); }).catch(() => {}); };
  return (
    <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, alignItems: 'end', maxWidth: 560 }}>
      <div><label className="label">Raw Material</label>
        <select required className="field" value={rawMaterialId} onChange={e => { setRawMaterialId(e.target.value); const m = materials.find((x: any) => x._id === e.target.value); if (m) setUom(m.uom); }}>
          <option value="">Select…</option>{materials.map((m: any) => <option key={m._id} value={m._id}>{m.name}</option>)}
        </select>
      </div>
      <div><label className="label">Qty</label><input required type="number" step="0.001" className="field" value={quantity} onChange={e => setQuantity(e.target.value)} /></div>
      <div><label className="label">UOM</label><select className="field" value={uom} onChange={e => setUom(e.target.value)}>{UOM.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
      <button className="btn btn-primary btn-sm" disabled={busy}>Consume</button>
    </form>
  );
}

function LabourForm({ busy, onSubmit }: any) {
  const [labourType, setLabourType] = useState('SKILLED');
  const [workerCount, setWorkerCount] = useState('1');
  const [hours, setHours] = useState('');
  const submit = (e: React.FormEvent) => { e.preventDefault(); onSubmit({ labourType, workerCount: Number(workerCount), hours: Number(hours) }).then(() => setHours('')).catch(() => {}); };
  return (
    <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, alignItems: 'end', maxWidth: 480 }}>
      <div><label className="label">Type</label><select className="field" value={labourType} onChange={e => setLabourType(e.target.value)}><option value="SKILLED">Skilled</option><option value="UNSKILLED">Unskilled</option><option value="CONTRACT">Contract</option></select></div>
      <div><label className="label">Workers</label><input required type="number" min={1} className="field" value={workerCount} onChange={e => setWorkerCount(e.target.value)} /></div>
      <div><label className="label">Hours (each)</label><input required type="number" step="0.25" className="field" value={hours} onChange={e => setHours(e.target.value)} /></div>
      <button className="btn btn-primary btn-sm" disabled={busy}>Add</button>
    </form>
  );
}

function MachineForm({ busy, onSubmit }: any) {
  const [machineName, setMachineName] = useState('');
  const [hours, setHours] = useState('');
  const submit = (e: React.FormEvent) => { e.preventDefault(); onSubmit({ machineName, hours: Number(hours) }).then(() => setHours('')).catch(() => {}); };
  return (
    <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 8, alignItems: 'end', maxWidth: 480 }}>
      <div><label className="label">Machine</label><input required className="field" value={machineName} onChange={e => setMachineName(e.target.value)} placeholder="Wood Press Unit 2" /></div>
      <div><label className="label">Hours</label><input required type="number" step="0.25" className="field" value={hours} onChange={e => setHours(e.target.value)} /></div>
      <button className="btn btn-primary btn-sm" disabled={busy}>Add</button>
    </form>
  );
}

function ConsumableForm({ busy, onSubmit }: any) {
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [uom, setUom] = useState('PCS');
  const [ratePerUnit, setRatePerUnit] = useState('');
  const submit = (e: React.FormEvent) => { e.preventDefault(); onSubmit({ itemName, quantity: Number(quantity), uom, ratePerUnit: Number(ratePerUnit) }).then(() => { setItemName(''); setQuantity(''); setRatePerUnit(''); }).catch(() => {}); };
  return (
    <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 8, alignItems: 'end', maxWidth: 640 }}>
      <div><label className="label">Item</label><input required className="field" value={itemName} onChange={e => setItemName(e.target.value)} placeholder="Filter Cloth" /></div>
      <div><label className="label">Qty</label><input required type="number" step="0.01" className="field" value={quantity} onChange={e => setQuantity(e.target.value)} /></div>
      <div><label className="label">UOM</label><select className="field" value={uom} onChange={e => setUom(e.target.value)}>{UOM.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
      <div><label className="label">Rate</label><input required type="number" step="0.01" className="field" value={ratePerUnit} onChange={e => setRatePerUnit(e.target.value)} /></div>
      <button className="btn btn-primary btn-sm" disabled={busy}>Add</button>
    </form>
  );
}

function YieldForm({ busy, onSubmit }: any) {
  const [quantity, setQuantity] = useState('');
  const [uom, setUom] = useState('LITRE');
  const [unitsProduced, setUnitsProduced] = useState('');
  const [byProducts, setByProducts] = useState<{ byProductName: string; quantity: string; uom: string; realisableRatePerUnit: string }[]>([]);

  const addBp = () => setByProducts(bs => [...bs, { byProductName: '', quantity: '', uom: 'KG', realisableRatePerUnit: '' }]);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      primary: { quantity: Number(quantity), uom, unitsProduced: Number(unitsProduced) },
      byProducts: byProducts.filter(b => b.byProductName).map(b => ({ byProductName: b.byProductName, quantity: Number(b.quantity), uom: b.uom, realisableRatePerUnit: Number(b.realisableRatePerUnit) })),
    }).catch(() => {});
  };
  return (
    <form onSubmit={submit} style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <div><label className="label">Primary Output Qty</label><input required type="number" step="0.01" className="field" value={quantity} onChange={e => setQuantity(e.target.value)} /></div>
        <div><label className="label">UOM</label><select className="field" value={uom} onChange={e => setUom(e.target.value)}>{UOM.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
        <div><label className="label">Units Produced</label><input required type="number" step="1" className="field" value={unitsProduced} onChange={e => setUnitsProduced(e.target.value)} /></div>
      </div>
      {byProducts.map((b, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 8 }}>
          <input placeholder="By-product name" className="field" value={b.byProductName} onChange={e => setByProducts(bs => bs.map((x, idx) => idx === i ? { ...x, byProductName: e.target.value } : x))} />
          <input placeholder="Qty" type="number" step="0.01" className="field" value={b.quantity} onChange={e => setByProducts(bs => bs.map((x, idx) => idx === i ? { ...x, quantity: e.target.value } : x))} />
          <select className="field" value={b.uom} onChange={e => setByProducts(bs => bs.map((x, idx) => idx === i ? { ...x, uom: e.target.value } : x))}>{UOM.map(u => <option key={u} value={u}>{u}</option>)}</select>
          <input placeholder="Rate/unit" type="number" step="0.01" className="field" value={b.realisableRatePerUnit} onChange={e => setByProducts(bs => bs.map((x, idx) => idx === i ? { ...x, realisableRatePerUnit: e.target.value } : x))} />
        </div>
      ))}
      <button type="button" onClick={addBp} className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}>+ Add By-Product</button>
      <button className="btn btn-primary btn-sm" disabled={busy} style={{ alignSelf: 'flex-start' }}>Save Yield</button>
    </form>
  );
}
