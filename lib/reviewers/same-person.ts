import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

// Signs that a reviewer and a case's author are the same person using two accounts: the same UPI id to be paid on,
// or the same name. Neither is proof, and someone careful can avoid both, so they are used two ways: such a case is
// never handed to that reviewer, and if a review like that exists anyway it is pointed out to the admin before
// anything is paid.

/** "Dr. Asha  Verma" and "asha verma" are the same name. Too short to compare → ''. */
export function normaliseName(name: string | null | undefined): string {
  const n = (name ?? '')
    .toLowerCase()
    .replace(/\b(dr|prof|mr|mrs|ms)\b\.?/g, ' ')
    .replace(/[^a-z]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
  return n.length >= 5 ? n : '';
}

export interface PersonFacts {
  name: Map<string, string>;
  upi: Map<string, string>;
}

/** The name and UPI id on record for each of these accounts. */
export async function loadPersonFacts(client: SupabaseClient, userIds: readonly string[]): Promise<PersonFacts> {
  const ids = [...new Set(userIds.filter(Boolean))];
  const facts: PersonFacts = { name: new Map(), upi: new Map() };
  if (ids.length === 0) return facts;
  const [{ data: users }, { data: profiles }, { data: details }] = await Promise.all([
    client.from('users').select('id, name').in('id', ids),
    client.from('reviewer_profiles').select('user_id, upi_id').in('user_id', ids),
    client.from('payout_details').select('user_id, upi_id').in('user_id', ids),
  ]);
  for (const u of users ?? []) facts.name.set(u.id, u.name ?? '');
  // the UPI id saved for payouts replaces the one on a reviewer's application
  for (const p of profiles ?? []) if (p.upi_id) facts.upi.set(p.user_id, String(p.upi_id).trim().toLowerCase());
  for (const d of details ?? []) if (d.upi_id) facts.upi.set(d.user_id, String(d.upi_id).trim().toLowerCase());
  return facts;
}

/** Why this reviewer looks like the author of this case, in words; null when nothing says so. */
export function samePersonReason(
  facts: PersonFacts,
  reviewerId: string,
  author: { authorId: string | null; originalAuthorName?: string | null }
): string | null {
  if (author.authorId && author.authorId === reviewerId) return 'the reviewer wrote this case';
  const reviewerUpi = facts.upi.get(reviewerId);
  if (author.authorId && reviewerUpi && reviewerUpi === facts.upi.get(author.authorId)) return "the reviewer and the case's author are paid on the same UPI id";
  const reviewerName = normaliseName(facts.name.get(reviewerId));
  if (reviewerName) {
    if (author.authorId && reviewerName === normaliseName(facts.name.get(author.authorId))) return "the reviewer and the case's author have the same name";
    if (reviewerName === normaliseName(author.originalAuthorName)) return "the reviewer has the same name as the case's named author";
  }
  return null;
}
