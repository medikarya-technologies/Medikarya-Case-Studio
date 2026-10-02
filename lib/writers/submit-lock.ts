'use client';

// "Can I submit yet?", asked by the browser just before it submits a case, so someone who is not verified is told
// why in plain words. The server refuses the submission by itself as well (submitCaseAction): this is the wording.

import { fetchMyWriterStanding } from '@/app/actions/writer-actions';
import type { WriterStanding } from './shared';

export const LOCK_MESSAGE: Record<Exclude<WriterStanding['state'], 'verified'>, string> = {
  none: 'Tell us who you are first: open "Get verified" in the menu. It takes two minutes.',
  pending: 'We are still checking your details. Submit unlocks as soon as you are verified; your draft is safe until then.',
  rejected: 'We could not verify you yet. Open "Get verified" in the menu to correct your details.',
};

/** Why this person cannot submit a case, or null when they can. If it cannot be checked, the server decides. */
export async function submitLockMessage(): Promise<string | null> {
  try {
    const standing = await fetchMyWriterStanding();
    return standing.state === 'verified' ? null : LOCK_MESSAGE[standing.state];
  } catch {
    return null;
  }
}
