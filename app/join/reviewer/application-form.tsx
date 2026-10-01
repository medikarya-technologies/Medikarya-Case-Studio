'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
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
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const toggle = (s: string) => setF({ ...f, specialties: f.specialties.includes(s) ? f.specialties.filter((x) => x !== s) : [...f.specialties, s] });

  const submit = () =>
    start(async () => {
      setError(null);
      const r = await submitReviewerApplication(f);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-6 rounded-xl border border-border bg-card p-5 sm:p-6">
      <h2 className="text-xl font-bold text-foreground">Your application</h2>

      <fieldset>
        <legend className="text-sm font-medium text-foreground">I am a</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {KINDS.map((k) => (
            <label key={k.value} className={`cursor-pointer rounded-lg border p-3 ${f.kind === k.value ? 'border-primary bg-brand-muted' : 'border-border'}`}>
              <input type="radio" name="kind" className="sr-only" checked={f.kind === k.value} onChange={() => setF({ ...f, kind: k.value })} />
              <span className="font-medium text-foreground">{k.label}</span>
              <span className="block text-xs text-muted-foreground">{k.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="designation">Designation</Label>
          <Input id="designation" value={f.designation} onChange={set('designation')} placeholder={f.kind === 'faculty' ? 'Associate Professor' : 'PG Resident, 2nd year'} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="department">Department</Label>
          <Input id="department" value={f.department} onChange={set('department')} placeholder="General Medicine" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="institution">Institution *</Label>
          <Input id="institution" value={f.institution} onChange={set('institution')} placeholder="Maulana Azad Medical College, Delhi" />
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-foreground">Specialties you can review *</legend>
        <p className="text-xs text-muted-foreground">Choose those you train or teach in. Advanced cases go to faculty.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {REVIEW_SPECIALTIES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggle(s)}
              className={`rounded-full border px-3 py-1 text-sm ${f.specialties.includes(s) ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-foreground hover:bg-muted'}`}
            >
              {specialtyLabel(s)}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="council">Medical council</Label>
          <Input id="council" value={f.council} onChange={set('council')} placeholder="Delhi Medical Council / NMC" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="registration_no">Registration number{f.kind === 'faculty' ? '' : ' *'}</Label>
          <Input id="registration_no" value={f.registration_no} onChange={set('registration_no')} placeholder="e.g. DMC/R/12345" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="linkedin_url">LinkedIn profile (optional)</Label>
          <Input id="linkedin_url" value={f.linkedin_url} onChange={set('linkedin_url')} placeholder="https://linkedin.com/in/…" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="upi_id">UPI ID for honoraria (optional)</Label>
          <Input id="upi_id" value={f.upi_id} onChange={set('upi_id')} placeholder="name@bank" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        We use your registration number only to verify you on the Indian Medical Register. We never show it publicly.
      </p>

      {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <Button type="button" size="lg" onClick={submit} disabled={pending}>
        {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {initial ? 'Update my application' : 'Submit application'}
      </Button>
    </form>
  );
}
