'use server';

// Server actions for rewards (lib/rewards/): a person's own standing and earnings, and the admin's payouts.

import { revalidatePath } from 'next/cache';
import { getOrCreateCurrentUser } from './case-actions';
import { listCertificates, listPayouts, markPayoutsPaid, myRewards, reviewLedger, saveUpi, setAdvisoryBoard, voidPayouts } from '@/lib/rewards/server';

export async function fetchMyRewards() {
  const user = await getOrCreateCurrentUser();
  return myRewards(user.id);
}

export async function saveUpiAction(upiId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await getOrCreateCurrentUser();
    await saveUpi(user.id, upiId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not save your UPI id.' };
  }
}

async function requireAdmin() {
  const user = await getOrCreateCurrentUser();
  if (user.role !== 'admin') throw new Error('Admins only');
  return user;
}

/** What is owed and paid, and (after it, since listing payouts brings both up to date) the certificates issued. */
export async function fetchPayouts() {
  await requireAdmin();
  const payouts = await listPayouts();
  const waiting = (await reviewLedger()).filter((r) => !r.accepted && r.pay.amount > 0);
  return { payouts, certificates: await listCertificates(), waiting };
}

export async function markPaidAction(ids: string[], paidRef: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const admin = await requireAdmin();
    if (ids.length === 0) return { ok: false, error: 'Nothing to mark as paid.' };
    await markPayoutsPaid(ids, paidRef, admin.id);
    revalidatePath('/dashboard/admin/payouts');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not mark as paid.' };
  }
}

export async function voidPayoutAction(id: string, reason: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    if (!reason.trim()) return { ok: false, error: 'Please give a reason.' };
    await voidPayouts([id], reason);
    revalidatePath('/dashboard/admin/payouts');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not update.' };
  }
}

export async function setAdvisoryBoardAction(userId: string, on: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    await setAdvisoryBoard(userId, on);
    revalidatePath('/dashboard/admin/reviewers');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not update.' };
  }
}
