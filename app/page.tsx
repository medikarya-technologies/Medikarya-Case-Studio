import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, BadgeCheck, Check, ShieldCheck, Stethoscope } from 'lucide-react';
import { auth, currentUser } from '@clerk/nextjs/server';
import { Button } from '@/components/ui/button';
import { getOrCreateUser } from '@/lib/supabase/queries';
import { getReviewerProfile } from '@/lib/reviewers/server';
import { Logo } from '@/components/layout/Logo';
import { APP_NAME } from '@/lib/constants';
import { CONTRIBUTOR_RANKS, REVIEWER_RANKS } from '@/lib/rewards/config';

// The public front page. Signed-in people never see it: they go straight to their dashboard.
// Its job: tell a medical student, and a doctor, what happens to a case here, in the order it happens.

const JOURNEY = [
  { title: 'You write it', text: 'A case you saw on the ward, on a structured seven-part sheet. Made-up name, no real identifiers.' },
  { title: 'It becomes a patient', text: 'With your permission, MediKarya turns it into an interactive patient (or tells you exactly what to add first).' },
  { title: 'A doctor reviews it', text: 'One review, of the finished patient: a verified doctor approves it, or says what to change.' },
  { title: 'It goes live, with your name', text: 'Students practise on it at medikarya.in. You get the credit, a title and a certificate.' },
];

const SHEET_SECTIONS = ['Patient details', 'History', 'General physical examination', 'Systemic examination', 'Local examination', 'Diagnosis', 'Investigations'];

/** A case sheet as it looks in the studio, drawn small: the thing this site is for. */
function SheetPreview() {
  const row = (name: string, value: string) => (
    <div>
      <p className="field-name">{name}</p>
      <p className="mt-0.5 text-[13px] font-medium leading-snug text-foreground">{value}</p>
    </div>
  );
  return (
    <div className="relative isolate mx-auto w-full max-w-md lg:mx-0 lg:ml-auto">
      <div className="absolute -inset-2 -z-10 rotate-3 rounded-2xl border border-primary/25 bg-brand-muted" aria-hidden />
      <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-[0_18px_50px_-18px_rgba(31,81,56,0.45)]">
        <div className="flex items-start justify-between gap-3 border-b border-border bg-muted/50 px-5 py-3.5">
          <div>
            <p className="eyebrow">Case sheet</p>
            <p className="mt-1 font-display text-[17px] font-semibold leading-snug text-foreground">Fever and productive cough in a 45-year-old man</p>
          </div>
          <span className="mt-1 shrink-0 rounded-full bg-status-approved px-2.5 py-0.5 text-[11px] font-bold text-white">Approved</span>
        </div>
        <div className="space-y-3.5 px-5 py-4">
          {row('Presenting complaints', 'Fever for 5 days. Cough with yellow sputum for 4 days.')}
          <div className="grid grid-cols-3 gap-3 border-y border-border py-3">
            {row('Pulse', '104/min')}
            {row('BP', '118/76')}
            {row('Temp', '38.9 °C')}
          </div>
          {row('Provisional diagnosis', 'Community-acquired pneumonia, right lower lobe')}
        </div>
        <div className="flex items-center gap-2 border-t border-border bg-brand-muted/60 px-5 py-2.5 text-[12.5px] text-primary">
          <BadgeCheck className="h-4 w-4 shrink-0" />
          <span>
            <span className="font-semibold">Clinically reviewed</span> before it reaches students
          </span>
        </div>
      </div>
    </div>
  );
}

/** A small certificate, in the same style as the real one (/certificate/<id>). */
function CertificatePreview() {
  return (
    <div className="mx-auto w-full max-w-md bg-[#FFFEFA] p-2.5 shadow-[0_18px_50px_-18px_rgba(0,0,0,0.6)]">
      <div className="border-2 border-[#2F7A5C] px-6 py-7 text-center outline outline-1 -outline-offset-[7px] outline-[#2F7A5C]">
        <div className="flex items-center justify-center gap-2 text-[#16302B]">
          <Logo size={20} />
          <span className="text-[15px] font-extrabold tracking-tight">MediKarya</span>
        </div>
        <p className="mt-4 text-[9px] font-semibold uppercase tracking-[0.4em] text-[#2F7A5C]">Certificate of Recognition</p>
        <p className="mt-3 text-[11px] text-[#5B6F69]">This is to certify that</p>
        <p className="mt-1 font-serif text-[26px] font-bold leading-tight text-[#16302B]">Your Name</p>
        <div className="mx-auto mt-2 h-px w-40 bg-[#2F7A5C]/50" />
        <p className="mt-3 text-[11px] text-[#5B6F69]">has been recognised as</p>
        <p className="mt-0.5 text-[18px] font-bold text-[#2F7A5C]">{CONTRIBUTOR_RANKS[1].title}</p>
        <p className="mt-4 font-mono text-[10px] text-[#5B6F69]">Credential ID MK-2026-00000 · medikarya.in/verify</p>
      </div>
    </div>
  );
}

