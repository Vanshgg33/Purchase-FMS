export interface DashboardPO {
  _id: string;
  poNumber: string;
  status: string;
  materials: Array<{ name: string; requestedQty: number }>;
  requestedBy: string;
  requestedByName: string;
  requestedByPhoto: string | null;
  vendor?: { vendorId?: string; name?: string };
  vendorPhoto: string | null;
  deadlines: { neededBy?: string; deliveryDeadline?: string };
  updatedAt: string;
  createdAt: string;
}
