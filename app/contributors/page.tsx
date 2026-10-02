import type { Metadata } from 'next';
import Link from 'next/link';
import { Award, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/layout/Logo';
import { leaderboard } from '@/lib/rewards/server';
import { CONTRIBUTOR_RANKS, REVIEWER_RANKS } from '@/lib/rewards/config';

// The public roll of the people behind MediKarya's cases: students by cases published, and the doctors who reviewed
// them (only those who agreed to be named). Linked from posts and from each person's dashboard.

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Contributors | MediKarya Case Studio',
  description: 'The medical students who write MediKarya’s clinical cases and the doctors who review them.',
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function Ladder({ ranks, unit }: { ranks: readonly { at: number; title: string }[]; unit: string }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-2 text-xs">
      {ranks.map((r) => (
        <li key={r.title} className="rounded-full border border-border bg-card px-2.5 py-1 text-muted-foreground">
          <span className="font-semibold text-foreground">{r.title}</span> · {plural(r.at, unit)}
        </li>
      ))}
    </ul>
  );
}

export default async function ContributorsPage() {
  const board = await leaderboard().catch(() => null);

  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <Link href="/" className="flex items-center gap-2 text-primary">
          <Logo size={26} />
          <span className="font-semibold">MediKarya Case Studio</span>
        </Link>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">The people behind the cases</h1>
        <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
          Every patient on MediKarya starts as a real clinical case written by a medical student and checked by a doctor. These are the people who did
          that work.
        </p>

        {!board && <p className="mt-8 rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">The list is not available right now. Please try again in a little while.</p>}

        {board && (
          <>
            <section className="mt-10">
              <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
                <Award className="h-5 w-5 text-primary" /> Case contributors
              </h2>
              <Ladder ranks={CONTRIBUTOR_RANKS} unit="published case" />
              {board.contributors.length === 0 ? (
                <p className="mt-4 rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">The first published cases will appear here.</p>
              ) : (
                <ol className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
                  {board.contributors.map((c, i) => (
                    <li key={`${c.name}-${i}`} className="flex items-center gap-4 px-4 py-3">
                      <span className="w-6 text-right text-sm font-semibold text-muted-foreground">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-foreground">{c.name}</p>
                        <p className="text-sm text-muted-foreground">{c.title}</p>
                      </div>
                      <span className="shrink-0 text-sm font-medium text-foreground">{plural(c.count, 'case')}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="mt-10">
              <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
                <Stethoscope className="h-5 w-5 text-primary" /> Clinical reviewers
              </h2>
              <Ladder ranks={REVIEWER_RANKS} unit="reviewed case" />
              {board.reviewers.length === 0 ? (
                <p className="mt-4 rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">Reviewers who choose to be named will appear here.</p>
              ) : (
                <ol className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
                  {board.reviewers.map((r, i) => (
                    <li key={`${r.name}-${i}`} className="flex items-center gap-4 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-foreground">{r.name}</p>
                        <p className="truncate text-sm text-muted-foreground">{[r.title, r.designation, r.institution].filter(Boolean).join(' · ')}</p>
                      </div>
                      <span className="shrink-0 text-sm font-medium text-foreground">{plural(r.count, 'case')} reviewed</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </>
        )}

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="font-semibold text-foreground">Medical student?</p>
            <p className="mt-1 text-sm text-muted-foreground">Write up a case you have seen. Published cases earn a title, a certificate and a reward.</p>
            <Link href="/sign-up" className="mt-3 inline-block">
              <Button>Write a case</Button>
            </Link>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="font-semibold text-foreground">PG resident or faculty?</p>
            <p className="mt-1 text-sm text-muted-foreground">Review cases in your specialty, about ten minutes each.</p>
            <Link href="/join/reviewer" className="mt-3 inline-block">
              <Button variant="outline">Become a reviewer</Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
