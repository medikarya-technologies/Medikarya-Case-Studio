// The reward rules, in one place: what a published case and a review pay, the monthly limit on case payouts, and the
// titles contributors and reviewers earn. Pure (no database), safe in the browser. To change an amount, change it
// here; payouts already recorded keep the amount they were recorded with.

/** Rupees for a published case, by how many cases the author had published before it: it grows with their rank. */
export const CASE_PAY: ReadonlyArray<{ from: number; amount: number }> = [
  { from: 15, amount: 150 }, // 15th published case onwards (Case Fellow)
  { from: 5, amount: 125 }, //  5th to 14th (Senior Contributor)
  { from: 1, amount: 100 }, //  1st to 4th (Case Contributor)
];

/** Case payouts are made for the first this-many cases published in a calendar month; later ones that month earn the title, not the cash. */
export const CASE_PAYOUTS_PER_MONTH = 10;

/**
 * Rupees for reviewing a case. A reviewer is paid per case, not per review: `first` for the first review a case gets,
 * whichever way it goes, and `reReview` to a different reviewer who picks the case up after it was rebuilt. A reviewer
 * who comes back to a case they already reviewed is paid nothing more, so asking for changes and then approving
 * earns the same as approving at once.
 */
export const REVIEW_PAY = { first: 250, reReview: 100 };

export const OWN_FOLLOW_UP_NOTE = 'Follow-up on a case they had already reviewed: covered by their first review of it';

/** What one completed review earns. `earlierReviewers`: who completed the reviews this case had before it. */
export function reviewPay(
  reviewerId: string,
  earlierReviewers: readonly string[]
): { kind: 'review' | 're_review'; amount: number; status: 'owed' | 'void'; note: string | null } {
  if (earlierReviewers.length === 0) return { kind: 'review', amount: REVIEW_PAY.first, status: 'owed', note: null };
  if (earlierReviewers.includes(reviewerId)) return { kind: 're_review', amount: 0, status: 'void', note: OWN_FOLLOW_UP_NOTE };
  return { kind: 're_review', amount: REVIEW_PAY.reReview, status: 'owed', note: null };
}

export function casePay(nthPublished: number): number {
  return CASE_PAY.find((t) => nthPublished >= t.from)?.amount ?? 0;
}

// ── Titles ──────────────────────────────────────────────────────────────────

export interface Rank {
  /** The count at which the title is earned. */
  at: number;
  title: string;
}

/** By cases published on MediKarya (not submitted: quality, not volume). */
export const CONTRIBUTOR_RANKS: readonly Rank[] = [
  { at: 1, title: 'Case Contributor' },
  { at: 5, title: 'Senior Contributor' },
  { at: 15, title: 'Case Fellow' },
  { at: 30, title: 'Distinguished Fellow' },
];

/** By cases reviewed (approved or sent back with comments); reviewing the same case twice counts once. */
export const REVIEWER_RANKS: readonly Rank[] = [
  { at: 1, title: 'Clinical Reviewer' },
  { at: 10, title: 'Senior Clinical Reviewer' },
  { at: 25, title: 'Lead Reviewer' },
];

/** An honorary title an admin gives; it is shown instead of the counted one. */
export const ADVISORY_BOARD_TITLE = 'Clinical Advisory Board';

export interface Standing {
  /** The title held now; null before the first one. */
  title: string | null;
  /** Every title earned so far, oldest first (each gets a certificate). */
  earned: string[];
  next: Rank | null;
  /** How many more to the next title. */
  toNext: number | null;
}

export function standing(count: number, ranks: readonly Rank[]): Standing {
  const earned = ranks.filter((r) => count >= r.at);
  const next = ranks.find((r) => count < r.at) ?? null;
  return {
    title: earned.length ? earned[earned.length - 1].title : null,
    earned: earned.map((r) => r.title),
    next,
    toNext: next ? next.at - count : null,
  };
}

/** "for 5 clinical cases published on MediKarya": what a certificate says the title was earned for. */
export function certificateDetail(kind: 'contributor' | 'reviewer' | 'advisory_board', at: number): string {
  if (kind === 'advisory_board') return 'for serving on the Clinical Advisory Board of MediKarya';
  const n = `${at} clinical case${at === 1 ? '' : 's'}`;
  return kind === 'contributor' ? `for ${n} published on MediKarya` : `for ${n} clinically reviewed for MediKarya`;
}

export const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;

// ── Certificates ────────────────────────────────────────────────────────────

/** Who signs a certificate. */
export const CERTIFICATE_SIGNATORY = { name: 'Abhishek Singh', role: 'Founder, MediKarya' };

/** Where anyone can check a certificate is real: this address followed by its credential id. */
export const VERIFY_URL = 'https://www.medikarya.in/verify';
