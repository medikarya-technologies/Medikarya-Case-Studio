'use client';

// The details form a new person fills in right after signing up. One form for everyone: someone who signed up with
// Google has given us only a name and an email, exactly like someone who signed up by email.

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FileCheck2, Loader2, Lock, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveWriterDetailsAction } from '@/app/actions/writer-actions';
import { INDIAN_STATES } from '@/lib/indian-states';
import { PROOF_MAX_BYTES, STUDENT_YEARS, WRITER_KINDS, needsIdPhoto, writerDetailsProblem, type WriterDetails, type WriterKind } from '@/lib/writers/shared';

export interface InitialDetails {
  kind: WriterKind | null;
  institution: string | null;
  year_or_designation: string | null;
  state: string | null;
  phone: string | null;
  council: string | null;
  registration_no: string | null;
  hasProof: boolean;
}

/**
 * A phone photo of an ID card is 3 to 8 MB; one request to the server carries about 4. Photos are redrawn at most
 * 1600 px wide as a JPEG (about 300 KB, still easily readable). A PDF is sent as it is.
 */
async function shrinkPhoto(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    return blob && blob.size < file.size ? new File([blob], 'id.jpg', { type: 'image/jpeg' }) : file;
  } catch {
    return file; // a format the browser cannot redraw: send it as it is, and let the size check speak
  }
}

