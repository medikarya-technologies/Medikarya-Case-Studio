'use client';

// A person's standing: their title and how far the next one is, what they have earned, where to pay them, and their
// certificates. Shown on the author's dashboard ('contributor') and on the reviewer's MediKarya page ('reviewer').

import { useCallback, useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { Award, Loader2, ScrollText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchMyRewards, saveUpiAction } from '@/app/actions/reward-actions';
import { ADVISORY_BOARD_TITLE, CONTRIBUTOR_RANKS, REVIEWER_RANKS, rupees, type Standing } from '@/lib/rewards/config';

type Rewards = Awaited<ReturnType<typeof fetchMyRewards>>;

function Progress({ count, standing, unit, first }: { count: number; standing: Standing; unit: string; first: string }) {
  const from = [...CONTRIBUTOR_RANKS, ...REVIEWER_RANKS].find((r) => r.title === standing.title)?.at ?? 0;
  const pct = standing.next ? Math.round(((count - from) / (standing.next.at - from)) * 100) : 100;
  return (
    <div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(pct, count > 0 ? 6 : 0)}%` }} />
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {standing.next
          ? standing.title
            ? `${standing.toNext} more ${unit}${standing.toNext === 1 ? '' : 's'} to ${standing.next.title}`
            : first
          : 'You hold the highest title.'}
      </p>
    </div>
  );
}

export function RewardsCard({ mode }: { mode: 'contributor' | 'reviewer' }) {
  const [rewards, setRewards] = useState<Rewards | null>(null);
  const [failed, setFailed] = useState(false);
  const [upi, setUpi] = useState('');
  const [editingUpi, setEditingUpi] = useState(false);
  const [pending, start] = useTransition();

  const load = useCallback(async () => {
    try {
      const r = await fetchMyRewards();
      setRewards(r);
      setUpi(r.upiId ?? '');
    } catch {
      // Rewards are an extra: if they cannot be read (e.g. migration 011 not run yet), the page works without them.
      setFailed(true);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  if (failed) return null;
  if (!rewards) return <Skeleton className="h-36 w-full rounded-xl" />;

  const reviewer = mode === 'reviewer' ? rewards.reviewer : null;
  if (mode === 'reviewer' && !reviewer) return null;
  const count = reviewer ? reviewer.reviews : rewards.contributor.published;
  const standing = reviewer ? reviewer.standing : rewards.contributor.standing;
  const title = reviewer?.advisoryBoard ? ADVISORY_BOARD_TITLE : standing.title;
  const earned = rewards.owed + rewards.paid;
  const kinds = mode === 'reviewer' ? ['reviewer', 'advisory_board'] : ['contributor'];
  const certificates = rewards.certificates.filter((c) => kinds.includes(c.kind));

  const saveUpi = () =>
    start(async () => {
      const r = await saveUpiAction(upi);
      if (!r.ok) toast.error(r.error);
      else {
        toast.success('Saved. Payments will go to this UPI id.');
        setEditingUpi(false);
        void load();
      }
    });

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="grid gap-5 md:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-brand-muted p-2.5">
              <Award className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{mode === 'reviewer' ? 'Your reviewer title' : 'Your contributor title'}</p>
              <p className="text-lg font-bold text-foreground">{title ?? 'No title yet'}</p>
            </div>
          </div>
          <div className="mt-4">
            <Progress
              count={count}
              standing={standing}
              unit={mode === 'reviewer' ? 'reviewed case' : 'published case'}
              first={mode === 'reviewer' ? 'Review your first case to become a Clinical Reviewer.' : 'Your first case published on MediKarya makes you a Case Contributor.'}
            />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === 'reviewer'
              ? `${count} case${count === 1 ? '' : 's'} reviewed.`
              : `${rewards.contributor.published} published on MediKarya · ${rewards.contributor.approved} approved by a reviewer · ${rewards.contributor.submitted} submitted.`}{' '}
            <Link href="/contributors" className="font-medium text-primary hover:underline">
              See all contributors
            </Link>
          </p>
        </div>

        <div className="rounded-lg bg-muted/50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Earned</p>
          <p className="text-2xl font-bold text-foreground">{rupees(earned)}</p>
          <p className="text-sm text-muted-foreground">
            {rupees(rewards.paid)} paid · {rupees(rewards.owed)} on its way
          </p>
          {mode === 'reviewer' && rewards.waiting.reviews.length > 0 && (
            <div className="mt-2 rounded-md border border-border bg-card px-3 py-2 text-[13px] leading-snug text-muted-foreground">
              <p>
                <span className="font-semibold text-foreground">{rupees(rewards.waiting.amount)} more</span> when{' '}
                {rewards.waiting.reviews.length === 1 ? 'your review is' : `your ${rewards.waiting.reviews.length} reviews are`} acted on:
              </p>
              <ul className="mt-1 space-y-0.5">
                {rewards.waiting.reviews.map((w, i) => (
                  <li key={i}>
                    {w.caseTitle}: waiting for {w.waitingFor?.replace('these comments', 'your comments')}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {editingUpi || !rewards.upiId ? (
            <div className="mt-3 flex gap-2">
              <Input value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="Your UPI id, e.g. name@okhdfcbank" className="h-9 bg-card" />
              <Button size="sm" disabled={pending || !upi.trim()} onClick={saveUpi}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Paid to <span className="font-mono text-foreground">{rewards.upiId}</span>{' '}
              <button type="button" onClick={() => setEditingUpi(true)} className="font-medium text-primary hover:underline">
                Change
              </button>
            </p>
          )}
          {!rewards.upiId && !editingUpi && <p className="mt-1 text-xs text-muted-foreground">Add it so we know where to pay you.</p>}
        </div>
      </div>

      {certificates.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="text-sm font-medium text-foreground">Your certificates</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {certificates.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/certificate/${c.credential_id}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm text-foreground hover:bg-muted"
                >
                  <ScrollText className="h-4 w-4 text-primary" /> {c.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
