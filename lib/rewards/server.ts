import 'server-only';

import { createServiceClient } from '@/lib/supabase/server';
import { loadPersonFacts, samePersonReason } from '@/lib/reviewers/same-person';
import {
  ADVISORY_BOARD_TITLE,
  CASE_PAYOUTS_PER_MONTH,
  CONTRIBUTOR_RANKS,
  REVIEWER_RANKS,
  reviewPay,
  casePay,
  certificateDetail,
  standing,
  type Rank,
} from './config';

// Rewards (supabase/migrations/011_rewards.sql; the rules are in ./config.ts): payouts owed for published cases and
// for reviews, and certificates for the titles people reach. Everything is recorded under a unique `ref`, so running
// a sync twice, or a decision arriving twice, never pays or certifies twice.

const db = () => createServiceClient();

export interface Payout {
  id: string;
  ref: string;
  kind: 'case_published' | 'review' | 're_review';
  user_id: string | null;
  payee_name: string;
  case_id: string | null;
  amount: number;
  status: 'owed' | 'paid' | 'void';
  note: string | null;
  earned_at: string;
  paid_at: string | null;
  paid_ref: string | null;
}

export interface Certificate {
  id: string;
  credential_id: string;
  kind: 'contributor' | 'reviewer' | 'advisory_board';
  user_id: string | null;
  recipient_name: string;
  title: string;
  detail: string;
  issued_at: string;
  revoked: boolean;
}

// ── Reviews ─────────────────────────────────────────────────────────────────

/**
 * A review is paid for, and counts towards a title, once it has been accepted: an approval when the case is
 * published, a request for changes when the case is rebuilt with those comments (or published). Until then it is
 * waiting, so a careless approval of a case that is never published earns nothing, and neither answer pays sooner
 * than the other for no reason.
 */
export interface ReviewEntry {
  reviewId: string;
  caseId: string;
  caseTitle: string;
  reviewerId: string;
  reviewerName: string;
  showName: boolean;
  decision: 'approved' | 'changes_requested';
  decidedAt: string;
  /** What it earns once accepted (reviewPay in ./config.ts: per case, not per review). */
  pay: ReturnType<typeof reviewPay>;
  /** The reviewer's first review of this case (a follow-up on their own case does not count twice). */
  firstByReviewer: boolean;
  accepted: boolean;
  /** What an unaccepted review is waiting for, in words. */
  waitingFor: string | null;
  /** Set when the reviewer looks like the case's own author (lib/reviewers/same-person.ts): check before paying. */
  samePerson: string | null;
}

/** Every completed review, oldest first, with what it earns and whether it has been accepted yet. */
export async function reviewLedger(): Promise<ReviewEntry[]> {
  const client = db();
  const [{ data: reviews, error }, { data: conversions }] = await Promise.all([
    client
      .from('conversion_reviews')
      .select('id, case_id, version, reviewer_id, decision, show_name, decided_at, cases(title, author_id, original_author_name), users!conversion_reviews_reviewer_id_fkey(name)')
      .not('decision', 'is', null)
      .order('decided_at', { ascending: true }),
    client.from('case_conversions').select('case_id, version, published_at'),
  ]);
  if (error) throw error;
  const conversion = new Map((conversions ?? []).map((c) => [c.case_id, c]));
  const reviewersOf = new Map<string, string[]>(); // case → who has reviewed it so far, oldest first
  const facts = await loadPersonFacts(client, ((reviews ?? []) as any[]).flatMap((r) => [r.reviewer_id, r.cases?.author_id]));

  return ((reviews ?? []) as any[]).map((r) => {
    const earlier = reviewersOf.get(r.case_id) ?? [];
    reviewersOf.set(r.case_id, [...earlier, r.reviewer_id]);
    const conv = conversion.get(r.case_id);
    const published = !!conv?.published_at;
    const rebuilt = !!conv && conv.version > r.version;
    const accepted = published || (r.decision === 'changes_requested' && rebuilt);
    return {
      reviewId: r.id,
      caseId: r.case_id,
      caseTitle: r.cases?.title ?? 'A case',
      reviewerId: r.reviewer_id,
      reviewerName: r.users?.name ?? 'Reviewer',
      showName: !!r.show_name,
      decision: r.decision,
      decidedAt: r.decided_at,
      pay: reviewPay(r.reviewer_id, earlier),
      firstByReviewer: !earlier.includes(r.reviewer_id),
      accepted,
      waitingFor: accepted ? null : r.decision === 'approved' ? 'the case to be published' : 'the case to be rebuilt with these comments',
      samePerson: samePersonReason(facts, r.reviewer_id, { authorId: r.cases?.author_id ?? null, originalAuthorName: r.cases?.original_author_name }),
    };
  });
}

