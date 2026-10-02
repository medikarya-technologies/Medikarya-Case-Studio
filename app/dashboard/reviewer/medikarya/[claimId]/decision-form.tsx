'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, PenLine } from 'lucide-react';
import { toast } from 'sonner';
import { submitConversionReview } from '@/app/actions/reviewer-actions';

// The reviewer's decision. Who they are comes from their verified reviewer profile, so nothing to type but the verdict.
export function DecisionForm({ claimId, reviewerName, credit, backHref }: { claimId: string; reviewerName: string; credit: string; backHref: string }) {
  const router = useRouter();
  const [comments, setComments] = useState('');
  const [showName, setShowName] = useState(true);
  const [pending, start] = useTransition();

  const send = (decision: 'approved' | 'changes_requested') =>
    start(async () => {
      const r = await submitConversionReview(claimId, { decision, comments, showName });
      if (!r.ok) toast.error(r.error);
      else {
        toast.success(decision === 'approved' ? 'Approved. Thank you!' : 'Sent back with your comments. Thank you!');
        router.push(backHref);
        router.refresh();
      }
    });

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-4 rounded-xl border border-border bg-card p-5">
      <h2 className="text-lg font-bold text-foreground">Your decision</h2>
      <label className="flex items-start gap-3 text-sm text-foreground">
        <input type="checkbox" className="mt-0.5 h-4 w-4" checked={showName} onChange={(e) => setShowName(e.target.checked)} />
        <span>
          Show &quot;Clinically reviewed by <strong>{reviewerName}</strong>
          {credit ? `, ${credit}` : ''}&quot; on this case.
        </span>
      </label>
      <label className="block text-sm font-medium text-foreground">
        Comments <span className="font-normal text-muted-foreground">(required if you ask for changes: what is wrong, and what it should be)</span>
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          className="mt-1 min-h-[110px] w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-primary"
          placeholder="e.g. Hb should be about 8 g/dL given the documented pallor; add USG of the scrotum to the core tests."
        />
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={pending}
          onClick={() => send('approved')}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Approve the case
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => send('changes_requested')}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 font-semibold text-foreground hover:bg-muted disabled:opacity-60"
        >
          <PenLine className="h-4 w-4" /> Ask for changes
        </button>
      </div>
    </form>
  );
}
