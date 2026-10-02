'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { submitReviewerApplication } from '@/app/actions/reviewer-actions';
import type { ReviewerKind, ReviewerProfile } from '@/lib/reviewers/shared';
import { REVIEW_SPECIALTIES, specialtyLabel } from '@/lib/reviewers/specialties';

const KINDS: Array<{ value: ReviewerKind; label: string; hint: string }> = [
  { value: 'pg_resident', label: 'PG resident', hint: 'MD / MS / DNB, any year' },
  { value: 'faculty', label: 'Faculty', hint: 'Assistant professor and above' },
  { value: 'doctor', label: 'Practising doctor', hint: 'MBBS or above, not in a PG programme' },
  { value: 'intern', label: 'Intern', hint: 'Compulsory rotating internship' },
];

export function ApplicationForm({ initial }: { initial: ReviewerProfile | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    kind: (initial?.kind ?? 'pg_resident') as ReviewerKind,
    designation: initial?.designation ?? '',
    department: initial?.department ?? '',
    institution: initial?.institution ?? '',
    specialties: initial?.specialties ?? ([] as string[]),
    council: initial?.council ?? '',
    registration_no: initial?.registration_no ?? '',
    linkedin_url: initial?.linkedin_url ?? '',
    upi_id: initial?.upi_id ?? '',
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((prev) => ({ ...prev, [k]: e.target.value }));
  const toggle = (s: string) =>
    setF((prev) => ({ ...prev, specialties: prev.specialties.includes(s) ? prev.specialties.filter((x) => x !== s) : [...prev.specialties, s] }));

  const submit = () =>
    start(async () => {
      setError(null);
      const r = await submitReviewerApplication(f);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });

  const required = <span className="text-destructive"> *</span>;
  const optional = <span className="font-normal text-muted-foreground"> (optional)</span>;

  return (
    <form onSubmit={(e) => e.preventDefault()} className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(30,31,34,0.05)]">
      <div className="border-b border-border bg-muted/50 px-5 py-4 sm:px-7">
        <p className="eyebrow">Application</p>
        <h2 className="mt-1 text-2xl font-semibold text-foreground">{initial ? 'Your application' : 'Apply to review'}</h2>
        <p className="field-hint mt-1">
          Four short parts. Fields marked <span className="text-destructive">*</span> are needed.
        </p>
      </div>

      <div className="space-y-7 px-5 py-6 sm:px-7">
        <section className="form-section">
          <h3 className="form-section-title">
            <span className="form-section-number">1</span> About you
          </h3>
          <fieldset>
            <legend className="text-[13.5px] font-semibold text-foreground">I am a{required}</legend>
            <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
              {KINDS.map((k) => {
                const on = f.kind === k.value;
                return (
                  <label
                    key={k.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors ${on ? 'border-primary bg-brand-muted ring-1 ring-primary' : 'border-input hover:border-foreground/40'}`}
                  >
                    <input type="radio" name="kind" className="sr-only" checked={on} onChange={() => setF({ ...f, kind: k.value })} />
                    <span className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 ${on ? 'border-primary' : 'border-input'}`}>
                      {on && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </span>
                    <span>
                      <span className="block font-semibold leading-5 text-foreground">{k.label}</span>
                      <span className="field-hint block">{k.hint}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="designation">Designation{optional}</Label>
              <Input id="designation" value={f.designation} onChange={set('designation')} placeholder={f.kind === 'faculty' ? 'e.g. Associate Professor' : 'e.g. PG Resident, 2nd year'} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="department">Department{optional}</Label>
              <Input id="department" value={f.department} onChange={set('department')} placeholder="e.g. General Medicine" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="institution">Institution{required}</Label>
              <Input id="institution" value={f.institution} onChange={set('institution')} placeholder="e.g. Maulana Azad Medical College, Delhi" />
            </div>
          </div>
        </section>

        <section className="form-section">
          <h3 className="form-section-title">
            <span className="form-section-number">2</span> What you can review
          </h3>
          <fieldset>
            <legend className="text-[13.5px] font-semibold text-foreground">Specialties{required}</legend>
            <p className="field-hint mt-0.5">
              Tap every specialty you train or teach in. Advanced cases go to faculty.
              {f.specialties.length > 0 && <span className="font-semibold text-primary"> {f.specialties.length} chosen.</span>}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {REVIEW_SPECIALTIES.map((s) => {
                const on = f.specialties.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(s)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${on ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-card text-foreground hover:border-foreground/40'}`}
                  >
                    {on && <Check className="h-3.5 w-3.5" />}
                    {specialtyLabel(s)}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </section>

        <section className="form-section">
          <h3 className="form-section-title">
            <span className="form-section-number">3</span> So we can verify you
          </h3>
          <p className="field-hint">We use your registration number only to find you on the Indian Medical Register. It is never shown publicly.</p>
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="council">Medical council{optional}</Label>
              <Input id="council" value={f.council} onChange={set('council')} placeholder="e.g. Delhi Medical Council" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="registration_no">Registration number{f.kind === 'faculty' ? optional : required}</Label>
              <Input id="registration_no" value={f.registration_no} onChange={set('registration_no')} placeholder="e.g. DMC/R/12345" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="linkedin_url">LinkedIn profile{optional}</Label>
              <Input id="linkedin_url" value={f.linkedin_url} onChange={set('linkedin_url')} placeholder="https://linkedin.com/in/…" />
            </div>
          </div>
        </section>

        <section className="form-section">
          <h3 className="form-section-title">
            <span className="form-section-number">4</span> Where to pay you
          </h3>
          <div className="space-y-1.5 sm:max-w-sm">
            <Label htmlFor="upi_id">UPI ID{optional}</Label>
            <Input id="upi_id" value={f.upi_id} onChange={set('upi_id')} placeholder="e.g. name@okhdfcbank" />
            <p className="field-hint">For the honorarium on each case you review. You can add it later from your dashboard.</p>
          </div>
        </section>
      </div>

      <div className="flex flex-col gap-3 border-t border-border bg-muted/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        {error ? <p className="text-sm font-medium text-destructive">{error}</p> : <p className="field-hint">We usually verify applications within a day or two.</p>}
        <Button type="button" size="lg" onClick={submit} disabled={pending} className="shrink-0">
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initial ? 'Update my application' : 'Submit application'}
        </Button>
      </div>
    </form>
  );
}