// ── Who wrote what, and what is live ────────────────────────────────────────

interface Published {
  caseId: string;
  title: string;
  publishedAt: string;
  /** The author: their user id when they wrote it in the studio themselves, else "name:<their name>" (a PDF submission). */
  authorKey: string;
  authorUserId: string | null;
  authorName: string;
}

async function publishedCases(): Promise<Published[]> {
  const { data, error } = await db()
    .from('case_conversions')
    .select('case_id, published_at, cases!inner(title, author_id, original_author_name, users!cases_author_id_fkey(id, name, role))')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: true });
  if (error) throw error;
  const out: Published[] = [];
  for (const r of (data ?? []) as any[]) {
    const u = r.cases.users;
    // A case typed in for someone else (a PDF submission) names its real author; otherwise the author is the account
    // that wrote it, whatever that person's role is now (a student who later became a reviewer keeps their cases).
    const named = String(r.cases.original_author_name ?? '').trim();
    const own = !named && !!u;
    const name = named || u?.name;
    if (!name) continue;
    out.push({
      caseId: r.case_id,
      title: r.cases.title,
      publishedAt: r.published_at,
      authorKey: own ? u.id : `name:${String(name).trim().toLowerCase()}`,
      authorUserId: own ? u.id : null,
      authorName: String(name).trim(),
    });
  }
  return out;
}

async function ensureCertificate(c: { ref: string; kind: Certificate['kind']; userId: string | null; name: string; title: string; detail: string }): Promise<void> {
  const client = db();
  const { data: existing } = await client.from('certificates').select('id').eq('ref', c.ref).maybeSingle();
  if (existing) return;
  const { data: credentialId, error: idError } = await client.rpc('next_credential_id');
  if (idError) throw idError;
  const { error } = await client
    .from('certificates')
    .upsert(
      { credential_id: credentialId, ref: c.ref, kind: c.kind, user_id: c.userId, recipient_name: c.name, title: c.title, detail: c.detail },
      { onConflict: 'ref', ignoreDuplicates: true }
    );
  if (error) throw error;
}

const TAKEN_DOWN = 'The case was taken down before this was paid';

const rankAt = (ranks: readonly Rank[], title: string) => ranks.find((r) => r.title === title)?.at ?? 1;

/**
 * Brings payouts and certificates up to date with what is published and reviewed. Safe to run any time (it only adds
 * what is missing); the admin's Payouts page and each person's own rewards page run it.
 */
