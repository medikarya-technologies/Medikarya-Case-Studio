import 'server-only';

import { createServiceClient } from '@/lib/supabase/server';
import { loadPersonFacts, samePersonReason } from './same-person';
import { REVIEW_SPECIALTIES } from './specialties';

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
  // What an admin verified (who they are, and so what they may review and how they are credited on a case) cannot be
  // changed by the reviewer afterwards: only their contact details can.
  const verified = existing?.status === 'approved';
  const row = {
    user_id: userId,
    ...(verified
      ? {}
      : {
          kind: a.kind,
          designation: clean(a.designation),
          department: clean(a.department),
          institution: clean(a.institution) ?? '',
          specialties: a.specialties.slice(0, 20),
          council: clean(a.council),
          registration_no: clean(a.registration_no, 40),
        }),
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

  // How each reviewer has been deciding: a habit of sending cases back for small things shows here.
  const { data: reviews } = await db().from('conversion_reviews').select('reviewer_id, case_id, decision').not('decision', 'is', null);
  const tally = new Map<string, { cases: Set<string>; sentBack: Set<string> }>();
  for (const r of reviews ?? []) {
    const t = tally.get(r.reviewer_id) ?? { cases: new Set<string>(), sentBack: new Set<string>() };
    t.cases.add(r.case_id);
    if (r.decision === 'changes_requested') t.sentBack.add(r.case_id);
    tally.set(r.reviewer_id, t);
  }

  return (data ?? []).map((r: any) => ({
    ...r,
    name: r.users?.name ?? '',
    email: r.users?.email ?? '',
    role: r.users?.role ?? '',
    cases_reviewed: tally.get(r.user_id)?.cases.size ?? 0,
    cases_sent_back: tally.get(r.user_id)?.sentBack.size ?? 0,
  }));
}

/** Approves (with the specialties they may review) or rejects an application. */
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
  // Their account's role does not change. Being a MediKarya reviewer is this profile: it lets them review the
  // converted cases they are handed, and read those cases' sheets. The 'reviewer' ROLE is the faculty one (every
  // student's case sheet, approving and sending back), which an admin gives in Manage Users.
}

/**
 * The profile the queue works from. Faculty (the studio's 'reviewer' role, given by an admin in Manage Users) review
 * every specialty at every difficulty without applying: they used to approve the students' raw case sheets, and now
 * review only the converted cases, like everyone else.
 */
export async function queueProfile(userId: string): Promise<ReviewerProfile | null> {
  const profile = await getReviewerProfile(userId);
  if (profile?.status === 'approved') return profile;
  const { data: user, error } = await db().from('users').select('role').eq('id', userId).maybeSingle();
  if (error) throw error;
  if (user?.role !== 'reviewer') return profile;
  return {
    user_id: userId,
    designation: null,
    department: null,
    institution: '',
    specialties: [],
    council: null,
    registration_no: null,
    linkedin_url: null,
    upi_id: null,
    admin_note: null,
    verified_at: null,
    created_at: new Date().toISOString(),
    ...(profile ?? {}),
    kind: 'faculty',
    status: 'approved',
    approved_specialties: [...REVIEW_SPECIALTIES],
  };
}

/** Has this person been given this case to review (now or before)? It lets them read its case sheet. */
export async function hasReviewedOrHolds(userId: string, caseId: string): Promise<boolean> {
  const { data, error } = await db().from('conversion_reviews').select('id').eq('reviewer_id', userId).eq('case_id', caseId).limit(1);
  return !error && (data?.length ?? 0) > 0;
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
    .select('case_id, version, converted_at, case_json, cases!inner(title, specialty, author_id, original_author_name, patient_details, users!cases_author_id_fkey(name))');
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
      // the named author of a case someone else typed in, else the student who wrote it in the studio
      author: c.cases.original_author_name || c.cases.users?.name || null,
      authorId: c.cases.author_id ?? null,
      originalAuthorName: c.cases.original_author_name ?? null,
    });
  }
  return items.sort((a, b) => a.convertedAt.localeCompare(b.convertedAt));
}