function Ladder({ ranks, unit, tone }: { ranks: readonly { at: number; title: string }[]; unit: string; tone: 'light' | 'dark' }) {
  return (
    <ol className={`ml-1 mt-5 border-l ${tone === 'dark' ? 'border-white/25' : 'border-primary/30'}`}>
      {ranks.map((r, i) => (
        <li key={r.title} className="relative pl-5">
          <span className={`absolute -left-[5.5px] top-1 h-2.5 w-2.5 rounded-full ${tone === 'dark' ? 'bg-emerald-300' : 'bg-primary'}`} />
          <p className={`text-[15px] leading-tight ${i < ranks.length - 1 ? 'pb-4' : 'pb-1'}`}>
            <span className={`font-semibold ${tone === 'dark' ? 'text-white' : 'text-foreground'}`}>{r.title}</span>
            <span className={tone === 'dark' ? 'text-white/60' : 'text-muted-foreground'}>
              {' '}
              · {r.at} {unit}
              {r.at === 1 ? '' : 's'}
            </span>
          </p>
        </li>
      ))}
    </ol>
  );
}

export default async function Home() {
  const { userId } = await auth();
  const clerkUser = await currentUser();

  if (userId && clerkUser) {
    const user = await getOrCreateUser(
      userId,
      clerkUser.fullName || clerkUser.username || 'Unknown User',
      clerkUser.emailAddresses[0]?.emailAddress || ''
    );
    const role = user.role as 'author' | 'reviewer' | 'admin';

    if (role === 'reviewer') {
      redirect('/dashboard/reviewer');
    } else if (role === 'admin') {
      redirect('/dashboard/admin');
    } else {
      // someone verified to review MediKarya cases (their role is still 'author') goes to their queue
      const profile = await getReviewerProfile(user.id).catch(() => null);
      redirect(profile?.status === 'approved' ? '/dashboard/author/medikarya' : '/dashboard/author');
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* What this is, and what to do */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60rem_30rem_at_85%_-10%,hsl(var(--brand-muted)),transparent)]" aria-hidden />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
          <div>
            <p className="eyebrow">For MBBS students, interns and the doctors who teach them</p>
            <h1 className="mt-4 text-[2.5rem] font-bold leading-[1.08] tracking-tight text-foreground sm:text-[3.4rem]">
              Write up the case you saw. <span className="text-primary">Watch it become a patient</span> others learn from.
            </h1>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-muted-foreground">
              The Case Studio is where clinical cases are written, reviewed by a doctor, and turned into the interactive patients students practise on
              at MediKarya, with the author&apos;s name on them.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/sign-up">
                <Button size="lg" className="h-12 w-full px-7 text-base sm:w-auto">
                  Start writing a case
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/join/reviewer">
                <Button variant="outline" size="lg" className="h-12 w-full px-7 text-base sm:w-auto">
                  <Stethoscope className="mr-2 h-4 w-4" />
                  I&apos;m a doctor: review cases
                </Button>
              </Link>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {['Free to use', 'No real patient details, ever', 'Credit stays with the author'].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-primary" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <SheetPreview />
        </div>
      </section>

      {/* What happens to a case, in order */}
      <section className="bg-card px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow">From the ward to the platform</p>
          <h2 className="mt-2 max-w-2xl text-3xl sm:text-[2.1rem] sm:leading-tight">What happens to a case you write</h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-4 md:gap-0">
            {JOURNEY.map((s, i) => (
              <li key={s.title} className="relative md:pr-8">
                <div className="flex items-center">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary font-display text-[15px] font-bold text-primary-foreground">{i + 1}</span>
                  {i < JOURNEY.length - 1 && <span className="ml-3 hidden h-px flex-1 bg-primary/25 md:block" aria-hidden />}
                </div>
                <p className="mt-4 text-[17px] font-semibold text-foreground">{s.title}</p>
                <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Who it is for: two people, two different deals */}
      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-7 sm:p-9">
            <p className="eyebrow">If you are a student or intern</p>
            <h2 className="mt-2 text-[1.7rem] leading-tight">Your cases, on your record</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              Every case that goes live on MediKarya carries your name, counts towards a title, and earns a reward. Each title comes with a certificate
              anyone can verify.
            </p>
            <Ladder ranks={CONTRIBUTOR_RANKS} unit="published case" tone="light" />
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
              <Link href="/sign-up">
                <Button>
                  Write your first case <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/rewards" className="text-[15px] font-medium text-primary hover:underline">
                See every reward
              </Link>
            </div>
          </div>

          <div className="rounded-2xl bg-sidebar p-7 text-sidebar-foreground sm:p-9">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300">If you are a PG resident or faculty</p>
            <h2 className="mt-2 text-[1.7rem] leading-tight text-white">Ten minutes a case, in your specialty</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-white/70">
              Read a one-page report of the case, then approve it or say what is wrong. Each case you review earns an honorarium and
              counts towards a reviewer title. Your name goes on the case only if you want it to.
            </p>
            <Ladder ranks={REVIEWER_RANKS} unit="reviewed case" tone="dark" />
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
              <Link href="/join/reviewer">
                <Button className="bg-white text-primary hover:bg-brand-muted">
                  Become a reviewer <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/rewards" className="text-[15px] font-medium text-emerald-300 hover:underline">
                See what reviewers earn
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* The sheet itself, and the privacy rule */}
      <section className="border-y border-border bg-card px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="eyebrow">The case sheet</p>
            <h2 className="mt-2 text-3xl sm:text-[2.1rem] sm:leading-tight">The way you are taught to present a case</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              Seven parts, in the order of a bedside presentation. Your work saves as you go, you can attach reports and scans, and you can export the
              finished sheet as a PDF.
            </p>
            <ol className="mt-6 grid gap-x-8 gap-y-0 sm:grid-cols-2">
              {SHEET_SECTIONS.map((s, i) => (
                <li key={s} className="flex items-baseline gap-3 border-b border-border py-2.5 text-[15px]">
                  <span className="w-5 font-display font-bold text-primary">{i + 1}</span>
                  <span className="text-foreground">{s}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="flex flex-col justify-center">
            <div className="rounded-2xl border border-primary/25 bg-brand-muted/50 p-7">
              <ShieldCheck className="h-7 w-7 text-primary" />
              <h3 className="mt-3 font-display text-[1.35rem] font-semibold leading-snug">No real patient is ever identifiable</h3>
              <ul className="mt-4 space-y-2.5 text-[15px] leading-relaxed text-foreground">
                {[
                  'Patient names are made up. No hospital numbers, faces or addresses.',
                  'You confirm this each time you submit a case.',
                  'A case reaches students only if you choose to allow it.',
                ].map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-primary" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* The certificate, and the last ask */}
      <section className="bg-sidebar px-4 py-16 text-sidebar-foreground sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <CertificatePreview />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300">Recognition you can show</p>
            <h2 className="mt-2 text-3xl leading-tight text-white sm:text-[2.3rem]">A certificate anyone can check</h2>
            <p className="mt-4 max-w-lg text-[16px] leading-relaxed text-white/70">
              Each title comes with a certificate carrying its own credential ID. Add it to LinkedIn or your CV: whoever reads it can confirm it on
              medikarya.in in one click.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/sign-up">
                <Button size="lg" className="h-12 w-full bg-white px-7 text-base text-primary hover:bg-brand-muted sm:w-auto">
                  Create a free account
                </Button>
              </Link>
              <Link href="/contributors">
                <Button size="lg" variant="outline" className="h-12 w-full border-white/30 bg-transparent px-7 text-base text-white hover:bg-white/10 hover:text-white sm:w-auto">
                  See the contributors
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-card px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <Logo size={24} />
            <span className="font-medium text-foreground">{APP_NAME}</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <Link href="/rewards" className="hover:text-foreground">
              Rewards
            </Link>
            <Link href="/contributors" className="hover:text-foreground">
              Contributors
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/join/reviewer" className="hover:text-foreground">
              Become a reviewer
            </Link>
            <a href="https://www.medikarya.in" className="hover:text-foreground">
              medikarya.in
            </a>
          </nav>
          <p>© {new Date().getFullYear()} MediKarya</p>
        </div>
      </footer>
    </div>
  );
}
