'use client';

import Link from 'next/link';
import {
  Home,
  FileText,
  Plus,
  BookOpen,
  User,
  ClipboardCheck,
  ShieldCheck,
  Clock,
  TriangleAlert,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';
import type { WriterStanding } from '@/lib/writers/shared';

const navItems = [
  { href: '/dashboard/author', label: 'Dashboard', icon: Home },
  { href: '/dashboard/author/cases', label: 'All Cases', icon: FileText },
  { href: '/dashboard/author/new', label: 'New Case', icon: Plus },
  { href: '/dashboard/author/templates', label: 'Templates', icon: BookOpen },
  { href: '/dashboard/author/profile', label: 'Profile', icon: User },
];

const reviewItem = { href: '/dashboard/author/medikarya', label: 'MediKarya reviews', icon: ClipboardCheck };
const verifyItem = { href: '/welcome', label: 'Get verified', icon: ShieldCheck };

/** Shown on every author page until an admin has verified them: what is happening, and what they can do meanwhile. */
function VerificationBanner({ standing }: { standing: WriterStanding }) {
  if (standing.state === 'verified') return null;
  const waiting = standing.state === 'pending';
  const Icon = waiting ? Clock : TriangleAlert;
  return (
    <div
      className={`mb-6 flex flex-col gap-3 rounded-xl border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between ${
        waiting ? 'border-primary/25 bg-brand-muted' : 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40'
      }`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${waiting ? 'text-primary' : 'text-amber-600 dark:text-amber-400'}`} />
        <div>
          <p className="font-semibold text-foreground">
            {waiting ? 'We are checking your details' : standing.state === 'rejected' ? 'We could not verify you yet' : 'Tell us who you are to submit cases'}
          </p>
          <p className="text-sm text-muted-foreground">
            {waiting
              ? 'This usually takes a day or two. Start writing now and save drafts: Submit unlocks the moment you are verified.'
              : standing.state === 'rejected'
                ? `${standing.note ? `${standing.note} ` : ''}Correct your details and send them again.`
                : 'It takes two minutes. You can write and save drafts before that, but not submit them.'}
          </p>
        </div>
      </div>
      {!waiting && (
        <Link href="/welcome" className="shrink-0 rounded-lg bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          {standing.state === 'rejected' ? 'Correct my details' : 'Get verified'}
        </Link>
      )}
    </div>
  );
}

export default function AuthorDashboardClientLayout({
  children,
  reviewsMediKarya = false,
  standing = { state: 'verified' },
}: Readonly<{
  children: React.ReactNode;
  /** They have applied to review MediKarya cases: show that page first in the menu. */
  reviewsMediKarya?: boolean;
  /** Whether an admin has verified them as a case writer (lib/writers/). */
  standing?: WriterStanding;
}>) {
  const items = [...(reviewsMediKarya ? [reviewItem] : []), ...navItems, ...(standing.state === 'verified' ? [] : [verifyItem])];
  return (
    <DashboardShell navItems={items} roleLabel={reviewsMediKarya ? 'Reviewer' : 'Author'}>
      <VerificationBanner standing={standing} />
      {children}
    </DashboardShell>
  );
}
