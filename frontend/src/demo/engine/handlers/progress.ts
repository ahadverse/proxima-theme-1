import type { Database, Tx } from '../db';

/**
 * The demo's "try it" checklist (docs/DEMO_MODE_PLAN.md §4.6). Steps tick themselves off as the visitor does them — in
 * either app, since both share this record — and the other app hears about it at once.
 */
export const CHECKLIST_STEPS = ['order', 'theme', 'product', 'coupon', 'status'] as const;
export type ChecklistStep = (typeof CHECKLIST_STEPS)[number];

function progressDoc(tx: Tx) {
  if (!tx.get('demo', 'progress')) tx.insert('demo', { _id: 'progress', steps: {}, completedAt: null, couponCodes: [], changedOrders: [] });
  return tx.get('demo', 'progress');
}

export function markProgress(tx: Tx, step: ChecklistStep) {
  if (progressDoc(tx)?.steps?.[step]) return;
  const progress = tx.edit('demo', 'progress', { touch: false });
  if (!progress) return;
  progress.steps = { ...progress.steps, [step]: tx.now };
  tx.note('checklist.done', { step });
  if (!progress.completedAt && CHECKLIST_STEPS.every((s) => progress.steps[s])) progress.completedAt = tx.now;
}

/** Coupons the visitor made themselves — using one of those at checkout is the "coupon" step. */
export function rememberCoupon(tx: Tx, code: string) {
  progressDoc(tx);
  const progress = tx.edit('demo', 'progress', { touch: false });
  if (progress) progress.couponCodes = [...new Set([...(progress.couponCodes ?? []), code])];
}

export const isVisitorsCoupon = (db: Pick<Database, 'get'>, code: string) =>
  Boolean(db.get('demo', 'progress')?.couponCodes?.includes(code));

/** Orders whose status was changed in the admin — tracking one of those on the store is the "status" step. */
export function rememberStatusChange(tx: Tx, orderId: string) {
  progressDoc(tx);
  const progress = tx.edit('demo', 'progress', { touch: false });
  if (progress) progress.changedOrders = [...new Set([...(progress.changedOrders ?? []), orderId])];
}

export const wasChangedInAdmin = (db: Pick<Database, 'get'>, orderId: string) =>
  Boolean(db.get('demo', 'progress')?.changedOrders?.includes(orderId));
