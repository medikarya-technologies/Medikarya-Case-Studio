'use client';

// A reviewer's MediKarya queue: cases converted by MediKarya and waiting for a review, in the specialties they were
// approved for. Claiming one reserves it for 72 hours; the review itself is one page (./[claimId]).

import { useCallback, useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CheckCircle2, Clock, Loader2, MessageSquareWarning } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { claimNextCaseAction, fetchMyReviewerState } from '@/app/actions/reviewer-actions';
import { specialtyLabel } from '@/lib/reviewers/specialties';
import { RewardsCard } from '@/components/rewards/RewardsCard';

type State = Awaited<ReturnType<typeof fetchMyReviewerState>>;

const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const until = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export default function MediKaryaReviewsPage() {
  const router = useRouter();
  // The same queue is shown inside each dashboard (author, reviewer, admin): its links stay in the one it was opened in.
  const base = `/dashboard/${usePathname().split('/')[2] ?? 'reviewer'}/medikarya`;
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

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

  // Reviewers are given their next case; they do not pick one from a list.
  const next = () =>
    start(async () => {
      const r = await claimNextCaseAction();
      if (!r.ok) {
        toast.error(r.error);
        void load();
      } else router.push(`${base}/${r.data!.claimId}`);
    });

  if (error) return <p className="rounded-lg bg-destructive/10 p-4 text-destructive">{error}</p>;
  if (!state) return <Skeleton className="h-64 w-full rounded-xl" />;

  const { profile, waiting, mine } = state;
  if (!profile || profile.status !== 'approved') {
    return (
      <div className="max-w-xl rounded-xl border border-border bg-card p-6">
        <h1 className="text-xl font-bold text-foreground">Review cases for MediKarya</h1>
        <p className="mt-2 text-muted-foreground">
          {profile?.status === 'pending'
            ? 'Your reviewer application is being verified. You will see cases here once it is approved.'
            : 'To review MediKarya cases, apply as a reviewer first. It takes two minutes.'}
        </p>
        {base.startsWith('/dashboard/admin') && (
          <p className="mt-2 text-sm text-muted-foreground">
            This page is a reviewer&apos;s own queue. As an admin you can review too: apply here, then approve your application under Reviewers. Where
            every case stands is on MediKarya, in Admin, Studio cases.
          </p>
        )}
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
          You review: {profile.approved_specialties.map(specialtyLabel).join(', ')}. Each case is a one-page report. You are given one case at a time, reserved for you for 72 hours.
        </p>
      </div>

      <RewardsCard mode="reviewer" />

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
              <Link href={`${base}/${r.id}`}>
                <Button>Continue review</Button>
              </Link>
            </div>
          ))}
        </section>
      )}

      {inProgress.length === 0 && (
        <section className="rounded-xl border border-border bg-card p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {waiting === 0 ? 'No cases waiting right now' : `${waiting} case${waiting === 1 ? '' : 's'} waiting in your specialties`}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {waiting === 0
                ? 'New ones appear here as soon as they are ready.'
                : 'You get the one that has waited longest. A case you sent back comes to you first once it has been rebuilt.'}
            </p>
          </div>
          {waiting > 0 && (
            <Button size="lg" disabled={pending} onClick={next} className="mt-4 shrink-0 sm:mt-0">
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Review the next case
            </Button>
          )}
        </section>
      )}

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
