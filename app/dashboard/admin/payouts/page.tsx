'use client';

// Admin → Payouts: what is owed for published cases and for reviews, person by person, with their UPI id. Pay them by
// UPI yourself, then mark them paid here with the transaction reference. Nothing is ever recorded twice (each payout
// has one reason), and the list brings itself up to date when the page opens.

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchPayouts, markPaidAction, voidPayoutAction } from '@/app/actions/reward-actions';
import { CASE_PAYOUTS_PER_MONTH, REVIEW_PAY, rupees } from '@/lib/rewards/config';

type Data = Awaited<ReturnType<typeof fetchPayouts>>;
type Row = Data['payouts'][number];

/** A review decided faster than this after claiming is pointed out before you pay for it. */
const QUICK_REVIEW_MINUTES = 3;

const KIND: Record<string, string> = { case_published: 'Published case', review: 'Review', re_review: 'Re-review' };
const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function PayeeCard({ name, rows, onPaid }: { name: string; rows: Row[]; onPaid: () => void }) {
  const [ref, setRef] = useState('');
  const [pending, start] = useTransition();
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const upi = rows.find((r) => r.upi_id)?.upi_id;
  const email = rows.find((r) => r.email)?.email;

  const dontPay = (row: Row) => {
    const reason = window.prompt(`Why will ${rupees(row.amount)} for "${row.case_title ?? 'this case'}" not be paid? (It is kept in History with this reason.)`);
    if (!reason?.trim()) return;
    start(async () => {
      const r = await voidPayoutAction(row.id, reason);
      if (!r.ok) toast.error(r.error);
      else {
        toast.success('Marked as not to be paid.');
        onPaid();
      }
    });
  };

  const pay = () =>
    start(async () => {
      const r = await markPaidAction(rows.map((x) => x.id), ref);
      if (!r.ok) toast.error(r.error);
      else {
        toast.success(`Marked ${rupees(total)} to ${name} as paid.`);
        onPaid();
      }
    });

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-foreground">{name}</p>
          <p className="text-sm text-muted-foreground">
            {email ?? 'No account (submitted by PDF)'} · UPI: <span className="font-mono">{upi ?? 'not given'}</span>
          </p>
        </div>
        <p className="text-2xl font-bold text-foreground">{rupees(total)}</p>
      </div>
      <ul className="mt-3 divide-y divide-border text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 py-1.5">
            <span className="text-muted-foreground">
              {KIND[r.kind]} · {r.case_title ?? 'case removed'} · {day(r.earned_at)}
              {r.review_minutes !== null && (
                <span className={r.review_minutes < QUICK_REVIEW_MINUTES ? 'font-semibold text-amber-700' : ''}>
                  {' '}
                  · decided {r.review_minutes} min after claiming{r.review_minutes < QUICK_REVIEW_MINUTES ? ' (very quick: check it was really read)' : ''}
                </span>
              )}
              {r.same_person && <span className="block font-semibold text-destructive">Possible self-review: {r.same_person}.</span>}
            </span>
            <span className="flex shrink-0 items-center gap-3">
              <button type="button" disabled={pending} onClick={() => dontPay(r)} className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-destructive hover:underline">
                Don&apos;t pay
              </button>
              <span className="font-medium text-foreground">{rupees(r.amount)}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="UPI transaction reference (after you pay)" className="sm:flex-1" />
        <Button disabled={pending} onClick={pay}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Mark {rupees(total)} paid
        </Button>
      </div>
    </div>
  );
}

