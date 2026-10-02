import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { Check, Clock, PenLine } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Logo } from '@/components/layout/Logo';
import { getOrCreateCurrentUser } from '@/app/actions/case-actions';
import { getWriterProfile, writerStanding, WRITER_KIND_LABEL } from '@/lib/writers/server';
import { CASE_PAY, CONTRIBUTOR_RANKS, rupees } from '@/lib/rewards/config';
import { WelcomeForm } from './welcome-form';

// The first page after signing up, by email or with Google alike: who are you? An admin verifies the answer in
// Admin → Users, and only then can this person submit a case (they can write drafts straight away).

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Welcome | MediKarya Case Studio' };

const NEXT_STEPS = [
  { title: 'Tell us who you are', text: 'Your college or hospital, and one proof that you are a medical student or doctor.' },
  { title: 'We verify you', text: 'Usually within a day or two. You can write and save drafts while you wait.' },
  { title: 'Submit your cases', text: 'A doctor reviews each one. Published cases earn you a title, a certificate and a payout.' },
];

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in?redirect_url=/welcome');
  const user = await getOrCreateCurrentUser();
  if (user.role === 'admin') redirect('/dashboard/admin');
  if (user.role === 'reviewer') redirect('/dashboard/reviewer');

  const [standing, { profile }] = await Promise.all([writerStanding(user), getWriterProfile(user.id)]);
  if (standing.state === 'verified') redirect('/dashboard/author');

  const editing = (await searchParams).edit === '1';
  const waiting = standing.state === 'pending' && !editing;
  const firstName = user.name.split(' ')[0];

  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <div className="flex items-center gap-2 text-primary">
          <Logo size={26} />
          <span className="font-semibold">MediKarya Case Studio</span>
        </div>

        {waiting ? (
          <>
            <p className="eyebrow mt-8">Step 2 of 3</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-[2.75rem] sm:leading-[1.1]">Thanks, {firstName}. We are checking your details.</h1>
            <p className="mt-4 text-[17px] leading-relaxed text-muted-foreground">
              This usually takes a day or two, and we will tell you here as soon as it is done. You do not have to wait to start: write your first case
              now and save it as a draft.
            </p>

            <div className="mt-8 rounded-xl border border-border bg-card p-5 sm:p-6">
              <ol className="space-y-4">
                {NEXT_STEPS.map((s, i) => {
                  const done = i === 0;
                  const now = i === 1;
                  return (
                    <li key={s.title} className="flex gap-3">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          done ? 'bg-primary text-primary-foreground' : now ? 'border-2 border-primary text-primary' : 'border border-border text-muted-foreground'
                        }`}
                      >
                        {done ? <Check className="h-4 w-4" /> : now ? <Clock className="h-3.5 w-3.5" /> : i + 1}
                      </span>
                      <div>
                        <p className={`font-semibold leading-7 ${done || now ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {s.title}
                          {now && <span className="ml-2 rounded-full bg-brand-muted px-2 py-0.5 text-xs font-semibold text-primary">You are here</span>}
                        </p>
                        <p className="text-sm leading-relaxed text-muted-foreground">{s.text}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
              {profile && (
                <p className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">
                  You told us: <span className="font-medium text-foreground">{[profile.kind ? WRITER_KIND_LABEL[profile.kind] : null, profile.year_or_designation, profile.institution].filter(Boolean).join(' · ')}</span>.{' '}
                  <Link href="/welcome?edit=1" className="font-medium text-primary hover:underline">
                    Change my details
                  </Link>
                </p>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/dashboard/author/new">
                <Button size="lg" className="w-full sm:w-auto">
                  <PenLine className="mr-2 h-4 w-4" /> Write my first case
                </Button>
              </Link>
              <Link href="/dashboard/author">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Go to my dashboard
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="eyebrow mt-8">{standing.state === 'rejected' ? 'One more try' : 'Welcome'}</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-[2.75rem] sm:leading-[1.1]">
              {standing.state === 'rejected' ? 'Let us get you verified' : `Welcome, ${firstName}. First, who are you?`}
            </h1>
            <p className="mt-4 text-[17px] leading-relaxed text-muted-foreground">
              Cases on MediKarya are written by medical students and doctors only, so we verify everyone once before their first case goes to
              review. It takes two minutes.
            </p>

            {standing.state === 'rejected' && (
              <p className="mt-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                <span className="font-semibold">We could not verify you last time.</span> {standing.note ?? 'Please check your details and your proof.'}
              </p>
            )}

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { big: rupees(CASE_PAY[CASE_PAY.length - 1].amount), small: 'for each case published, rising with your title' },
                { big: CONTRIBUTOR_RANKS[0].title, small: 'your first title, with your first published case' },
                { big: 'A certificate', small: 'with a QR code anyone can scan to verify it' },
              ].map((b) => (
                <div key={b.small} className="rounded-xl border border-border bg-card px-4 py-3.5">
                  <p className="text-lg font-bold leading-tight text-foreground">{b.big}</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{b.small}</p>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <WelcomeForm
                name={user.name}
                nameLocked={!!user.name_edited_once}
                email={user.email}
                initial={
                  profile && {
                    kind: profile.kind,
                    institution: profile.institution,
                    year_or_designation: profile.year_or_designation,
                    state: profile.state,
                    phone: profile.phone,
                    council: profile.council,
                    registration_no: profile.registration_no,
                    hasProof: !!profile.proof_path,
                  }
                }
              />
            </div>
            <p className="field-hint mt-4 text-center">
              Here to review cases, not write them?{' '}
              <Link href="/join/reviewer" className="font-medium text-primary hover:underline">
                Apply to be a clinical reviewer
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
