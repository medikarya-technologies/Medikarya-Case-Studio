import 'server-only';

import { createServiceClient } from '@/lib/supabase/server';

// The reviewer programme (supabase/migrations/010_reviewer_programme.sql). People apply at /join/reviewer; an admin
// verifies them (their medical council registration, checked on the public Indian Medical Register) and approves
// the specialties they may review; verified reviewers claim cases from a queue and review the student's case sheet
// together with MediKarya's AI-built version of it (case_conversions, written by MediKarya when it converts a case).

export const CLAIM_HOURS = 72;

export * from './shared';
import type { ConversionReview, ReviewerProfile, ApplicationWithUser, QueueItem, Application } from './shared';

const db = () => createServiceClient();

export async function getReviewerProfile(userId: string): Promise<ReviewerProfile | null> {
  const { data, error } = await db().from('reviewer_profiles').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data as ReviewerProfile | null;
}


/** Saves an application (or an approved reviewer's updated details, without touching their approval). */
export async function saveApplication(userId: string, a: Application): Promise<void> {
  const existing = await getReviewerProfile(userId);
  const clean = (s: string, max = 160) => s.trim().slice(0, max) || null;
  const row = {
    user_id: userId,
    kind: a.kind,
    designation: clean(a.designation),
    department: clean(a.department),
    institution: clean(a.institution) ?? '',
    specialties: a.specialties.slice(0, 20),
    council: clean(a.council),
    registration_no: clean(a.registration_no, 40),
    linkedin_url: clean(a.linkedin_url, 300),
    upi_id: clean(a.upi_id, 80),
    updated_at: new Date().toISOString(),
    // a rejected applicant who applies again goes back to the queue
    ...(existing?.status === 'rejected' ? { status: 'pending', admin_note: null } : {}),
  };
  const { error } = await db().from('reviewer_profiles').upsert(row, { onConflict: 'user_id' });
  if (error) throw error;
}