export async function syncRewards(): Promise<void> {
  const client = db();
  const published = await publishedCases();

  // Published cases: what each one pays depends on how many its author had before it, and on the monthly limit.
  const perAuthor = new Map<string, number>();
  const perMonth = new Map<string, number>();
  const rows = published.map((p) => {
    const nth = (perAuthor.get(p.authorKey) ?? 0) + 1;
    perAuthor.set(p.authorKey, nth);
    const month = p.publishedAt.slice(0, 7);
    const inMonth = (perMonth.get(month) ?? 0) + 1;
    perMonth.set(month, inMonth);
    const overLimit = inMonth > CASE_PAYOUTS_PER_MONTH;
    return {
      ref: `case:${p.caseId}`,
      kind: 'case_published' as const,
      user_id: p.authorUserId,
      payee_name: p.authorName,
      case_id: p.caseId,
      amount: overLimit ? 0 : casePay(nth),
      status: overLimit ? ('void' as const) : ('owed' as const),
      note: overLimit ? `Over the limit of ${CASE_PAYOUTS_PER_MONTH} paid cases for ${month}` : null,
      earned_at: p.publishedAt,
    };
  });
  if (rows.length) {
    const { error } = await client.from('payouts').upsert(rows, { onConflict: 'ref', ignoreDuplicates: true });
    if (error) throw error;
  }

  // A case taken down before its payout was paid no longer earns it.
  const live = new Set(published.map((p) => p.caseId));
  const { data: owedCases } = await client.from('payouts').select('id, case_id').eq('kind', 'case_published').eq('status', 'owed');
  const gone = (owedCases ?? []).filter((p) => p.case_id && !live.has(p.case_id)).map((p) => p.id);
  if (gone.length) await client.from('payouts').update({ status: 'void', note: TAKEN_DOWN }).in('id', gone);
  // ...and earns it again if it goes back up (say, after being rebuilt with a reviewer's comments).
  const { data: voided } = await client.from('payouts').select('id, case_id').eq('kind', 'case_published').eq('status', 'void').eq('note', TAKEN_DOWN);
  const back = (voided ?? []).filter((p) => p.case_id && live.has(p.case_id)).map((p) => p.id);
  if (back.length) await client.from('payouts').update({ status: 'owed', note: null }).in('id', back);

  // Certificates: one for each title reached.
  const authors = new Map<string, Published>();
  for (const p of published) authors.set(p.authorKey, p);
  for (const [key, count] of perAuthor) {
    const a = authors.get(key)!;
    for (const title of standing(count, CONTRIBUTOR_RANKS).earned) {
      await ensureCertificate({ ref: `contributor:${key}:${title}`, kind: 'contributor', userId: a.authorUserId, name: a.authorName, title, detail: certificateDetail('contributor', rankAt(CONTRIBUTOR_RANKS, title)) });
    }
  }

  // Reviews: a payout for each accepted one, and the reviewer's count for their title (different cases, accepted).
  const reviewCounts = new Map<string, { count: number; name: string }>();
  const reviewRows = [];
  for (const r of await reviewLedger()) {
    if (!r.accepted) continue;
    if (r.firstByReviewer) reviewCounts.set(r.reviewerId, { name: r.reviewerName, count: (reviewCounts.get(r.reviewerId)?.count ?? 0) + 1 });
    reviewRows.push({ ref: `review:${r.reviewId}`, user_id: r.reviewerId, payee_name: r.reviewerName, case_id: r.caseId, ...r.pay, earned_at: r.decidedAt });
  }
  if (reviewRows.length) {
    const { error } = await client.from('payouts').upsert(reviewRows, { onConflict: 'ref', ignoreDuplicates: true });
    if (error) throw error;
  }
  for (const [userId, { count, name }] of reviewCounts) {
    for (const title of standing(count, REVIEWER_RANKS).earned) {
      await ensureCertificate({ ref: `reviewer:${userId}:${title}`, kind: 'reviewer', userId, name, title, detail: certificateDetail('reviewer', rankAt(REVIEWER_RANKS, title)) });
    }
  }

  const { data: board } = await client.from('reviewer_profiles').select('user_id, users!reviewer_profiles_user_id_fkey(name)').eq('advisory_board', true);
  for (const b of (board ?? []) as any[]) {
    await ensureCertificate({ ref: `advisory_board:${b.user_id}:${ADVISORY_BOARD_TITLE}`, kind: 'advisory_board', userId: b.user_id, name: b.users?.name ?? 'Advisor', title: ADVISORY_BOARD_TITLE, detail: certificateDetail('advisory_board', 1) });
  }
}

// ── One person's standing ───────────────────────────────────────────────────

