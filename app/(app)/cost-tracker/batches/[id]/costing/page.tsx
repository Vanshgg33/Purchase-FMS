'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, FileSpreadsheet } from 'lucide-react';
import { ctFetch } from '@/lib/ctClient';
import { formatMoney, formatPercent, formatIST, statusChipClass } from '@/lib/costFormat';
import { computeSellingCost } from '@/lib/costing/selling';
import { computeMargins } from '@/lib/costing/margins';
import styles from '../../../costTracker.module.css';

export default function CostSheetPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [whatIfPrice, setWhatIfPrice] = useState<number | null>(null);
  const [whatIfAdSpend, setWhatIfAdSpend] = useState<number | null>(null);

  useEffect(() => {
    ctFetch(`/api/cost-tracker/batches/${id}/costing`).then((d: any) => {
      setData(d);
      setWhatIfPrice(d.product?.sellingPrice ?? null);
    });
  }, [id]);

  const whatIf = useMemo(() => {
    if (!data || whatIfPrice === null) return null;
    const c = data.computed;
    const baseSelling = {
      shippingPerUnit: 0, adSpendPerUnit: whatIfAdSpend ?? 0, paymentGatewayPercent: 2,
      rtoProvisionPerUnit: 0, discountPerUnit: 0, supportCostPerUnit: 0,
    };
    // Reuse the actual persisted selling cost structure where possible, only override price/ad spend for the slider.
    const sc = computeSellingCost({ sellingPrice: whatIfPrice, ...baseSelling });
    return computeMargins({ sellingPrice: whatIfPrice, manufacturingCostPerUnit: c.manufacturingCostPerUnit, sellingCostPerUnit: c.sellingCostPerUnit ?? sc.sellingCostPerUnit });
  }, [data, whatIfPrice, whatIfAdSpend]);

  if (!data) return <div className="skeleton" style={{ height: 500, borderRadius: 12 }} />;

  const { batch, product, computed, consumption, labour, machine, consumables, finishedGoods } = data;
  const byProducts = finishedGoods.filter((f: any) => f.outputType === 'BY_PRODUCT');
  const primary = finishedGoods.find((f: any) => f.outputType === 'PRIMARY');

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} style={{ maxWidth: 880 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <button onClick={() => router.back()} className="btn btn-ghost btn-sm"><ArrowLeft size={14} /> Back</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <a className="btn btn-ghost btn-sm" href={`/api/cost-tracker/batches/${id}/export/pdf`} target="_blank" rel="noreferrer"><Download size={14} /> PDF</a>
          <a className="btn btn-ghost btn-sm" href={`/api/cost-tracker/batches/${id}/export/excel`}><FileSpreadsheet size={14} /> Excel</a>
        </div>
      </div>

      <div className="card" style={{ padding: 22, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h2 className="display" style={{ fontSize: 19, fontWeight: 700 }}>{batch.batchCode} — Cost Sheet</h2>
            <p className="page-sub" style={{ margin: '4px 0 0' }}>{product?.name} ({product?.sku}) · {formatIST(batch.productionDate)}</p>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <span className={`${styles.statusChip} ${styles[statusChipClass(batch.status)]}`}>{batch.status}</span>
            {computed.isProvisional && <span className="chip" style={{ color: 'var(--ct-warning)' }}>Provisional</span>}
            {batch.snapshot?.previous?.length > 0 && <span className="chip" style={{ color: 'var(--red)' }}>Revised</span>}
          </div>
        </div>
      </div>

      <Section title="A. Direct Material">
        {consumption.map((c: any) => (
          <Row key={c._id} label={`${c.lotId?.lotCode} — ${c.quantityConsumed} ${c.uom} @ ${formatMoney(c.landedCostPerUnit)}`} value={formatMoney(c.lineCost)} />
        ))}
        <Row bold label="Subtotal" value={formatMoney(computed.materialCost)} />
      </Section>

      <Section title="B. Direct Labour">
        {labour.map((l: any) => <Row key={l._id} label={`${l.labourType} — ${l.workerCount} × ${l.hours}h @ ${formatMoney(l.hourlyRate)}/hr`} value={formatMoney(l.lineCost)} />)}
        <Row bold label="Subtotal" value={formatMoney(computed.labourCost)} />
      </Section>

      <Section title="C. Power">
        {machine.map((m: any) => <Row key={m._id} label={`${m.machineName} — ${m.hours}h @ ${formatMoney(m.electricityRatePerHour)}/hr`} value={formatMoney(m.lineCost)} />)}
        <Row bold label="Subtotal" value={formatMoney(computed.electricityCost)} />
      </Section>

      <Section title="D. Consumables">
        {consumables.length === 0 && <Row label="None recorded" value="—" />}
        {consumables.map((c: any) => <Row key={c._id} label={`${c.itemName} — ${c.quantity} ${c.uom} @ ${formatMoney(c.ratePerUnit)}`} value={formatMoney(c.lineCost)} />)}
        <Row bold label="Subtotal" value={formatMoney(computed.consumablesCost)} />
      </Section>

      <Section title="E. Packaging">
        <Row label={`${primary?.unitsProduced ?? 0} units × packaging BOM`} value={formatMoney(computed.packagingCost)} />
      </Section>

      <Section title="F. Overheads">
        <Row label={computed.isProvisional ? 'Provisional rate (month open)' : 'Locked monthly rate'} value={formatMoney(computed.overheadCost)} />
      </Section>

      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <Row bold big label="Gross Manufacturing Cost" value={formatMoney(computed.grossManufacturingCost)} />
      </div>

      <Section title="G. Less: By-Product Credit">
        {byProducts.length === 0 && <Row label="None recorded" value="—" />}
        {byProducts.map((b: any) => <Row key={b._id} label={`${b.byProductName} — ${b.quantity} ${b.uom} @ ${formatMoney(b.realisableRatePerUnit)}`} value={`(${formatMoney(b.realisableValue)})`} />)}
        <Row bold label="Total Credit" value={`(${formatMoney(computed.byProductCredit)})`} />
      </Section>

      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <Row bold big label="Net Manufacturing Cost" value={formatMoney(computed.manufacturingCost)} />
        <Row bold label="Manufacturing Cost / Unit" value={computed.manufacturingCostPerUnit != null ? formatMoney(computed.manufacturingCostPerUnit) : '—'} />
      </div>

      <Section title="H. Selling Costs (per unit)">
        <Row label="Selling Cost / Unit" value={computed.sellingCostPerUnit != null ? formatMoney(computed.sellingCostPerUnit) : '—'} />
      </Section>

      <div className="card" style={{ padding: 18, marginBottom: 16, background: 'var(--ct-primary)', color: '#fff' }}>
        <Row bold big light label="Final COGS / Unit" value={computed.finalCogsPerUnit != null ? formatMoney(computed.finalCogsPerUnit) : '—'} />
        <Row light label="Gross Margin" value={formatPercent(computed.grossMarginPercent)} />
        <Row light label="Net Margin" value={formatPercent(computed.netMarginPercent)} />
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>What-If (not saved)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <label className="label">Selling Price: {formatMoney(whatIfPrice)}</label>
            <input type="range" min={0} max={(product?.sellingPrice || 1000) * 2} step="1" value={whatIfPrice ?? 0} onChange={e => setWhatIfPrice(Number(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div>
            <label className="label">Ad Spend Override: {formatMoney(whatIfAdSpend ?? 0)}</label>
            <input type="range" min={0} max={200} step="1" value={whatIfAdSpend ?? 0} onChange={e => setWhatIfAdSpend(Number(e.target.value))} style={{ width: '100%' }} />
          </div>
        </div>
        {whatIf && (
          <div style={{ marginTop: 14, display: 'flex', gap: 24 }}>
            <div><span className="label">Gross Margin</span><div style={{ fontWeight: 700, fontSize: 18, color: (whatIf.grossMarginPercent ?? 0) < 0 ? 'var(--red)' : 'var(--green)' }}>{formatPercent(whatIf.grossMarginPercent)}</div></div>
            <div><span className="label">Net Margin</span><div style={{ fontWeight: 700, fontSize: 18, color: (whatIf.netMarginPercent ?? 0) < 0 ? 'var(--red)' : 'var(--green)' }}>{formatPercent(whatIf.netMarginPercent)}</div></div>
          </div>
        )}
      </div>

      <p style={{ fontSize: 11.5, color: 'var(--text-3)', textAlign: 'right' }}>
        Computed at {formatIST(batch.costs?.lastComputedAt)} {batch.snapshot ? '· Frozen snapshot' : ''}
      </p>
    </motion.div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: 18, marginBottom: 12 }}>
      <h3 style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: 'var(--ct-primary)' }}>{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value, bold, big, light }: { label: string; value: string; bold?: boolean; big?: boolean; light?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: bold ? 'none' : '1px dashed var(--border-soft)', fontSize: big ? 15 : 13, fontWeight: bold ? 800 : 400, color: light ? '#fff' : undefined }}>
      <span>{label}</span>
      <span className="mono">{value}</span>
    </div>
  );
}
