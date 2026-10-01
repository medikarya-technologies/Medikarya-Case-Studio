'use server';

// Server actions for the reviewer programme (lib/reviewers/server.ts): applying, the admin's verification, and a
// reviewer's queue, claims and decisions.

import { revalidatePath } from 'next/cache';
import { getOrCreateCurrentUser } from './case-actions';
import {
  claimCase,
  decideApplication,
  getReviewerProfile,
  listApplications,
  myReviews,
  recordConversionDecision,
  reviewQueue,
  saveApplication,
  type Application,
} from '@/lib/reviewers/server';

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const fail = (error: unknown, fallback: string): { ok: false; error: string } => {
  console.error(fallback, error);
  return { ok: false, error: error instanceof Error ? error.message : fallback };
};

export async function submitReviewerApplication(a: Application): Promise<Result> {
  try {
    const user = await getOrCreateCurrentUser();
    if (!a.institution.trim()) return { ok: false, error: 'Please enter your institution.' };
    if (a.specialties.length === 0) return { ok: false, error: 'Please choose at least one specialty.' };
    if (a.kind !== 'faculty' && !a.registration_no.trim()) return { ok: false, error: 'Please enter your medical council registration number.' };
    await saveApplication(user.id, a);
    revalidatePath('/join/reviewer');
    revalidatePath('/dashboard/admin/reviewers');
    return { ok: true };
  } catch (error) {
    return fail(error, 'Could not save your application.');
  }
}

export async function fetchMyReviewerState() {
  const user = await getOrCreateCurrentUser();
  const profile = await getReviewerProfile(user.id);
  const [queue, mine] = profile?.status === 'approved' ? await Promise.all([reviewQueue(profile), myReviews(user.id)]) : [[], []];
  return { user: { name: user.name, role: user.role }, profile, queue, mine };
}

export async function claimCaseAction(caseId: string): Promise<Result<{ claimId: string }>> {
  try {
    const user = await getOrCreateCurrentUser();
    const r = await claimCase(caseId, user.id);
    if ('error' in r) return { ok: false, error: r.error };
    revalidatePath('/dashboard/reviewer/medikarya');
    return { ok: true, data: { claimId: r.claimId } };
  } catch (error) {
    return fail(error, 'Could not claim the case.');
  }
}

export async function submitConversionReview(
  claimId: string,
  d: { decision: 'approved' | 'changes_requested'; comments: string; showName: boolean }
): Promise<Result> {
  try {
    const user = await getOrCreateCurrentUser();
    const r = await recordConversionDecision(claimId, user.id, d);
    if ('error' in r) return { ok: false, error: r.error };
    revalidatePath('/dashboard/reviewer/medikarya');
    return { ok: true };
  } catch (error) {
    return fail(error, 'Could not save your review.');
  }
}

async function requireAdmin() {
  const user = await getOrCreateCurrentUser();
  if (user.role !== 'admin') throw new Error('Admins only');
  return user;
}

export async function fetchReviewerApplications() {
  await requireAdmin();
  return listApplications();
}

export async function decideReviewerApplication(userId: string, approve: boolean, specialties: string[], note: string): Promise<Result> {
  try {
    const admin = await requireAdmin();
    if (approve && specialties.length === 0) return { ok: false, error: 'Choose at least one specialty they may review.' };
    await decideApplication(userId, approve, specialties, note, admin.id);
    revalidatePath('/dashboard/admin/reviewers');
    return { ok: true };
  } catch (error) {
    return fail(error, 'Could not update the application.');
  }
}
