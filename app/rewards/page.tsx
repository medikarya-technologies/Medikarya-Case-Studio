import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Award, Check, Clock, Gift, IndianRupee, ScrollText, Stethoscope, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/layout/Logo';
import {
  CASE_PAY,
  CASE_PAYOUTS_PER_MONTH,
  CONTRIBUTOR_RANKS,
  FREE_RESIDENT_MILESTONES,
  REVIEWER_RANKS,
  REVIEW_PAY,
  rupees,
} from '@/lib/rewards/config';

// What writers and reviewers get, and when: a milestone track for writers (pay per case, free Resident months, titles
// with certificates) and the reviewers' rates and titles. Public. Everything is read from lib/rewards/config.ts, so
// the page always shows what the system actually pays and gives.

export const metadata: Metadata = {
  title: 'Rewards | MediKarya Case Studio',
  description: 'What you get for writing and reviewing cases for MediKarya: pay per case, free months of MediKarya, titles and verifiable certificates, milestone by milestone.',
};

const ordinal = (n: number) => `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`;
const months = (n: number) => `${n} month${n === 1 ? '' : 's'}`;

interface Stop {
  at: number;
  title?: string;
  pay?: number;
  freeMonths?: number;
  freeTotal?: number;
}

/** Every number of published cases where something new happens, with what happens there. */
function writerStops(): Stop[] {
  const ats = [...new Set([...CASE_PAY.map((p) => p.from), ...CONTRIBUTOR_RANKS.map((r) => r.at), ...FREE_RESIDENT_MILESTONES.map((m) => m.at)])].sort((a, b) => a - b);
  let total = 0;
  return ats.map((at) => {
    const free = FREE_RESIDENT_MILESTONES.find((m) => m.at === at)?.months;
    if (free) total += free;
    return {
      at,
      title: CONTRIBUTOR_RANKS.find((r) => r.at === at)?.title,
      pay: CASE_PAY.find((p) => p.from === at)?.amount,
      freeMonths: free,
      freeTotal: free ? total : undefined,
    };
  });
}

function StopCard({ s }: { s: Stop }) {
  return (
    <div className="h-full rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(30,31,34,0.05)]">
      <p className="font-display text-[13px] font-semibold uppercase tracking-[0.12em] text-primary">{ordinal(s.at)} published case</p>
      {s.title ? (
        <p className="mt-1.5 text-[19px] font-bold leading-tight text-foreground">{s.title}</p>
      ) : (
        <p className="mt-1.5 text-[19px] font-bold leading-tight text-muted-foreground">Keep going</p>
      )}
      <ul className="mt-4 space-y-2.5 text-[14.5px] leading-snug">
        {s.pay !== undefined && (
          <li className="flex gap-2.5">
            <IndianRupee className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              <span className="font-semibold text-foreground">{rupees(s.pay)}</span> <span className="text-muted-foreground">per published case from here</span>
            </span>
          </li>
        )}
        {s.freeMonths !== undefined && (
          <li className="flex gap-2.5">
            <Gift className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              <span className="font-semibold text-foreground">+{months(s.freeMonths)}</span>{' '}
              <span className="text-muted-foreground">of MediKarya Resident free ({s.freeTotal} in all)</span>
            </span>
          </li>
        )}
        {s.title && (
          <li className="flex gap-2.5">
            <ScrollText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span className="text-muted-foreground">A certificate anyone can verify</span>
          </li>
        )}
      </ul>
    </div>
  );
}

function Points({ items, tone = 'light' }: { items: string[]; tone?: 'light' | 'dark' }) {
  return (
    <ul className="space-y-2.5">
      {items.map((t) => (
        <li key={t} className={`flex gap-2.5 text-[15px] leading-relaxed ${tone === 'dark' ? 'text-white/80' : 'text-foreground'}`}>
          <Check className={`mt-1 h-4 w-4 shrink-0 ${tone === 'dark' ? 'text-emerald-300' : 'text-primary'}`} />
          {t}
        </li>
      ))}
    </ul>
  );
}

