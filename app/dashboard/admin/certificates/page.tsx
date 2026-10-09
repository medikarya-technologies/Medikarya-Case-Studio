'use client';

// Admin → Certificates: issue an internship certificate by hand, and see every certificate there is (the ones
// contributors and reviewers earn are made automatically). Each has a credential ID, a QR code and a verification
// page on medikarya.in. A certificate can be withdrawn; it is never deleted, and its page then says it was withdrawn.

import { useCallback, useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { Download, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchCertificates, issueInternshipAction, setCertificateRevokedAction } from '@/app/actions/reward-actions';
import { COMPANY_LEGAL_NAME, VERIFY_URL, internshipDetail, internshipProblem, type InternshipInput } from '@/lib/rewards/config';

type Certificate = Awaited<ReturnType<typeof fetchCertificates>>[number];

const KIND: Record<Certificate['kind'], string> = {
  contributor: 'Case contributor',
  reviewer: 'Clinical reviewer',
  advisory_board: 'Advisory board',
  internship: 'Internship',
  workshop: 'Workshop',
};
const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
const EMPTY: InternshipInput = { name: '', role: '', from: '', to: '', summary: '', issuedOn: '' };

function IssueInternship({ onIssued }: { onIssued: (credentialId: string) => void }) {
  const [f, setF] = useState<InternshipInput>(EMPTY);
  const [pending, start] = useTransition();
  const set = (k: keyof InternshipInput) => (e: React.ChangeEvent<HTMLInputElement>) => setF((prev) => ({ ...prev, [k]: e.target.value }));
  const problem = internshipProblem(f);
  const datesIn = /^\d{4}-\d{2}-\d{2}$/.test(f.from) && /^\d{4}-\d{2}-\d{2}$/.test(f.to) && f.to >= f.from;

  const issue = () =>
    start(async () => {
      if (problem) {
        toast.error(problem);
        return;
      }
      const r = await issueInternshipAction(f);
      if (!r.ok) toast.error(r.error);
      else {
        toast.success(`Issued: ${r.credentialId}`);
        setF(EMPTY);
        onIssued(r.credentialId);
      }
    });

  return (
    <form onSubmit={(e) => e.preventDefault()} className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border bg-muted/50 px-5 py-4">
        <p className="eyebrow">Issue by hand</p>
        <h2 className="mt-1 text-xl font-bold text-foreground">Internship certificate</h2>
        <p className="field-hint mt-1">For someone who interned at {COMPANY_LEGAL_NAME}. Check the details: what you type is what the verification page will say.</p>
      </div>

      <div className="grid gap-x-4 gap-y-5 px-5 py-5 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="intern-name">
            Full name <span className="text-destructive">*</span>
          </Label>
          <Input id="intern-name" value={f.name} onChange={set('name')} placeholder="As on their college records" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="intern-role">
            Role <span className="text-destructive">*</span>
          </Label>
          <Input id="intern-role" value={f.role} onChange={set('role')} placeholder="e.g. Developer Intern" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="intern-from">
            First day <span className="text-destructive">*</span>
          </Label>
          <Input id="intern-from" type="date" value={f.from} onChange={set('from')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="intern-to">
            Last day <span className="text-destructive">*</span>
          </Label>
          <Input id="intern-to" type="date" value={f.to} onChange={set('to')} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="intern-summary">
            What they worked on <span className="font-normal text-muted-foreground">(optional, one sentence)</span>
          </Label>
          <Input id="intern-summary" value={f.summary} onChange={set('summary')} placeholder="e.g. Built and developed MediKarya's Case Studio" maxLength={300} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="intern-issued">
            Date on the certificate <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input id="intern-issued" type="date" value={f.issuedOn} onChange={set('issuedOn')} />
          <p className="field-hint">Today, if left empty.</p>
        </div>
      </div>

      {datesIn && f.name.trim() && f.role.trim() && (
        <div className="mx-5 mb-5 rounded-lg border border-border bg-muted/40 p-4 text-sm">
          <p className="field-name">The verification page will say</p>
          <p className="mt-1.5 text-foreground">
            <span className="font-semibold">{f.name.trim()}</span> · {f.role.trim()}
          </p>
          <p className="mt-0.5 text-muted-foreground">{internshipDetail(f)}</p>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-border bg-muted/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="field-hint">It gets the next credential ID. You can withdraw it later, but not edit it: to correct one, withdraw it and issue another.</p>
        <Button type="button" size="lg" disabled={pending} onClick={issue} className="shrink-0">
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Issue certificate
        </Button>
      </div>
    </form>
  );
}

function CertificateRow({ c, highlight, onChanged }: { c: Certificate; highlight: boolean; onChanged: () => void }) {
  const [pending, start] = useTransition();
  const toggle = () => {
    if (!c.revoked && !window.confirm(`Withdraw ${c.credential_id} (${c.recipient_name})? Its verification page will say it has been withdrawn.`)) return;
    start(async () => {
      const r = await setCertificateRevokedAction(c.id, !c.revoked);
      if (!r.ok) toast.error(r.error);
      else {
        toast.success(c.revoked ? 'Restored: it is valid again.' : 'Withdrawn.');
        onChanged();
      }
    });
  };

  return (
    <li className={`px-4 py-3.5 ${highlight ? 'bg-brand-muted/60' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-foreground">
            {c.recipient_name} <span className="font-normal text-muted-foreground">· {c.title}</span>
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">{c.detail}</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            <span className="font-mono font-semibold text-foreground">{c.credential_id}</span> · {KIND[c.kind]} · issued {day(c.issued_at)}
            {c.revoked && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">Withdrawn</span>}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <a href={`/certificate/${c.credential_id}/qr`} download>
            <Button variant="outline" size="sm">
              <Download className="mr-1.5 h-3.5 w-3.5" /> QR code
            </Button>
          </a>
          <Link href={`/certificate/${c.credential_id}`} target="_blank">
            <Button variant="outline" size="sm">
              Certificate
            </Button>
          </Link>
          <a href={`${VERIFY_URL}/${c.credential_id}`} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm">
              Verify page <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </a>
          <Button variant="ghost" size="sm" disabled={pending} onClick={toggle} className={c.revoked ? 'text-primary' : 'text-destructive hover:text-destructive'}>
            {c.revoked ? 'Restore' : 'Withdraw'}
          </Button>
        </div>
      </div>
    </li>
  );
}

export default function CertificatesAdminPage() {
  const [certificates, setCertificates] = useState<Certificate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justIssued, setJustIssued] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setCertificates(await fetchCertificates());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load certificates. Has migration 011 been run?');
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Certificates</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Contributor and reviewer certificates are made automatically when someone reaches a title. Internship certificates are issued here. Every one can
          be checked by scanning its QR code.
        </p>
      </div>

      <div className="max-w-2xl">
        <IssueInternship
          onIssued={(id) => {
            setJustIssued(id);
            void load();
          }}
        />
      </div>

      {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {!certificates && !error && <Skeleton className="h-32 w-full rounded-xl" />}

      {certificates && (
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">All certificates ({certificates.length})</h2>
          <p className="text-sm text-muted-foreground">
            &quot;QR code&quot; downloads a picture to place on a certificate you designed yourself. &quot;Certificate&quot; opens the ready-made one to print or save as PDF.
          </p>
          {certificates.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">No certificates yet.</p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {certificates.map((c) => (
                <CertificateRow key={c.id} c={c} highlight={c.credential_id === justIssued} onChanged={load} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