export async function myRewards(userId: string) {
  await syncRewards();
  const client = db();
  const [{ data: cases }, ledger, { data: profile }, { data: payouts }, { data: certificates }, published, { data: details }] = await Promise.all([
    client.from('cases').select('id, status').eq('author_id', userId),
    reviewLedger(),
    client.from('reviewer_profiles').select('advisory_board, status, upi_id').eq('user_id', userId).maybeSingle(),
    client.from('payouts').select('*').eq('user_id', userId).order('earned_at', { ascending: false }),
    client.from('certificates').select('*').eq('user_id', userId).eq('revoked', false).order('issued_at', { ascending: false }),
    publishedCases(),
    client.from('payout_details').select('upi_id').eq('user_id', userId).maybeSingle(),
  ]);
  const publishedCount = published.filter((p) => p.authorUserId === userId).length;
  const mine = ledger.filter((r) => r.reviewerId === userId);
  const reviewCount = mine.filter((r) => r.accepted && r.firstByReviewer).length; // different cases, accepted
  const waiting = mine.filter((r) => !r.accepted && r.pay.amount > 0);
  const rows = (payouts ?? []) as Payout[];
  return {
    contributor: {
      submitted: (cases ?? []).filter((c) => c.status !== 'draft').length,
      approved: (cases ?? []).filter((c) => c.status === 'approved').length,
      published: publishedCount,
      standing: standing(publishedCount, CONTRIBUTOR_RANKS),
    },
    reviewer: profile?.status === 'approved' ? { reviews: reviewCount, standing: standing(reviewCount, REVIEWER_RANKS), advisoryBoard: !!profile.advisory_board } : null,
    /** Reviews done but not yet accepted: what they will earn, and what each is waiting for. */
    waiting: { amount: waiting.reduce((sum, r) => sum + r.pay.amount, 0), reviews: waiting.map((r) => ({ caseTitle: r.caseTitle, amount: r.pay.amount, waitingFor: r.waitingFor })) },
    owed: rows.filter((p) => p.status === 'owed').reduce((s, p) => s + p.amount, 0),
    paid: rows.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0),
    payouts: rows,
    certificates: (certificates ?? []) as Certificate[],
    upiId: (details?.upi_id ?? profile?.upi_id ?? null) as string | null,
  };
}

