import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink, FileDown } from 'lucide-react';
import { getOrCreateCurrentUser } from '@/app/actions/case-actions';
import { claimForReview, queueProfile, KIND_LABEL } from '@/lib/reviewers/server';
import { AiCaseReport } from '@/components/review/AiCaseReport';
import { DecisionForm } from './decision-form';

// One review: the student's case sheet (a link to it) and MediKarya's AI-built version as a one-page report, then the
// decision. Only the reviewer holding the claim can open it.

/** `base` is the queue this review belongs to: the reviewer's dashboard, or the admin's (an admin reviewing stays in the admin dashboard). */
export async function ClaimReview({ claimId, base }: { claimId: string; base: string }) {
  const user = await getOrCreateCurrentUser();
  const found = await claimForReview(claimId, user.id);
  if (!found) notFound();
  const profile = await queueProfile(user.id);

  const { claim, conversion, sheet, stale } = found;
  const expired = !claim.decision && Date.parse(claim.claim_expires_at) <= Date.now();
  const caseJson = conversion.case_json as Record<string, any>;
  const credit = [profile?.designation ?? (profile ? KIND_LABEL[profile.kind] : null), profile?.department, profile?.institution].filter(Boolean).join(', ');

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={base} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> My reviews
      </Link>

      <div className="rounded-xl border border-border bg-card p-4 text-sm">
        <p className="text-muted-foreground">
          The student&apos;s case sheet: <strong className="text-foreground">{sheet.title}</strong>
          {sheet.original_author_name ? ` by ${sheet.original_author_name}` : ''}.{' '}
          <Link href={`/cases/${sheet.id}`} target="_blank" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
            Open the case sheet <ExternalLink className="h-3 w-3" />
          </Link>
        </p>
        <p className="mt-1 text-muted-foreground">
          Below is the report of MediKarya&apos;s interactive version of it (version {conversion.version}). You review this report: there is no need to play the
          case. Please check that the medicine is right, and that what the AI added is realistic.
        </p>
        <Link
          href={`/report/${claim.id}`}
          target="_blank"
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 font-medium text-foreground hover:border-primary hover:text-primary"
        >
          <FileDown className="h-4 w-4" /> Open as a PDF to print or save
        </Link>
      </div>

      {stale && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">This case was rebuilt after you claimed it. Go back to your queue and claim the new version.</p>
      )}
      {expired && !stale && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Your 72 hours on this case ran out. Claim it again from your queue if it is still free.</p>
      )}

      <div className="rounded-xl border border-border bg-white p-5 shadow-sm sm:p-7">
        <AiCaseReport
          caseJson={caseJson}
          reviewNotes={Array.isArray(conversion.review_notes) ? conversion.review_notes : []}
          testNames={(conversion.test_names ?? {}) as Record<string, string>}
        />
      </div>

      {claim.decision ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 text-emerald-950">
          You {claim.decision === 'approved' ? 'approved this case' : 'asked for changes'} on {new Date(claim.decided_at!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.
          {claim.comments ? <p className="mt-2 whitespace-pre-wrap text-sm">{claim.comments}</p> : null}
        </div>
      ) : (
        !stale && !expired && <DecisionForm claimId={claim.id} reviewerName={user.name} credit={credit} backHref={base} />
      )}
    </div>
  );
}
