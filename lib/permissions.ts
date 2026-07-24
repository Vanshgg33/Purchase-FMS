// Naturelite Manufacturing Cost Tracker — role/capability matrix (spec §9)
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AppError } from '@/lib/costErrors';
import type { CtRole } from '@/types/costTracker';

export type Capability =
  | 'VIEW_DASHBOARD'
  | 'VIEW_COSTING'
  | 'MANAGE_MASTERS'
  | 'CREATE_PURCHASE'
  | 'POST_PURCHASE'
  | 'REVERSE_PURCHASE'
  | 'VIEW_INVENTORY'
  | 'VIEW_LOT_COST'
  | 'CREATE_BATCH'
  | 'RECORD_BATCH_INPUTS'
  | 'RECORD_YIELD'
  | 'APPLY_PACKAGING'
  | 'COMPLETE_BATCH'
  | 'REOPEN_BATCH'
  | 'MANAGE_RATES'
  | 'MANAGE_PRODUCTS'
  | 'VIEW_AUDIT'
  | 'EXPORT';

const ADMIN_CAPS: Capability[] = [
  'VIEW_DASHBOARD', 'VIEW_COSTING', 'MANAGE_MASTERS', 'CREATE_PURCHASE', 'POST_PURCHASE',
  'REVERSE_PURCHASE', 'VIEW_INVENTORY', 'VIEW_LOT_COST', 'CREATE_BATCH', 'RECORD_BATCH_INPUTS',
  'RECORD_YIELD', 'APPLY_PACKAGING', 'COMPLETE_BATCH', 'REOPEN_BATCH', 'MANAGE_RATES',
  'MANAGE_PRODUCTS', 'VIEW_AUDIT', 'EXPORT',
];

const PRODUCTION_CAPS: Capability[] = [
  'CREATE_PURCHASE', 'VIEW_INVENTORY', 'CREATE_BATCH', 'RECORD_BATCH_INPUTS',
  'RECORD_YIELD', 'APPLY_PACKAGING', 'COMPLETE_BATCH',
];

const PERMISSIONS: Record<CtRole, Capability[]> = {
  ADMIN: ADMIN_CAPS,
  PRODUCTION: PRODUCTION_CAPS,
};

/** Maps the app's global User.role to the cost tracker's ADMIN/PRODUCTION model. */
export function toCtRole(userRole: string | undefined): CtRole | null {
  if (userRole === 'SUPERADMIN') return 'ADMIN';
  if (userRole === 'PRODUCTION') return 'PRODUCTION';
  return null;
}

export const can = (role: CtRole, capability: Capability): boolean =>
  PERMISSIONS[role]?.includes(capability) ?? false;

export interface CtSession {
  userId: string; // Mongo _id
  userLoginId: string; // human login id
  name: string;
  role: CtRole;
}

/** Authenticates the request and returns the cost-tracker session, or throws AppError. */
export async function requireCtSession(): Promise<CtSession> {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user) throw new AppError('UNAUTHENTICATED', 'No valid session');
  const role = toCtRole(user.role);
  if (!role) throw new AppError('FORBIDDEN', 'Role lacks access to Cost Tracker');
  return { userId: user.id, userLoginId: user.userId, name: user.name, role };
}

export async function requireCapability(capability: Capability): Promise<CtSession> {
  const ctSession = await requireCtSession();
  if (!can(ctSession.role, capability)) {
    throw new AppError('FORBIDDEN', `Role ${ctSession.role} lacks capability ${capability}`);
  }
  return ctSession;
}

/** Strips cost/money fields from a plain object for PRODUCTION responses. Never rely on UI hiding alone. */
export function stripCostFields<T extends Record<string, any>>(obj: T, role: CtRole, fields: string[]): T {
  if (role === 'ADMIN') return obj;
  const clone: Record<string, any> = { ...obj };
  for (const f of fields) delete clone[f];
  return clone as T;
}