export async function listApplications(): Promise<ApplicationWithUser[]> {
  const { data, error } = await db()
    .from('reviewer_profiles')
    .select('*, users!reviewer_profiles_user_id_fkey(name, email, role)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ ...r, name: r.users?.name ?? '', email: r.users?.email ?? '', role: r.users?.role ?? '' }));
}

/** Approves (with the specialties they may review) or rejects an application. Approval makes them a reviewer. */
export async function decideApplication(userId: string, approve: boolean, specialties: string[], note: string, adminId: string): Promise<void> {
  const client = db();
  const { error } = await client
    .from('reviewer_profiles')
    .update({
      status: approve ? 'approved' : 'rejected',
      approved_specialties: approve ? specialties : [],
      admin_note: note.trim() || null,
      verified_by: adminId,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw error;
  if (approve) {
    // An admin stays an admin; anyone else becomes a reviewer.
    const { error: roleError } = await client.from('users').update({ role: 'reviewer' }).eq('id', userId).neq('role', 'admin');
    if (roleError) throw roleError;
  }
}

// ── The queue ───────────────────────────────────────────────────────────────

/** May this reviewer review a case of this specialty and difficulty? Advanced cases are for faculty. */
export function mayReview(profile: Pick<ReviewerProfile, 'status' | 'approved_specialties' | 'kind'>, specialty: string, difficulty: string): boolean {
  if (profile.status !== 'approved') return false;
  if (!profile.approved_specialties.includes(specialty)) return false;
  if (difficulty.toLowerCase() === 'advanced' && profile.kind !== 'faculty') return false;
  return true;
}

const isOpenClaim = (r: Pick<ConversionReview, 'decision' | 'claim_expires_at'>, now = Date.now()) =>
  r.decision === null && Date.parse(r.claim_expires_at) > now;

/** Converted cases waiting for a review of their current version, that this reviewer may take. */
export async function reviewQueue(profile: ReviewerProfile): Promise<QueueItem[]> {
  const client = db();
  const { data: conversions, error } = await client
    .from('case_conversions')
    .select('case_id, version, converted_at, case_json, cases!inner(title, specialty, original_author_name, patient_details)');
  if (error) throw error;
  if (!conversions?.length) return [];

  const { data: reviews, error: reviewsError } = await client
    .from('conversion_reviews')
    .select('case_id, version, decision, claim_expires_at')
    .in('case_id', conversions.map((c) => c.case_id));
  if (reviewsError) throw reviewsError;

  const items: QueueItem[] = [];
  for (const c of conversions as any[]) {
    const forVersion = (reviews ?? []).filter((r) => r.case_id === c.case_id && r.version === c.version);
    if (forVersion.some((r) => r.decision !== null || isOpenClaim(r as ConversionReview))) continue; // reviewed, or taken
    const difficulty = String(c.case_json?.difficulty ?? 'Intermediate');
    if (!mayReview(profile, c.cases.specialty, difficulty)) continue;
    items.push({
      caseId: c.case_id,
      title: c.cases.title,
      specialty: c.cases.specialty,
      customSpecialty: c.cases.patient_details?.custom_specialty ?? null,
      difficulty,
      version: c.version,
      convertedAt: c.converted_at,
      author: c.cases.original_author_name ?? null,
    });
  }
  return items.sort((a, b) => a.convertedAt.localeCompare(b.convertedAt));
}

/** Reserves a case for this reviewer for CLAIM_HOURS. Returns the claim id, or why not. */
export async function claimCase(caseId: string, reviewerId: string): Promise<{ claimId: string } | { error: string }> {
  const client = db();
  const profile = await getReviewerProfile(reviewerId);
  if (!profile || profile.status !== 'approved') return { error: 'Your reviewer account is not verified yet.' };

  const { data: conv, error } = await client
    .from('case_conversions')
    .select('version, case_json, cases!inner(specialty)')
    .eq('case_id', caseId)
    .maybeSingle();
  if (error) throw error;
  if (!conv) return { error: 'This case is not ready for review.' };
  const c = conv as any;
  if (!mayReview(profile, c.cases.specialty, String(c.case_json?.difficulty ?? ''))) return { error: 'This case is outside the specialties you review.' };

  const { data: existing, error: existingError } = await client
    .from('conversion_reviews')
    .select('id, reviewer_id, decision, claim_expires_at')
    .eq('case_id', caseId)
    .eq('version', c.version);
  if (existingError) throw existingError;
  const mine = (existing ?? []).find((r) => r.reviewer_id === reviewerId && isOpenClaim(r as ConversionReview));
  if (mine) return { claimId: mine.id };
  if ((existing ?? []).some((r) => r.decision !== null)) return { error: 'This case has already been reviewed.' };
  if ((existing ?? []).some((r) => isOpenClaim(r as ConversionReview))) return { error: 'Another reviewer has just taken this case.' };

  const { data: inserted, error: insertError } = await client
    .from('conversion_reviews')
    .insert({ case_id: caseId, version: c.version, reviewer_id: reviewerId, claim_expires_at: new Date(Date.now() + CLAIM_HOURS * 3_600_000).toISOString() })
    .select('id, claimed_at')
    .single();
  if (insertError) throw insertError;

  // Two reviewers can press Claim at the same moment: the earlier claim wins and the later one is withdrawn.
  const { data: open } = await client
    .from('conversion_reviews')
    .select('id, claimed_at, decision, claim_expires_at')
    .eq('case_id', caseId)
    .eq('version', c.version)
    .order('claimed_at', { ascending: true });
  const first = (open ?? []).find((r) => isOpenClaim(r as ConversionReview));
  if (first && first.id !== inserted.id) {
    await client.from('conversion_reviews').delete().eq('id', inserted.id);
    return { error: 'Another reviewer has just taken this case.' };
  }
  return { claimId: inserted.id };
}

export async function myReviews(reviewerId: string) {
  const { data, error } = await db()
    .from('conversion_reviews')
    .select('*, cases!inner(title, specialty)')
    .eq('reviewer_id', reviewerId)
    .order('claimed_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Array<ConversionReview & { cases: { title: string; specialty: string } }>;
}

/** A claim with everything the review page needs; only for the reviewer who holds it. */
export async function claimForReview(claimId: string, reviewerId: string) {
  const client = db();
  const { data: claim, error } = await client.from('conversion_reviews').select('*').eq('id', claimId).maybeSingle();
  if (error) throw error;
  if (!claim || claim.reviewer_id !== reviewerId) return null;
  const [{ data: conv }, { data: sheet }] = await Promise.all([
    client.from('case_conversions').select('*').eq('case_id', claim.case_id).maybeSingle(),
    client.from('cases').select('*').eq('id', claim.case_id).maybeSingle(),
  ]);
  if (!conv || !sheet) return null;
  return { claim: claim as ConversionReview, conversion: conv, sheet, stale: conv.version !== claim.version };
}

export async function recordConversionDecision(
  claimId: string,
  reviewerId: string,
  d: { decision: 'approved' | 'changes_requested'; comments: string; showName: boolean }
): Promise<{ ok: true } | { error: string }> {
  const found = await claimForReview(claimId, reviewerId);
  if (!found) return { error: 'This review was not found.' };
  if (found.claim.decision) return { error: 'You have already reviewed this case.' };
  if (found.stale) return { error: 'The case was rebuilt since you claimed it. Claim the new version from your queue.' };
  if (!isOpenClaim(found.claim)) return { error: 'Your 72 hours on this case ran out. Claim it again from your queue if it is still free.' };
  const comments = d.comments.trim().slice(0, 4000);
  if (d.decision === 'changes_requested' && !comments) return { error: 'Please say what should change.' };

  const { data, error } = await db()
    .from('conversion_reviews')
    .update({ decision: d.decision, comments: comments || null, show_name: d.showName, decided_at: new Date().toISOString() })
    .eq('id', claimId)
    .is('decision', null)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) return { error: 'You have already reviewed this case.' };
  return { ok: true };
}