export function WelcomeForm({ name, nameLocked, email, initial }: { name: string; nameLocked: boolean; email: string; initial: InitialDetails | null }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [proof, setProof] = useState<File | null>(null);
  const [f, setF] = useState<WriterDetails>({
    name: name === 'Unknown User' ? '' : name,
    kind: initial?.kind ?? 'mbbs_student',
    institution: initial?.institution ?? '',
    year_or_designation: initial?.year_or_designation ?? '',
    state: initial?.state ?? '',
    phone: initial?.phone ?? '',
    council: initial?.council ?? '',
    registration_no: initial?.registration_no ?? '',
    upi_id: '',
    declared_medico: false,
    declared_own_work: false,
  });
  const set = (k: keyof WriterDetails) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((prev) => ({ ...prev, [k]: e.target.value }));

  const student = f.kind === 'mbbs_student';
  const idNeeded = needsIdPhoto(f.kind);
  const required = <span className="text-destructive"> *</span>;
  const optional = <span className="font-normal text-muted-foreground"> (optional)</span>;

  const chooseFile = async (file: File | undefined) => {
    setError(null);
    if (!file) return;
    const ready = await shrinkPhoto(file);
    if (ready.size > PROOF_MAX_BYTES) {
      setError('That file is too large. Please use a photo, or a PDF under 4 MB.');
      return;
    }
    setProof(ready);
  };

  const submit = () =>
    start(async () => {
      setError(null);
      const problem = writerDetailsProblem(f, { given: !!proof, alreadyOnFile: !!initial?.hasProof });
      if (problem) {
        setError(problem);
        return;
      }
      const form = new FormData();
      for (const [key, value] of Object.entries(f)) form.set(key, typeof value === 'boolean' ? (value ? 'yes' : 'no') : value);
      if (proof) form.set('proof', proof);
      const r = await saveWriterDetailsAction(form);
      if (!r.ok) setError(r.error);
      else {
        router.replace('/welcome');
        router.refresh();
      }
    });

  return (
    <form onSubmit={(e) => e.preventDefault()} className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(30,31,34,0.05)]">
      <div className="border-b border-border bg-muted/50 px-5 py-4 sm:px-7">
        <p className="eyebrow">Step 1 of 3</p>
        <h2 className="mt-1 text-2xl font-semibold text-foreground">Your details</h2>
        <p className="field-hint mt-1">
          Four short parts. Fields marked <span className="text-destructive">*</span> are needed. Signed in as {email}.
        </p>
      </div>

      <div className="space-y-7 px-5 py-6 sm:px-7">
        <section className="form-section">
          <h3 className="form-section-title">
            <span className="form-section-number">1</span> About you
          </h3>
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name{nameLocked ? null : required}</Label>
            {nameLocked ? (
              <p className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 font-medium text-foreground">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" /> {name}
              </p>
            ) : (
              <Input id="name" value={f.name} onChange={set('name')} placeholder="As on your college records" autoComplete="name" />
            )}
            <p className="field-hint">
              {nameLocked ? 'To change it, ask from your Profile page.' : 'This is the name printed on your cases and certificates, so write it in full. It can be changed later only by asking us.'}
            </p>
          </div>

          <fieldset>
            <legend className="text-[13.5px] font-semibold text-foreground">I am a{required}</legend>
            <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
              {WRITER_KINDS.map((k) => {
                const on = f.kind === k.value;
                return (
                  <label
                    key={k.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors ${on ? 'border-primary bg-brand-muted ring-1 ring-primary' : 'border-input hover:border-foreground/40'}`}
                  >
                    <input type="radio" name="kind" className="sr-only" checked={on} onChange={() => setF({ ...f, kind: k.value, year_or_designation: '' })} />
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
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="institution">{student || f.kind === 'intern' ? 'Medical college' : 'College or hospital'}{required}</Label>
              <Input id="institution" value={f.institution} onChange={set('institution')} placeholder="e.g. Maulana Azad Medical College, Delhi" />
            </div>
            {student ? (
              <div className="space-y-1.5">
                <Label htmlFor="year">Year of study{required}</Label>
                <select id="year" className="select-field" value={f.year_or_designation} onChange={set('year_or_designation')}>
                  <option value="">Select year</option>
                  {STUDENT_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            ) : f.kind === 'intern' ? null : (
              <div className="space-y-1.5">
                <Label htmlFor="designation">Designation and department{required}</Label>
                <Input
                  id="designation"
                  value={f.year_or_designation}
                  onChange={set('year_or_designation')}
                  placeholder={f.kind === 'faculty' ? 'e.g. Associate Professor, Medicine' : f.kind === 'pg_resident' ? 'e.g. MD Paediatrics, 2nd year' : 'e.g. Medical Officer'}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="state">State{optional}</Label>
              <select id="state" className="select-field" value={f.state} onChange={set('state')}>
                <option value="">Select state</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="form-section">
          <h3 className="form-section-title">
            <span className="form-section-number">2</span> So we can verify you
          </h3>
          <p className="field-hint">
            {idNeeded
              ? 'A clear photo of your college ID card (the side with your name and college). Only our admins see it, and it is deleted as soon as you are verified.'
              : 'Your medical council registration number, or a photo of your registration certificate or hospital ID. One of the two is enough. A photo is seen only by our admins and deleted as soon as you are verified.'}
          </p>

          {!idNeeded && (
            <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="council">Medical council{optional}</Label>
                <Input id="council" value={f.council} onChange={set('council')} placeholder="e.g. Delhi Medical Council" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="registration_no">Registration number</Label>
                <Input id="registration_no" value={f.registration_no} onChange={set('registration_no')} placeholder="e.g. DMC/R/12345" />
              </div>
            </div>
          )}

          <div>
            <p className="text-[13.5px] font-semibold text-foreground">
              {idNeeded ? 'College ID card' : 'Registration certificate or hospital ID'}
              {idNeeded ? required : optional}
            </p>
            <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={(e) => void chooseFile(e.target.files?.[0])} />
            {proof ? (
              <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-primary/40 bg-brand-muted px-3.5 py-3">
                <p className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
                  <FileCheck2 className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">Ready to send ({Math.max(1, Math.round(proof.size / 1024))} KB)</span>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setProof(null);
                    if (fileInput.current) fileInput.current.value = '';
                  }}
                  className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" /> Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-input px-4 py-5 text-sm font-medium text-foreground transition-colors hover:border-primary hover:bg-brand-muted"
              >
                <Upload className="h-4 w-4 text-primary" />
                {initial?.hasProof ? 'We have your photo. Tap to replace it' : 'Take or choose a photo'}
              </button>
            )}
            <p className="field-hint mt-1.5">JPG, PNG or PDF. Cover anything you would rather we did not see, as long as your name and college stay readable.</p>
          </div>
        </section>

        <section className="form-section">
          <h3 className="form-section-title">
            <span className="form-section-number">3</span> Reaching and paying you
          </h3>
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Mobile number{optional}</Label>
              <Input id="phone" type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="e.g. 98765 43210" autoComplete="tel" />
              <p className="field-hint">Only so we can message you about your cases. Never shown to anyone.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="upi_id">UPI ID{optional}</Label>
              <Input id="upi_id" value={f.upi_id} onChange={set('upi_id')} placeholder="e.g. name@okhdfcbank" />
              <p className="field-hint">Where we pay you for published cases. You can add it later.</p>
            </div>
          </div>
        </section>

        <section className="form-section">
          <h3 className="form-section-title">
            <span className="form-section-number">4</span> Two promises
          </h3>
          {(
            [
              ['declared_medico', 'I am a medical student or a doctor, and the details above are true.'],
              ['declared_own_work', 'Every case I submit will be a patient I have seen myself, written in my own words: not copied from a book, a website or another person.'],
            ] as const
          ).map(([key, text]) => (
            <label key={key} className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" checked={f[key]} onChange={(e) => setF((prev) => ({ ...prev, [key]: e.target.checked }))} className="mt-1 h-4 w-4 shrink-0 accent-primary" />
              <span className="text-[15px] leading-snug text-foreground">{text}</span>
            </label>
          ))}
        </section>
      </div>

      <div className="flex flex-col gap-3 border-t border-border bg-muted/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        {error ? (
          <p className="text-sm font-medium text-destructive">{error}</p>
        ) : (
          <p className="field-hint">
            We usually verify people within a day or two. By sending this you agree to the{' '}
            <a href="/terms" target="_blank" rel="noreferrer" className="font-medium text-primary underline-offset-2 hover:underline">
              contributor terms
            </a>
            .
          </p>
        )}
        <Button type="button" size="lg" onClick={submit} disabled={pending} className="shrink-0">
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send for verification
        </Button>
      </div>
    </form>
  );
}
