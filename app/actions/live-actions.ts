'use server';

// The live course of a case (lib/live-plan.ts): read for the editor, saved, removed. Only residents and above write
// one (canWriteLiveCourse), and only on their own case while it can still be edited (or as an admin).

import { revalidatePath } from 'next/cache';
import { getOrCreateCurrentUser } from './case-actions';
import { getCaseById } from '@/lib/supabase/queries';
import { createServiceClient } from '@/lib/supabase/server';
import { canWriteLiveCourse } from '@/lib/writers/server';
import { livePlanProblems, slugify, type LivePlan } from '@/lib/live-plan';

type Result = { ok: true } | { ok: false; error: string; problems?: string[] };

async function editable(caseId: string) {
  const user = await getOrCreateCurrentUser();
  const caseData = await getCaseById(caseId);
  if (!caseData) return { user, caseData: null, canEdit: false };
  const own = caseData.author_id === user.id && (caseData.status === 'draft' || caseData.status === 'changes_requested');
  return { user, caseData, canEdit: own || user.role === 'admin' };
}

export async function fetchLiveCourse(caseId: string): Promise<{
  title: string;
  plan: LivePlan | null;
  canWrite: boolean;
  canEdit: boolean;
  vitals: { pulse?: string; bp?: string; rr?: string; temp?: string };
} | null> {
  const { user, caseData, canEdit } = await editable(caseId);
  if (!caseData) return null;
  // Anyone who may read the case may read its live course; writing it is narrower.
  if (!canEdit && caseData.author_id !== user.id && user.role !== 'reviewer' && user.role !== 'admin') return null;
  const gpe = (caseData.general_physical_examination ?? {}) as Record<string, any>;
  return {
    title: caseData.title,
    plan: ((caseData as any).live_plan as LivePlan | null) ?? null,
    canWrite: await canWriteLiveCourse(user),
    canEdit,
    vitals: { pulse: gpe.pulse, bp: gpe.bp, rr: gpe.respiratory_rate, temp: gpe.temperature },
  };
}

/** May the signed-in person write live courses at all (residents and above)? */
export async function canWriteLiveCourseAction(): Promise<boolean> {
  try {
    return await canWriteLiveCourse(await getOrCreateCurrentUser());
  } catch {
    return false;
  }
}

/** Keeps only the fields a live course has, with ids made from the names, before it is checked and saved. */
function tidy(p: LivePlan): LivePlan {
  const treatments = p.treatments.map((t) => ({ ...t, id: slugify(t.label) }));
  const byOldId = new Map(p.treatments.map((t, i) => [t.id, treatments[i].id]));
  return {
    version: 1,
    origin: 'author',
    status: 'proposed',
    summary: p.summary.trim(),
    ...(p.setting?.trim() ? { setting: p.setting.trim() } : {}),
    critical_window_minutes: p.critical_window_minutes,
    time_limit_minutes: p.time_limit_minutes,
    ...(p.arrival ? { arrival: p.arrival } : {}),
    stages: p.stages.map((s, i) => ({ ...s, id: `${slugify(s.name || `step_${i + 1}`)}_${i + 1}`, name: s.name.trim(), nurse_says: s.nurse_says.trim() })),
    treatments,
    stabilised_by: p.stabilised_by.map((id) => byOldId.get(id) ?? id).filter((id) => treatments.some((t) => t.id === id)),
    recovery: { ...p.recovery, nurse_says: p.recovery.nurse_says.trim() },
    ...(p.basis?.length ? { basis: p.basis.map((b) => b.trim()).filter(Boolean).slice(0, 20) } : {}),
    drafted_at: new Date().toISOString(),
  };
}

export async function saveLiveCourseAction(caseId: string, plan: LivePlan): Promise<Result> {
  try {
    const { user, caseData, canEdit } = await editable(caseId);
    if (!caseData || !canEdit) return { ok: false, error: 'You cannot change this case now.' };
    if (!(await canWriteLiveCourse(user))) return { ok: false, error: 'Live courses are written by residents, doctors and faculty.' };
    const clean = tidy(plan);
    const problems = livePlanProblems(clean);
    if (problems.length > 0) return { ok: false, error: 'Some parts need fixing first.', problems };
    const { error } = await createServiceClient().from('cases').update({ live_plan: clean }).eq('id', caseId);
    if (error) {
      if (/live_plan/.test(error.message)) return { ok: false, error: 'Run migration 015 first: the database has no place for a live course yet.' };
      throw error;
    }
    revalidatePath(`/cases/${caseId}`);
    return { ok: true };
  } catch (error) {
    console.error('[live] save failed:', error);
    return { ok: false, error: 'Could not save the live course. Please try again.' };
  }
}

export async function removeLiveCourseAction(caseId: string): Promise<Result> {
  try {
    const { caseData, canEdit } = await editable(caseId);
    if (!caseData || !canEdit) return { ok: false, error: 'You cannot change this case now.' };
    const { error } = await createServiceClient().from('cases').update({ live_plan: null }).eq('id', caseId);
    if (error) throw error;
    revalidatePath(`/cases/${caseId}`);
    return { ok: true };
  } catch (error) {
    console.error('[live] remove failed:', error);
    return { ok: false, error: 'Could not remove the live course.' };
  }
}
