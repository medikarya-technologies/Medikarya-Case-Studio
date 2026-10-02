import type { Metadata } from 'next';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';

import { Button } from '@/components/ui/button';
import { Logo } from '@/components/layout/Logo';
import { getOrCreateCurrentUser } from '@/app/actions/case-actions';
import { getReviewerProfile } from '@/lib/reviewers/server';
import { ApplicationForm } from './application-form';

// "Become a reviewer": the page linked from LinkedIn/Instagram posts. Anyone can read it; applying needs an account
// (sign-up brings them back here). An admin then verifies the application in Admin → Reviewers.

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Become a clinical reviewer | MediKarya Case Studio',
  description: 'PG residents and faculty: review clinical cases for MediKarya, India’s AI patient simulation platform for medical students.',
};

const STEPS = [
  { title: 'Apply in two minutes', text: 'Your specialty, institution and medical council registration number.' },
  { title: 'We verify you', text: 'We check your registration on the Indian Medical Register, usually within a day or two.' },
  { title: 'Review cases in your specialty', text: 'Read a one-page report of each case, with everything AI-added marked, and approve it or ask for changes. 5 to 10 minutes a case.' },
  { title: 'Get credited', text: 'Your name on the cases you review (if you choose), a reviewer title that grows with you, and a certificate.' },
];

export default async function JoinReviewerPage() {
  const { userId } = await auth();
  const user = userId ? await getOrCreateCurrentUser() : null;
  const profile = user ? await getReviewerProfile(user.id) : null;

  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <div className="flex items-center gap-2 text-primary">
          <Logo size={26} />
          <span className="font-semibold">MediKarya Case Studio</span>
        </div>
        <p className="eyebrow mt-8">For PG residents and faculty</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-[2.75rem] sm:leading-[1.1]">Become a clinical reviewer</h1>
        <p className="mt-4 text-[17px] leading-relaxed text-muted-foreground">
          MediKarya turns real clinical cases written by medical students into interactive patients that thousands of students learn from. Every
          case is checked by a doctor before it goes live. We are looking for <strong className="text-foreground">PG residents and faculty</strong> to
          be those doctors.
        </p>

        <p className="eyebrow mt-10">How it works</p>
        <ol className="mt-3 grid gap-x-8 gap-y-5 border-y border-border py-6 sm:grid-cols-2">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/40 text-xs font-bold text-primary">{i + 1}</span>
              <div>
                <p className="font-semibold leading-7 text-foreground">{s.title}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-10">
          {!user ? (
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <p className="text-lg font-semibold text-foreground">Create a free account to apply</p>
              <p className="mt-1 text-sm text-muted-foreground">You will come straight back to this page.</p>
              <div className="mt-4 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/sign-up?redirect_url=/join/reviewer">
                  <Button size="lg" className="w-full sm:w-auto">Sign up and apply</Button>
                </Link>
                <Link href="/sign-in?redirect_url=/join/reviewer">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">I have an account</Button>
                </Link>
              </div>
            </div>
          ) : profile?.status === 'approved' ? (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-6">
              <p className="text-lg font-semibold text-emerald-950">You are a verified reviewer.</p>
              <p className="mt-1 text-sm text-emerald-900">Your cases are waiting in your reviewer dashboard.</p>
              <Link href={`/dashboard/${user?.role === 'admin' ? 'admin' : user?.role === 'reviewer' ? 'reviewer' : 'author'}/medikarya`} className="mt-4 inline-block">
                <Button>Go to my review queue</Button>
              </Link>
            </div>
          ) : (
            <>
              {profile?.status === 'pending' && (
                <div className="mb-5 rounded-xl border border-sky-300 bg-sky-50 p-4 text-sm text-sky-950">
                  <strong>Thank you, your application is with us.</strong> We will verify it shortly; you can update the details below in the meantime.
                </div>
              )}
              {profile?.status === 'rejected' && (
                <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                  <strong>We could not verify your last application.</strong>
                  {profile.admin_note ? ` ${profile.admin_note}` : ''} You can correct the details and apply again.
                </div>
              )}
              <ApplicationForm initial={profile} />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
