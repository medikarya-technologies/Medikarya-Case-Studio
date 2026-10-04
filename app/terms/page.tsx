import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/layout/Logo';
import { CASE_PAY, CASE_PAYOUTS_PER_MONTH, COMPANY_LEGAL_NAME, REVIEW_PAY, rupees } from '@/lib/rewards/config';

// The terms case writers and reviewers agree to: linked beside the publishing consent on a case, and on the writer
// and reviewer sign-up forms. Public, no sign-in. The pay figures come from lib/rewards/config.ts, so the page always
// states the rates the system actually pays.

export const metadata: Metadata = {
  title: 'Contributor terms | MediKarya Case Studio',
  description: 'The terms for writing and reviewing clinical cases for MediKarya: joining, patient privacy, use of your case, reviewing, payments and certificates.',
};

const UPDATED = '4 October 2026';

const casePay = [...CASE_PAY]
  .sort((a, b) => a.from - b.from)
  .map((t, i, all) => {
    const next = all[i + 1];
    return `${rupees(t.amount)} for published cases ${t.from}${next ? ` to ${next.from - 1}` : ' onwards'}`;
  })
  .join(', ');

const SECTIONS: Array<{ title: string; points: string[] }> = [
  {
    title: 'Joining',
    points: [
      'You must be enrolled in, or have completed, a recognised medical course in India, and give us accurate details and genuine proof of who you are.',
      'We may decline or withdraw verification at our discretion, for example if your details cannot be confirmed.',
      'One account per person. If you are under 18, a parent or guardian must agree to these terms for you.',
    ],
  },
  {
    title: 'Patient privacy',
    points: [
      'Write only about patients you saw in the course of your training or work.',
      'Use a made-up name. Leave out anything that could identify the patient: their real name, hospital or case number, address, photographs of the face, dates of admission.',
      'Follow your institution’s rules on using clinical material for teaching. If a case breaches patient privacy, we will remove it and may end your participation.',
    ],
  },
  {
    title: 'Your case and how we use it',
    points: [
      'A case you submit must be your own work. Do not copy from textbooks, other cases or the internet. Plagiarised cases are removed, and any reward for them is withdrawn.',
      'When you allow us to publish a case, you give us a non-exclusive, worldwide, royalty-free and permanent licence to edit, adapt (including into an interactive or live format), publish and use it on MediKarya. You keep the right to use your own case elsewhere.',
      'We credit you by name on every published case of yours. We decide whether, when and in what form a case is published; submitting does not guarantee publication.',
      'We may take a case down at any time, for example after a clinical correction. A case taken down stops counting from then; payments already made are not reclaimed unless the case breached these terms.',
    ],
  },
  {
    title: 'Reviewing',
    points: [
      'Review only in the specialties you were approved for, using your own clinical judgement.',
      'Do not review a case written by you, a relative, or anyone you have a close tie with. Tell us of any other conflict of interest.',
      'Keep unpublished cases confidential. Do not copy, share or reuse them.',
      'A case you take is held for you for 72 hours, after which it returns to the queue.',
    ],
  },
  {
    title: 'Payments',
    points: [
      `Case writers are paid per published case: ${casePay}. The first ${CASE_PAYOUTS_PER_MONTH} cases published in a calendar month are paid; more that month still count towards titles.`,
      `Reviewers are paid ${rupees(REVIEW_PAY.first)} for the first review of a case and ${rupees(REVIEW_PAY.reReview)} for reviewing a case another reviewer reviewed before it was rebuilt. Coming back to a case you already reviewed earns nothing extra. A review is paid once accepted: an approval when the case is published, a request for changes when the case is rebuilt with those comments.`,
      'Rates are those in force when a payment is earned. We may change rates for future work; anything already recorded keeps its amount.',
      'Payments are made by UPI to an ID in your own name. We are not responsible for delays caused by a wrong or inactive UPI ID. Payments may be subject to tax deduction where the law requires it.',
      'Each published case also gives its writer one month of the MediKarya Resident plan, up to six months in all, used by signing in to medikarya.in with the same email.',
      'Rewards obtained through false details, duplicate accounts or breaches of these terms will be withdrawn.',
    ],
  },
  {
    title: 'Titles and certificates',
    points: [
      'Titles and certificates recognise your contribution. They are not academic qualifications or credits.',
      'We may revoke a certificate issued in error or obtained in breach of these terms. A revoked certificate shows as revoked at medikarya.in/verify.',
    ],
  },
  {
    title: 'General',
    points: [
      'MediKarya cases are for education and practice. They are not medical advice.',
      'We may update these terms. We will tell you of material changes, and continuing to contribute means you accept them.',
      'You can stop contributing at any time. Cases already published stay published under the licence above.',
      'These terms are governed by the laws of India, and the courts at Faridabad, Haryana have jurisdiction.',
    ],
  },
];

export default function ContributorTermsPage() {
  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <Link href="/" className="flex items-center gap-2 text-primary">
          <Logo size={26} />
          <span className="font-semibold">MediKarya Case Studio</span>
        </Link>
        <p className="eyebrow mt-8">Last updated {UPDATED}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">Contributor terms</h1>
        <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
          These terms apply when you write or review clinical cases for MediKarya. “We” means {COMPANY_LEGAL_NAME}, Faridabad, Haryana; “you” means a case
          writer or reviewer.
        </p>

        <ol className="mt-10 space-y-9">
          {SECTIONS.map((s, i) => (
            <li key={s.title}>
              <h2 className="text-xl font-bold text-foreground">
                {i + 1}. {s.title}
              </h2>
              <ol className="mt-3 space-y-2.5">
                {s.points.map((p, j) => (
                  <li key={j} className="flex gap-3 text-[15.5px] leading-relaxed text-foreground">
                    <span className="w-8 shrink-0 text-muted-foreground">
                      {i + 1}.{j + 1}
                    </span>
                    <span>{p}</span>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ol>

        <p className="mt-12 border-t border-border pt-6 text-[15px] text-muted-foreground">
          Questions about these terms:{' '}
          <a href="mailto:collab@medikarya.in" className="font-medium text-primary hover:underline">
            collab@medikarya.in
          </a>
          . MediKarya’s general{' '}
          <a href="https://www.medikarya.in/terms" className="font-medium text-primary hover:underline">
            terms of service
          </a>{' '}
          and{' '}
          <a href="https://www.medikarya.in/privacy" className="font-medium text-primary hover:underline">
            privacy policy
          </a>{' '}
          also apply.
        </p>
      </div>
    </main>
  );
}
