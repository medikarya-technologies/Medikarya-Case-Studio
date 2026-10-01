'use client';

// A reviewer's MediKarya queue: cases converted by MediKarya and waiting for a review, in the specialties they were
// approved for. Claiming one reserves it for 72 hours; the review itself is one page (./[claimId]).

import { useCallback, useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Clock, Loader2, MessageSquareWarning } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { claimCaseAction, fetchMyReviewerState } from '@/app/actions/reviewer-actions';
import { specialtyLabel } from '@/lib/reviewers/specialties';

type State = Awaited<ReturnType<typeof fetchMyReviewerState>>;

const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const until = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export default function MediKaryaReviewsPage() {
  const router = useRouter();
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [claiming, setClaiming] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setState(await fetchMyReviewerState());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your reviews.');
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const claim = (caseId: string) => {
    setClaiming(caseId);
    start(async () => {
      const r = await claimCaseAction(caseId);
      setClaiming(null);
      if (!r.ok) {
        toast.error(r.error);
        void load();
      } else router.push(`/dashboard/reviewer/medikarya/${r.data!.claimId}`);
    });
  };

  if (error) return <p className="rounded-lg bg-destructive/10 p-4 text-destructive">{error}</p>;
  if (!state) return <Skeleton className="h-64 w-full rounded-xl" />;

  const { profile, queue, mine } = state;
  if (!profile || profile.status !== 'approved') {
    return (
      <div className="max-w-xl rounded-xl border border-border bg-card p-6">
        <h1 className="text-xl font-bold text-foreground">Review cases for MediKarya</h1>
        <p className="mt-2 text-muted-foreground">
          {profile?.status === 'pending'
            ? 'Your reviewer application is being verified. You will see cases here once it is approved.'
            : 'To review MediKarya cases, apply as a reviewer first. It takes two minutes.'}
        </p>
        <Link href="/join/reviewer" className="mt-4 inline-block">
          <Button>{profile ? 'View my application' : 'Apply as a reviewer'}</Button>
        </Link>
      </div>
    );
  }

  const now = Date.now();
  const inProgress = mine.filter((r) => !r.decision && Date.parse(r.claim_expires_at) > now);
  const done = mine.filter((r) => r.decision);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">MediKarya reviews</h1>
        <p className="mt-1 text-muted-foreground">
          You review: {profile.approved_specialties.map(specialtyLabel).join(', ')}. Each case is a one-page report; claiming one reserves it for 72 hours.
        </p>
      </div>

      {inProgress.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">In progress</h2>
          {inProgress.map((r) => (
            <div key={r.id} className="flex flex-col gap-3 rounded-xl border border-primary/40 bg-brand-muted p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-foreground">{r.cases.title}</p>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> Reserved for you until {until(r.claim_expires_at)}
                </p>
              </div>
              <Link href={`/dashboard/reviewer/medikarya/${r.id}`}>
                <Button>Continue review</Button>
              </Link>
            </div>
          ))}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Waiting for a reviewer ({queue.length})</h2>
        {queue.length === 0 && <p className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">No cases waiting in your specialties right now. New ones appear here as soon as they are ready.</p>}
        {queue.map((q) => (
          <div key={q.caseId} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-foreground">{q.title}</p>
              <p className="text-sm text-muted-foreground">
                {q.specialty === 'other' && q.customSpecialty ? q.customSpecialty : specialtyLabel(q.specialty)} · {q.difficulty}
                {q.author ? ` · written by ${q.author}` : ''} · ready since {day(q.convertedAt)}
              </p>
            </div>
            <Button disabled={pending} onClick={() => claim(q.caseId)}>
              {claiming === q.caseId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Review this case
            </Button>
          </div>
        ))}
      </section>

      {done.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Your completed reviews ({done.length})</h2>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {done.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="text-foreground">{r.cases.title}</span>
                <span className={`flex shrink-0 items-center gap-1.5 ${r.decision === 'approved' ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {r.decision === 'approved' ? <CheckCircle2 className="h-4 w-4" /> : <MessageSquareWarning className="h-4 w-4" />}
                  {r.decision === 'approved' ? 'Approved' : 'Changes asked'} · {day(r.decided_at!)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