function downloadCsv(rows: Row[]) {
  const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [
    ['Payee', 'Email', 'UPI', 'For', 'Case', 'Amount', 'Status', 'Earned', 'Paid', 'Reference', 'Note'].join(','),
    ...rows.map((r) => [r.payee_name, r.email, r.upi_id, KIND[r.kind], r.case_title, r.amount, r.status, r.earned_at, r.paid_at, r.paid_ref, r.note].map(cell).join(',')),
  ];
  // The BOM makes Excel read the file as UTF-8 (names).
  const url = URL.createObjectURL(new Blob(['﻿', lines.join('\n')], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `medikarya-payouts-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PayoutsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [certificates, setCertificates] = useState<Data['certificates']>([]);
  const [waiting, setWaiting] = useState<Data['waiting']>([]);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const data = await fetchPayouts();
      setRows(data.payouts);
      setCertificates(data.certificates);
      setWaiting(data.waiting);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load payouts. Has migration 011 been run?');
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const owed = useMemo(() => {
    const groups = new Map<string, Row[]>();
    for (const r of rows ?? []) {
      if (r.status !== 'owed' || r.amount <= 0) continue;
      const key = r.user_id ?? `name:${r.payee_name}`;
      groups.set(key, [...(groups.get(key) ?? []), r]);
    }
    return [...groups.values()];
  }, [rows]);
  const totalOwed = owed.flat().reduce((s, r) => s + r.amount, 0);
  const month = new Date().toISOString().slice(0, 7);
  const paidThisMonth = (rows ?? []).filter((r) => r.status === 'paid' && r.paid_at?.startsWith(month)).reduce((s, r) => s + r.amount, 0);
  const history = (rows ?? []).filter((r) => r.status !== 'owed' || r.amount === 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payouts</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            {rupees(REVIEW_PAY.first)} for a case&apos;s first review and {rupees(REVIEW_PAY.reReview)} to a different reviewer who re-reviews it (nothing more for following
            up your own review). A review becomes payable once you act on it: an approval when you publish the case, a request for changes when you
            rebuild the case with it. ₹100 to ₹150 for a published case, for the first {CASE_PAYOUTS_PER_MONTH} published each month. Pay by UPI, then
            mark it paid here.
          </p>
        </div>
        {rows && rows.length > 0 && (
          <Button variant="outline" onClick={() => downloadCsv(rows)}>
            <Download className="mr-2 h-4 w-4" /> Download spreadsheet
          </Button>
        )}
      </div>

      {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {!rows && !error && <Skeleton className="h-40 w-full rounded-xl" />}

      {rows && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">Owed now</p>
              <p className="text-2xl font-bold text-foreground">{rupees(totalOwed)}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">People to pay</p>
              <p className="text-2xl font-bold text-foreground">{owed.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">Paid this month</p>
              <p className="text-2xl font-bold text-foreground">{rupees(paidThisMonth)}</p>
            </div>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">To pay</h2>
            {owed.length === 0 && <p className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">Nothing owed right now.</p>}
            {owed.map((group) => (
              <PayeeCard key={group[0].user_id ?? group[0].payee_name} name={group[0].payee_name} rows={group} onPaid={load} />
            ))}
          </section>

          {waiting.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">
                Not payable yet ({rupees(waiting.reduce((sum, w) => sum + w.pay.amount, 0))})
              </h2>
              <p className="text-sm text-muted-foreground">Reviews that are done but that you have not acted on. Nothing is owed for these until you do.</p>
              <ul className="divide-y divide-border rounded-xl border border-border bg-card text-sm">
                {waiting.map((w) => (
                  <li key={w.reviewId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                    <span className="text-foreground">
                      <span className="font-medium">{w.reviewerName}</span>{' '}
                      <span className="text-muted-foreground">
                        {w.decision === 'approved' ? 'approved' : 'asked for changes on'} {w.caseTitle} · {day(w.decidedAt)} · waiting for {w.waitingFor}
                      </span>
                      {w.samePerson && <span className="block font-semibold text-destructive">Possible self-review: {w.samePerson}. Look closely before you publish.</span>}
                    </span>
                    <span className="font-medium text-muted-foreground">{rupees(w.pay.amount)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {history.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">History</h2>
              <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 font-medium">Payee</th>
                      <th className="px-4 py-2 font-medium">For</th>
                      <th className="px-4 py-2 font-medium">Amount</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 font-medium">Reference / note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {history.map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-2 text-foreground">{r.payee_name}</td>
                        <td className="px-4 py-2 text-muted-foreground">{KIND[r.kind]} · {r.case_title ?? 'case removed'}</td>
                        <td className="px-4 py-2">{rupees(r.amount)}</td>
                        <td className="px-4 py-2">{r.status === 'paid' ? `Paid ${day(r.paid_at!)}` : 'Not paid'}</td>
                        <td className="px-4 py-2 text-muted-foreground">{r.paid_ref ?? r.note ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">Certificates issued ({certificates.length})</h2>
            <p className="text-sm text-muted-foreground">
              One for each title someone reaches, made automatically. People with an account see theirs on their dashboard; for an author without one, open
              it here and send them the PDF.
            </p>
            {certificates.length > 0 && (
              <ul className="divide-y divide-border rounded-xl border border-border bg-card text-sm">
                {certificates.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                    <span className="text-foreground">
                      <span className="font-medium">{c.recipient_name}</span> · {c.title} <span className="text-muted-foreground">· {day(c.issued_at)}</span>
                    </span>
                    <Link href={`/certificate/${c.credential_id}`} target="_blank" className="font-mono font-medium text-primary hover:underline">
                      {c.credential_id}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
