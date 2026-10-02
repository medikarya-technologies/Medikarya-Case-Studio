import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getOrCreateCurrentUser } from '@/app/actions/case-actions';
import { claimForReview } from '@/lib/reviewers/server';
import { AiCaseReport } from '@/components/review/AiCaseReport';
import { Logo } from '@/components/layout/Logo';
import { PrintButton } from '@/app/certificate/[credentialId]/print-button';

// The report a reviewer checks, as a page of its own that prints cleanly: "Print or save as PDF" gives them the
// PDF of the case as it stands now. A reviewer never plays the case: this report is what they review. It is built
// each time MediKarya converts (or rebuilds) the case, and it says which version it is, so an old PDF cannot be
// mistaken for the latest. Only the reviewer who was handed the case can open it.

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Case report for review | MediKarya Case Studio', robots: { index: false, follow: false } };

const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

export default async function ReportPage({ params }: { params: Promise<{ claimId: string }> }) {
  const { claimId } = await params;
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  const user = await getOrCreateCurrentUser();
  const found = await claimForReview(claimId, user.id);
  if (!found) notFound();
  const { claim, conversion, stale } = found;

  return (
    <main className="min-h-screen bg-surface print:bg-white">
      <style>{`@page { size: A4; margin: 14mm 12mm; } @media print { .no-print { display: none !important; } html, body { background: #fff !important; } }`}</style>

      <div className="no-print mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 pt-6">
        <div>
          <p className="font-semibold text-foreground">Case report, version {conversion.version}</p>
          <p className="text-sm text-muted-foreground">
            {stale
              ? `You were handed version ${claim.version}; the case has been rebuilt since. This is the latest.`
              : 'This is the latest version. Save it as a PDF to read offline, then come back to give your decision.'}
          </p>
        </div>
        <PrintButton />
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6 print:max-w-none print:p-0">
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm sm:p-7 print:rounded-none print:border-0 print:p-0 print:shadow-none">
          <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-200 pb-3 text-[12.5px] text-slate-600">
            <span className="flex items-center gap-2 font-semibold text-slate-900">
              <Logo size={20} className="text-primary" /> MediKarya
            </span>
            <span className="text-right">
              Version {conversion.version} · built {day(conversion.converted_at)}
              <br />
              For review by {user.name} · confidential, not for sharing
            </span>
          </div>
          <AiCaseReport
            caseJson={conversion.case_json as Record<string, any>}
            reviewNotes={Array.isArray(conversion.review_notes) ? conversion.review_notes : []}
            testNames={(conversion.test_names ?? {}) as Record<string, string>}
          />
        </div>
      </div>
    </main>
  );
}
