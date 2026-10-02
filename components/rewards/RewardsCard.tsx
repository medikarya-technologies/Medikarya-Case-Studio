'use client';

// A person's journey: the title they hold, every title on the way up and how far the next one is, where their cases
// are right now, what they have earned, and their certificates. Shown on the author's dashboard ('contributor') and
// on the reviewer's MediKarya page ('reviewer').

import { useCallback, useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowRight, Award, Check, ChevronRight, Download, Loader2, Lock, PenLine, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchMyRewards, saveUpiAction } from '@/app/actions/reward-actions';
import { ADVISORY_BOARD_TITLE, CASE_PAYOUTS_PER_MONTH, CONTRIBUTOR_RANKS, REVIEWER_RANKS, REVIEW_PAY, casePay, rupees, type Rank } from '@/lib/rewards/config';

type Rewards = Awaited<ReturnType<typeof fetchMyRewards>>;
type Certificate = Rewards['certificates'][number];

/**
 * Every title, in order, with a line between each pair that fills as the count climbs. Earned titles carry their
 * certificate; the next one says how many are left; the rest are locked.
 */
function Ladder({ ranks, count, unit, certificates }: { ranks: readonly Rank[]; count: number; unit: string; certificates: Certificate[] }) {
  const nextIndex = ranks.findIndex((r) => count < r.at);
  return (
    <ol className="flex flex-col sm:flex-row">
      {ranks.map((rank, i) => {
        const earned = count >= rank.at;
        const isNext = i === nextIndex;
        const after = ranks[i + 1];
        // how much of the line to the next title is done
        const fill = after ? Math.min(1, Math.max(0, (count - rank.at) / (after.at - rank.at))) : 0;
        const certificate = certificates.find((c) => c.title === rank.title);
        return (
          <li key={rank.title} className="relative flex flex-1 gap-3 pb-5 last:pb-0 sm:block sm:pb-0 sm:pr-3">
            {/* the line to the next title: down the side on a phone, along the top on a wide screen */}
            {after && (
              <>
                <span className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-border sm:hidden" aria-hidden>
                  <span className="block w-full bg-primary transition-all" style={{ height: `${fill * 100}%` }} />
                </span>
                <span className="absolute left-8 right-0 top-[15px] hidden h-0.5 bg-border sm:block" aria-hidden>
                  <span className="block h-full bg-primary transition-all" style={{ width: `${fill * 100}%` }} />
                </span>
              </>
            )}
            <span
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                earned
                  ? 'bg-primary text-primary-foreground'
                  : isNext
                    ? 'border-2 border-primary bg-card text-primary ring-4 ring-primary/15'
                    : 'border border-border bg-card text-muted-foreground'
              }`}
            >
              {earned ? <Check className="h-4 w-4" /> : isNext ? rank.at - count : <Lock className="h-3.5 w-3.5" />}
            </span>
            <div className="min-w-0 sm:mt-2.5">
              <p className={`text-sm font-semibold leading-tight ${earned || isNext ? 'text-foreground' : 'text-muted-foreground'}`}>{rank.title}</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">
                {earned ? `Earned at ${rank.at} ${unit}${rank.at === 1 ? '' : 's'}` : isNext ? `${rank.at - count} more to go` : `At ${rank.at} ${unit}s`}
              </p>
              {certificate && (
                <Link
                  href={`/certificate/${certificate.credential_id}`}
                  target="_blank"
                  className="mt-1.5 inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary hover:underline"
                >
                  <Download className="h-3.5 w-3.5" /> Certificate
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Where a writer's cases are right now. Each step opens their case list. */
function Pipeline({ steps }: { steps: Array<{ label: string; count: number; hint: string; strong?: boolean }> }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:items-stretch sm:gap-0">
      {steps.map((s, i) => (
        <div key={s.label} className="flex flex-1 items-stretch">
          <Link
            href="/dashboard/author/cases"
            title={s.hint}
            className={`flex-1 rounded-lg border px-3.5 py-2.5 transition-colors hover:border-primary ${s.strong && s.count > 0 ? 'border-primary/40 bg-brand-muted' : 'border-border bg-card'}`}
          >
            <p className={`text-2xl font-bold leading-none ${s.count > 0 ? 'text-foreground' : 'text-muted-foreground/60'}`}>{s.count}</p>
            <p className="mt-1 text-[12.5px] font-medium leading-tight text-muted-foreground">{s.label}</p>
          </Link>
          {i < steps.length - 1 && <ChevronRight className="mx-0.5 hidden h-4 w-4 shrink-0 self-center text-muted-foreground/50 sm:block" aria-hidden />}
        </div>
      ))}
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
  if (!rewards) return <Skeleton className="h-64 w-full rounded-xl" />;

  const reviewer = mode === 'reviewer' ? rewards.reviewer : null;
  if (mode === 'reviewer' && !reviewer) return null;
  const me = rewards.contributor;
  const ranks = reviewer ? REVIEWER_RANKS : CONTRIBUTOR_RANKS;
  const count = reviewer ? reviewer.reviews : me.published;
  const standing = reviewer ? reviewer.standing : me.standing;
  const title = reviewer?.advisoryBoard ? ADVISORY_BOARD_TITLE : standing.title;
  const unit = reviewer ? 'reviewed case' : 'published case';
  const earned = rewards.owed + rewards.paid;
  const kinds = reviewer ? ['reviewer', 'advisory_board'] : ['contributor'];
  const certificates = rewards.certificates.filter((c) => kinds.includes(c.kind));
  const latest = certificates[0];
  const boardCertificate = certificates.find((c) => c.kind === 'advisory_board');

  // One line that says where they are and what is next.
  const headline = !standing.next
    ? 'You hold the highest title. Thank you.'
    : count === 0
      ? reviewer
        ? `Your first reviewed case makes you a ${ranks[0].title}.`
        : `Your first case published on MediKarya makes you a ${ranks[0].title}.`
      : `${standing.toNext} more ${unit}${standing.toNext === 1 ? '' : 's'} and you are a ${standing.next.title}.`;

  const capReached = !reviewer && me.paidCasesThisMonth >= CASE_PAYOUTS_PER_MONTH;

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
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="grid md:grid-cols-[1.7fr_1fr]">
        {/* ── the journey ── */}
        <div className="p-5 sm:p-6">
          <p className="eyebrow">{reviewer ? 'Your reviewer journey' : 'Your journey'}</p>
          <div className="mt-2 flex items-center gap-3">
            <div className={`rounded-full p-2.5 ${title ? 'bg-primary text-primary-foreground' : 'bg-brand-muted text-primary'}`}>
              {title ? <Award className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-xl font-bold leading-tight text-foreground">{title ?? 'No title yet'}</p>
              <p className="text-sm text-muted-foreground">
                {count} {unit}
                {count === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <p className="mt-3 text-[15px] font-medium text-foreground">{headline}</p>

          <div className="mt-5">
            <Ladder ranks={ranks} count={count} unit={unit} certificates={certificates} />
          </div>

          {!reviewer && (
            <div className="mt-6 border-t border-border pt-5">
              <p className="field-name">Where your cases are</p>
              <div className="mt-2">
                <Pipeline
                  steps={[
                    { label: me.sentBack > 0 ? `Writing (${me.sentBack} sent back)` : 'Writing', count: me.writing, hint: 'Drafts, and cases a reviewer sent back for changes', strong: me.sentBack > 0 },
                    { label: 'With a reviewer', count: me.inReview, hint: 'Submitted, waiting for a doctor to review' },
                    { label: 'Approved', count: Math.max(0, me.approved - me.published), hint: 'Approved by a reviewer, being made into a MediKarya patient' },
                    { label: 'Live on MediKarya', count: me.published, hint: 'Published: students are learning from these', strong: true },
                  ]}
                />
              </div>
              {me.writing + me.inReview + me.approved === 0 && (
                <Link href="/dashboard/author/new" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                  <PenLine className="h-4 w-4" /> Write your first case <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          )}

          {boardCertificate && (
            <Link href={`/certificate/${boardCertificate.credential_id}`} target="_blank" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
              <Download className="h-4 w-4" /> {ADVISORY_BOARD_TITLE} certificate
            </Link>
          )}
        </div>

        {/* ── what it has earned ── */}
        <div className="border-t border-border bg-muted/40 p-5 sm:p-6 md:border-l md:border-t-0">
          <p className="field-name">Earned</p>
          <p className="mt-1 text-3xl font-bold text-foreground">{rupees(earned)}</p>
          <p className="text-sm text-muted-foreground">
            {rupees(rewards.paid)} paid · {rupees(rewards.owed)} on its way
          </p>

          <div className="mt-4 rounded-lg border border-border bg-card px-3.5 py-3 text-sm">
            {reviewer ? (
              <p className="text-foreground">
                Each case you review earns <span className="font-bold">{rupees(REVIEW_PAY.first)}</span>, paid once the case is acted on.
              </p>
            ) : capReached ? (
              <p className="text-foreground">
                You have reached this month&apos;s {CASE_PAYOUTS_PER_MONTH} paid cases. More still count towards your title.
              </p>
            ) : (
              <>
                <p className="text-foreground">
                  Your next published case earns <span className="font-bold">{rupees(casePay(me.published + 1))}</span>.
                </p>
                {me.paidCasesThisMonth > 0 && (
                  <p className="mt-0.5 text-[13px] text-muted-foreground">
                    {me.paidCasesThisMonth} of {CASE_PAYOUTS_PER_MONTH} paid cases used this month.
                  </p>
                )}
              </>
            )}
          </div>

          {reviewer && rewards.waiting.reviews.length > 0 && (
            <div className="mt-2 rounded-lg border border-border bg-card px-3.5 py-3 text-[13px] leading-snug text-muted-foreground">
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

          {latest && (
            <Link href={`/certificate/${latest.credential_id}`} target="_blank" className="mt-3 block">
              <Button variant="outline" className="w-full bg-card">
                <Download className="mr-2 h-4 w-4" /> Download my certificate
              </Button>
            </Link>
          )}

          <div className="mt-4 border-t border-border pt-3">
            {editingUpi || !rewards.upiId ? (
              <>
                <p className="text-[13px] text-muted-foreground">{rewards.upiId ? 'New UPI id' : 'Add your UPI id so we know where to pay you.'}</p>
                <div className="mt-1.5 flex gap-2">
                  <Input value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="name@okhdfcbank" className="h-9 bg-card" />
                  <Button size="sm" disabled={pending || !upi.trim()} onClick={saveUpi}>
                    {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Paid to <span className="font-mono text-foreground">{rewards.upiId}</span>{' '}
                <button type="button" onClick={() => setEditingUpi(true)} className="font-medium text-primary hover:underline">
                  Change
                </button>
              </p>
            )}
            <Link href="/contributors" className="mt-2 inline-block text-[13px] font-medium text-primary hover:underline">
              See all contributors
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