/** Where to pay this person. It replaces the UPI id on a reviewer's application, if they gave one there. */
export async function saveUpi(userId: string, upiId: string): Promise<void> {
  const upi = upiId.trim();
  if (!/^[\w.-]{2,}@[a-zA-Z][\w.-]{1,}$/.test(upi) || upi.length > 80) throw new Error('That does not look like a UPI id (for example name@okhdfcbank).');
  const { error } = await db().from('payout_details').upsert({ user_id: userId, upi_id: upi, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw error;
}

// ── Admin: payouts ──────────────────────────────────────────────────────────

export interface PayoutWithPayee extends Payout {
  upi_id: string | null;
  email: string | null;
  case_title: string | null;
  /** For a review: minutes between claiming the case and deciding. A careful read takes five to ten. */
  review_minutes: number | null;
  /** For a review: set when the reviewer looks like the case's own author. */
  same_person: string | null;
}

export async function listPayouts(): Promise<PayoutWithPayee[]> {
  await syncRewards();
  const client = db();
  const { data, error } = await client.from('payouts').select('*, cases(title)').order('earned_at', { ascending: false });
  if (error) throw error;
  const ids = [...new Set((data ?? []).map((p) => p.user_id).filter(Boolean))] as string[];
  const none = ['00000000-0000-0000-0000-000000000000'];
  const [{ data: users }, { data: profiles }, { data: details }] = await Promise.all([
    client.from('users').select('id, email').in('id', ids.length ? ids : none),
    client.from('reviewer_profiles').select('user_id, upi_id').in('user_id', ids.length ? ids : none),
    client.from('payout_details').select('user_id, upi_id').in('user_id', ids.length ? ids : none),
  ]);
  const reviewIds = (data ?? []).filter((p) => String(p.ref).startsWith('review:')).map((p) => String(p.ref).slice('review:'.length));
  const { data: timings } = await client.from('conversion_reviews').select('id, claimed_at, decided_at').in('id', reviewIds.length ? reviewIds : none);
  const ledger = await reviewLedger();
  const samePersonFor = (ref: string) => ledger.find((r) => `review:${r.reviewId}` === ref)?.samePerson ?? null;
  const minutesFor = (ref: string) => {
    const t = (timings ?? []).find((x) => `review:${x.id}` === ref);
    return t?.decided_at ? Math.max(0, Math.round((Date.parse(t.decided_at) - Date.parse(t.claimed_at)) / 60000)) : null;
  };
  return (data ?? []).map((p: any) => ({
    ...p,
    case_title: p.cases?.title ?? null,
    review_minutes: minutesFor(p.ref),
    same_person: samePersonFor(p.ref),
    email: (users ?? []).find((u) => u.id === p.user_id)?.email ?? null,
    upi_id: (details ?? []).find((r) => r.user_id === p.user_id)?.upi_id ?? (profiles ?? []).find((r) => r.user_id === p.user_id)?.upi_id ?? null,
  }));
}

/** An admin decides a payout will not be paid (say, a review that was plainly not read). It is kept, marked, with the reason. */
export async function voidPayouts(ids: string[], reason: string): Promise<void> {
  const { error } = await db()
    .from('payouts')
    .update({ status: 'void', note: `Not paid: ${reason.trim().slice(0, 200) || 'no reason given'}` })
    .in('id', ids)
    .eq('status', 'owed');
  if (error) throw error;
}

export async function markPayoutsPaid(ids: string[], paidRef: string, adminId: string): Promise<void> {
  const { error } = await db()
    .from('payouts')
    .update({ status: 'paid', paid_at: new Date().toISOString(), paid_ref: paidRef.trim().slice(0, 120) || null, paid_by: adminId })
    .in('id', ids)
    .eq('status', 'owed');
  if (error) throw error;
}

// ── Public: contributors and certificates ───────────────────────────────────

export async function leaderboard() {
  const client = db();
  const published = await publishedCases();
  const authors = new Map<string, { name: string; count: number }>();
  for (const p of published) authors.set(p.authorKey, { name: p.authorName, count: (authors.get(p.authorKey)?.count ?? 0) + 1 });

  // A reviewer is listed by the cases they reviewed that were accepted, and only if they agreed to be named on one.
  const reviewers = new Map<string, { name: string; cases: Set<string>; named: boolean }>();
  for (const r of await reviewLedger()) {
    if (!r.accepted) continue;
    const cur = reviewers.get(r.reviewerId) ?? { name: r.reviewerName, cases: new Set<string>(), named: false };
    reviewers.set(r.reviewerId, { name: cur.name, cases: cur.cases.add(r.caseId), named: cur.named || r.showName });
  }
  const { data: profiles } = await client.from('reviewer_profiles').select('user_id, designation, institution, advisory_board');

  return {
    contributors: [...authors.values()]
      .map((a) => ({ ...a, title: standing(a.count, CONTRIBUTOR_RANKS).title }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    reviewers: [...reviewers.entries()]
      .filter(([, r]) => r.named)
      .map(([id, r]) => {
        const p = (profiles ?? []).find((x) => x.user_id === id);
        return {
          name: r.name,
          count: r.cases.size,
          title: p?.advisory_board ? ADVISORY_BOARD_TITLE : standing(r.cases.size, REVIEWER_RANKS).title,
          designation: p?.designation ?? null,
          institution: p?.institution ?? null,
        };
      })
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
  };
}

/** Every certificate issued, newest first (for the admin, e.g. to send one to an author who has no account). */
export async function listCertificates(): Promise<Certificate[]> {
  const { data, error } = await db().from('certificates').select('*').order('issued_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Certificate[];
}

export async function getCertificate(credentialId: string): Promise<Certificate | null> {
  if (!/^MK-\d{4}-\d{3,8}$/.test(credentialId)) return null;
  const { data, error } = await db().from('certificates').select('*').eq('credential_id', credentialId).maybeSingle();
  if (error) throw error;
  return data as Certificate | null;
}

export async function setAdvisoryBoard(userId: string, on: boolean): Promise<void> {
  const { error } = await db().from('reviewer_profiles').update({ advisory_board: on, updated_at: new Date().toISOString() }).eq('user_id', userId);
  if (error) throw error;
}
