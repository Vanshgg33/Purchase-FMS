// Naturelite Manufacturing Cost Tracker — the five direct cost heads (spec §5.6)
import { round2, round4 } from './round';

export interface LabourLine {
  totalHours: number;
  hourlyRate: number;
}
export function computeLabourCost(lines: LabourLine[]): number {
  return round2(lines.reduce((s, l) => s + round2(l.totalHours * l.hourlyRate), 0));
}

export interface MachineLine {
  hours: number;
  electricityRatePerHour: number;
}
export function computeElectricityCost(lines: MachineLine[]): number {
  return round2(lines.reduce((s, l) => s + round2(l.hours * l.electricityRatePerHour), 0));
}

export interface ConsumableLine {
  quantity: number;
  ratePerUnit: number;
}
export function computeConsumablesCost(lines: ConsumableLine[]): number {
  return round2(lines.reduce((s, l) => s + round2(l.quantity * l.ratePerUnit), 0));
}

export interface PackagingComponentLine {
  qtyPerUnit: number;
  rateSnapshot: number;
}
export function computeTotalPackagingCostPerUnit(components: PackagingComponentLine[]): number {
  return round2(components.reduce((s, c) => s + round2(c.qtyPerUnit * c.rateSnapshot), 0));
}
export function computePackagingCost(unitsProduced: number, totalPackagingCostPerUnit: number): number {
  return round2(unitsProduced * totalPackagingCostPerUnit);
}

export function computeOverheadRatePerUnit(totalOverhead: number, totalProductionQty: number): number {
  return round4(totalOverhead / totalProductionQty);
}
export function computeOverheadCost(primaryOutputQty: number, overheadRatePerUnit: number): number {
  return round2(primaryOutputQty * overheadRatePerUnit);
}
