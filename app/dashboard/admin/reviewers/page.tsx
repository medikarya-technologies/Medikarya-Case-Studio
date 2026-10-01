'use client';

// Admin → Reviewers: applications from /join/reviewer. Verify each one (registration number on the NMC's public
// Indian Medical Register, institution, LinkedIn), then approve with the specialties they may review, or reject
// with a note they will see.

import { useCallback, useEffect, useState, useTransition } from 'react';
import { ExternalLink, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { decideReviewerApplication, fetchReviewerApplications } from '@/app/actions/reviewer-actions';
import { KIND_LABEL, type ApplicationWithUser } from '@/lib/reviewers/shared';
import { REVIEW_SPECIALTIES, specialtyLabel } from '@/lib/reviewers/specialties';

const IMR_SEARCH = 'https://www.nmc.org.in/information-desk/indian-medical-register';

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-sky-100 text-sky-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
};

function ApplicationCard({ a, onDone }: { a: ApplicationWithUser; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [chosen, setChosen] = useState<string[]>(a.status === 'approved' ? a.approved_specialties : a.specialties);
  const [note, setNote] = useState(a.admin_note ?? '');
  const toggle = (s: string) => setChosen(chosen.includes(s) ? chosen.filter((x) => x !== s) : [...chosen, s]);

  const decide = (approve: boolean) =>
    start(async () => {
      const r = await decideReviewerApplication(a.user_id, approve, chosen, note);
      if (!r.ok) toast.error(r.error);
      else {
        toast.success(approve ? `${a.name} is now a reviewer.` : 'Application rejected.');
        onDone();
      }
    });

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-foreground">{a.name}</p>
          <p className="text-sm text-muted-foreground">{a.email}</p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[a.status]}`}>{a.status}</span>
      </div>

      <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div><dt className="inline text-muted-foreground">Role: </dt><dd className="inline">{KIND_LABEL[a.kind]}{a.designation ? `, ${a.designation}` : ''}</dd></div>
        <div><dt className="inline text-muted-foreground">Department: </dt><dd className="inline">{a.department ?? '—'}</dd></div>
        <div className="sm:col-span-2"><dt className="inline text-muted-foreground">Institution: </dt><dd className="inline">{a.institution}</dd></div>
        <div><dt className="inline text-muted-foreground">Council: </dt><dd className="inline">{a.council ?? '—'}</dd></div>
        <div><dt className="inline text-muted-foreground">Registration no.: </dt><dd className="inline font-mono">{a.registration_no ?? '—'}</dd></div>
        <div><dt className="inline text-muted-foreground">UPI: </dt><dd className="inline">{a.upi_id ?? '—'}</dd></div>
        <div><dt className="inline text-muted-foreground">Applied: </dt><dd className="inline">{new Date(a.created_at).toLocaleDateString('en-IN')}</dd></div>
      </dl>

      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <a href={IMR_SEARCH} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
          <ShieldCheck className="h-4 w-4" /> Check the registration on the Indian Medical Register <ExternalLink className="h-3 w-3" />
        </a>
        {a.linkedin_url && (
          <a href={a.linkedin_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
            LinkedIn <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      <div className="mt-4">
        <p className="text-sm font-medium text-foreground">Specialties they may review</p>
        <p className="text-xs text-muted-foreground">Pre-selected with what they asked for. Advanced cases go to faculty only.</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {REVIEW_SPECIALTIES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggle(s)}
              className={`rounded-full border px-2.5 py-0.5 text-xs ${chosen.includes(s) ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:bg-muted'} ${a.specialties.includes(s) ? 'font-semibold' : ''}`}
            >
              {specialtyLabel(s)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (shown to them if you reject, e.g. 'Registration number not found')" className="sm:flex-1" />
        <div className="flex gap-2">
          <Button disabled={pending} onClick={() => decide(true)}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {a.status === 'approved' ? 'Update' : 'Approve'}
          </Button>
          {a.status !== 'rejected' && (
            <Button disabled={pending} variant="outline" onClick={() => decide(false)}>
              Reject
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReviewersAdminPage() {
  const [apps, setApps] = useState<ApplicationWithUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      setApps(await fetchReviewerApplications());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load applications. Has migration 010 been run?');
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const pendingApps = apps?.filter((a) => a.status === 'pending') ?? [];
  const others = apps?.filter((a) => a.status !== 'pending') ?? [];
  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/join/reviewer` : '/join/reviewer';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reviewers</h1>
        <p className="mt-1 text-muted-foreground">
          Applications to review cases for MediKarya. Share this link in your posts: <code className="rounded bg-muted px-1.5 py-0.5">{joinUrl}</code>
        </p>
      </div>
      {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {!apps && !error && <Skeleton className="h-40 w-full rounded-xl" />}
      {apps && (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Waiting for verification ({pendingApps.length})</h2>
            {pendingApps.length === 0 && <p className="text-sm text-muted-foreground">No applications waiting.</p>}
            {pendingApps.map((a) => <ApplicationCard key={a.user_id} a={a} onDone={load} />)}
          </section>
          {others.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">Reviewers and past applications ({others.length})</h2>
              {others.map((a) => <ApplicationCard key={a.user_id} a={a} onDone={load} />)}
            </section>
          )}
        </>
      )}
    </div>
  );
}