export default function RewardsPage() {
  const stops = writerStops();
  const freeTotal = FREE_RESIDENT_MILESTONES.reduce((sum, m) => sum + m.months, 0);

  return (
    <div className="min-h-screen bg-surface">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60rem_30rem_at_85%_-10%,hsl(var(--brand-muted)),transparent)]" aria-hidden />
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <Link href="/" className="inline-flex items-center gap-2 text-primary">
            <Logo size={24} />
            <span className="font-semibold">MediKarya Case Studio</span>
          </Link>
          <p className="eyebrow mt-10">Rewards</p>
          <h1 className="mt-3 max-w-3xl text-[2.3rem] font-bold leading-[1.1] tracking-tight text-foreground sm:text-[3rem]">
            What you get, <span className="text-primary">case by case</span>
          </h1>
          <div className="mt-6 grid max-w-3xl gap-3 sm:grid-cols-3">
            {[
              { Icon: IndianRupee, label: 'Paid', text: 'for every published case and every review' },
              { Icon: Gift, label: 'Free MediKarya', text: `up to ${months(freeTotal)} of Resident for writers` },
              { Icon: Award, label: 'Titles', text: 'with certificates anyone can verify' },
            ].map(({ Icon, label, text }) => (
              <div key={label} className="flex items-start gap-3 rounded-xl border border-border bg-card/80 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-primary">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <p className="text-[14px] leading-snug text-muted-foreground">
                  <span className="block font-semibold text-foreground">{label}</span>
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Writers: the milestone track */}
      <section className="px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow">If you write cases</p>
          <h2 className="mt-2 text-3xl sm:text-[2.1rem] sm:leading-tight">Your milestones</h2>
          <p className="mt-2 max-w-2xl text-[15.5px] text-muted-foreground">Counted in cases published on MediKarya, not cases submitted.</p>

          {/* the track: across on wide screens, down on phones */}
          <ol className="relative mt-10 grid gap-5 lg:grid-cols-5 lg:gap-4">
            <span className="absolute left-[15px] top-2 bottom-2 w-px bg-primary/25 lg:hidden" aria-hidden />
            <span className="absolute left-0 right-0 top-[15px] hidden h-px bg-primary/25 lg:block" aria-hidden />
            {stops.map((s) => (
              <li key={s.at} className="relative pl-12 lg:pl-0 lg:pt-12">
                <span className="absolute left-0 top-0 flex h-[31px] w-[31px] items-center justify-center rounded-full border-2 border-primary bg-card font-display text-[13px] font-bold text-primary">
                  {s.at}
                </span>
                <StopCard s={s} />
              </li>
            ))}
          </ol>

          <div className="mt-10 grid gap-6 rounded-2xl border border-border bg-card p-6 sm:p-8 md:grid-cols-2">
            <div>
              <p className="field-name">How you are paid</p>
              <div className="mt-3">
                <Points
                  items={[
                    'When your case is published, not when you submit it.',
                    `The first ${CASE_PAYOUTS_PER_MONTH} cases published in a calendar month are paid. More that month still count towards your title.`,
                    'By UPI, to the ID you add in your dashboard.',
                  ]}
                />
              </div>
            </div>
            <div>
              <p className="field-name">On top of that</p>
              <div className="mt-3">
                <Points
                  items={[
                    'Your name on every case of yours that goes live.',
                    'A place on the contributors page at medikarya.in from your first published case.',
                    'Free Resident unlocks when you sign in to medikarya.in with the same email.',
                  ]}
                />
              </div>
            </div>
          </div>

          <Link href="/sign-up" className="mt-8 inline-block">
            <Button size="lg" className="h-12 px-7 text-base">
              Start writing a case <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Reviewers */}
      <section className="bg-sidebar px-4 py-14 text-sidebar-foreground sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300">If you review cases</p>
          <h2 className="mt-2 text-3xl leading-tight text-white sm:text-[2.1rem]">Paid per case, ten minutes each</h2>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-white/15 bg-white/5 p-6">
              <p className="font-display text-[13px] font-semibold uppercase tracking-[0.12em] text-emerald-300">First review of a case</p>
              <p className="mt-2 text-[2.6rem] font-bold leading-none text-white">{rupees(REVIEW_PAY.first)}</p>
              <p className="mt-3 text-[14.5px] text-white/70">Approve it, or ask for changes: both earn the same.</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/5 p-6">
              <p className="font-display text-[13px] font-semibold uppercase tracking-[0.12em] text-emerald-300">A case rebuilt after another reviewer</p>
              <p className="mt-2 text-[2.6rem] font-bold leading-none text-white">{rupees(REVIEW_PAY.reReview)}</p>
              <p className="mt-3 text-[14.5px] text-white/70">When you are the second reviewer on a case that was changed.</p>
            </div>
          </div>

          <div className="mt-10 grid gap-10 md:grid-cols-2">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white/60">Your titles</p>
              <ol className="mt-4 space-y-3">
                {REVIEWER_RANKS.map((r) => (
                  <li key={r.title} className="flex items-center gap-4 rounded-xl border border-white/15 bg-white/5 px-4 py-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-emerald-300 font-display text-[14px] font-bold text-emerald-300">
                      {r.at}
                    </span>
                    <span>
                      <span className="block font-semibold text-white">{r.title}</span>
                      <span className="text-[13.5px] text-white/60">
                        {r.at} case{r.at === 1 ? '' : 's'} reviewed · with a certificate
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white/60">How it works</p>
              <div className="mt-4">
                <Points
                  tone="dark"
                  items={[
                    'One case at a time, in the specialties you were approved for.',
                    'Each case is held for you for 72 hours.',
                    'Paid once accepted: an approval when the case is published, a change request when the case is rebuilt.',
                    'Coming back to a case you already reviewed earns nothing extra.',
                    'Your name goes on the case only if you want it to.',
                  ]}
                />
              </div>
              <Link href="/join/reviewer" className="mt-7 inline-block">
                <Button size="lg" className="h-12 bg-white px-7 text-base text-primary hover:bg-brand-muted">
                  <Stethoscope className="mr-2 h-4 w-4" /> Become a reviewer
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Certificates */}
      <section className="px-4 py-14 sm:px-6 sm:py-16">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          {[
            { Icon: ScrollText, title: 'A certificate for every title', text: 'Download it from your dashboard the moment you earn it.' },
            { Icon: UserRound, title: 'Checkable by anyone', text: 'Each carries a credential ID and QR code, verified at medikarya.in/verify.' },
            { Icon: Clock, title: 'Yours to keep', text: 'A title stays on your record once you have earned it.' },
          ].map(({ Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-6">
              <Icon className="h-6 w-6 text-primary" />
              <p className="mt-3 text-[16px] font-semibold text-foreground">{title}</p>
              <p className="mt-1 text-[14.5px] leading-relaxed text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-6xl text-[14px] text-muted-foreground">
          The full rules are in the{' '}
          <Link href="/terms" className="font-medium text-primary hover:underline">
            contributor terms
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