/** Reserves a case for this reviewer for CLAIM_HOURS. Only claimNext calls it: a reviewer cannot ask for a particular case. */
async function claimCase(caseId: string, reviewerId: string): Promise<{ claimId: string } | { error: string }> {
  const client = db();
  const profile = await queueProfile(reviewerId);
  if (!profile || profile.status !== 'approved') return { error: 'Your reviewer account is not verified yet.' };

  const { data: conv, error } = await client
    .from('case_conversions')
    .select('version, case_json, cases!inner(specialty, author_id)')
    .eq('case_id', caseId)
    .maybeSingle();
  if (error) throw error;
  if (!conv) return { error: 'This case is not ready for review.' };
  const c = conv as any;
  if (c.cases.author_id === reviewerId) return { error: 'You cannot review a case you wrote yourself.' };
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

/** The cases this reviewer could be given now, in the order they would be given: never one they appear to have written. */
async function casesFor(
  profile: ReviewerProfile,
  reviewerId: string,
  reviewedBefore: ReadonlySet<string>,
  /** Cases this reviewer reserved and let lapse without deciding: offered to them last, so nobody can sit on a case. */
  letLapse: ReadonlySet<string> = new Set()
): Promise<QueueItem[]> {
  const queue = await reviewQueue(profile);
  const facts = await loadPersonFacts(db(), [reviewerId, ...queue.map((q) => q.authorId ?? '')]);
  return queue
    .filter((q) => !samePersonReason(facts, reviewerId, { authorId: q.authorId ?? null, originalAuthorName: q.originalAuthorName }))
    // a case they reviewed before and that was rebuilt comes back to them first (they know what they asked for); then the oldest
    .sort(
      (a, b) =>
        Number(letLapse.has(a.caseId)) - Number(letLapse.has(b.caseId)) ||
        Number(reviewedBefore.has(b.caseId)) - Number(reviewedBefore.has(a.caseId)) ||
        a.convertedAt.localeCompare(b.convertedAt)
    );
}

/** How many cases are waiting that this reviewer could be given. They are not told which. */
export async function waitingCount(profile: ReviewerProfile, reviewerId: string): Promise<number> {
  return (await casesFor(profile, reviewerId, new Set())).length;
}

/**
 * Gives the reviewer their next case. Reviewers do not choose: they get the oldest waiting case in their specialties
 * (so nobody can pick out a particular case, such as one a friend or their own second account wrote), and one at a
 * time (so nobody can reserve the whole queue). If they already hold a case, that one is returned.
 */
export async function claimNext(reviewerId: string): Promise<{ claimId: string } | { error: string }> {
  const profile = await queueProfile(reviewerId);
  if (!profile || profile.status !== 'approved') return { error: 'Your reviewer account is not verified yet.' };

  const mine = await myReviews(reviewerId);
  const open = mine.filter((r) => isOpenClaim(r));
  if (open.length) {
    const { data: current } = await db().from('case_conversions').select('case_id, version').in('case_id', open.map((r) => r.case_id));
    const live = open.find((r) => (current ?? []).some((c) => c.case_id === r.case_id && c.version === r.version));
    if (live) return { claimId: live.id }; // a claim on a version that was since rebuilt no longer holds them up
  }

  const reviewedBefore = new Set(mine.filter((r) => r.decision).map((r) => r.case_id));
  const letLapse = new Set(mine.filter((r) => !r.decision && !isOpenClaim(r)).map((r) => r.case_id));
  for (const next of await casesFor(profile, reviewerId, reviewedBefore, letLapse)) {
    const claimed = await claimCase(next.caseId, reviewerId);
    if ('claimId' in claimed) return claimed; // otherwise another reviewer took it this instant: try the one after
  }
  return { error: 'No cases are waiting in your specialties right now.' };
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

  // What the review earns is worked out later, once it is accepted (lib/rewards/server.ts, reviewLedger).
  return { ok: true };
}
