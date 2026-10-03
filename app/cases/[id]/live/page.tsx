'use client';

// The live course of a case (lib/live-plan.ts), written by a resident, doctor or faculty member: what happens to this
// patient minute by minute if nothing is done, what each treatment does, what stops it, and where the patient
// settles. MediKarya turns it into a live case (a clock, a tray, a patient who changes) once a senior clinician has
// signed it off.

import { use, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { BackButton } from '@/components/ui/BackButton';
import { fetchLiveCourse, removeLiveCourseAction, saveLiveCourseAction } from '@/app/actions/live-actions';
import {
  CONSCIOUSNESS,
  GROUPS,
  RHYTHMS,
  ROLES,
  STABILITY,
  VITAL_KEYS,
  VITAL_LABEL,
  livePlanProblems,
  livePlanWarnings,
  slugify,
  type LivePlan,
  type LiveVitals,
  type VitalKey,
} from '@/lib/live-plan';

// ── The form keeps numbers as typed text; they become numbers when it is saved. ──

type Num = string;
type VitalsDraft = Record<VitalKey, Num>;
const noVitals = (): VitalsDraft => ({ hr: '', sbp: '', dbp: '', spo2: '', rr: '', temp: '' });

interface StageDraft {
  key: number;
  name: string;
  at: Num;
  vitals: VitalsDraft;
  rhythm: string;
  consciousness: string;
  stability: string;
  nurse: string;
}
interface TreatmentDraft {
  key: number;
  label: string;
  detail: string;
  group: string;
  role: 'essential' | 'supportive' | 'harmful';
  within: Num;
  effect: VitalsDraft;
  says: string;
  why: string;
  stops: boolean;
}
interface Draft {
  summary: string;
  setting: string;
  window: Num;
  limit: Num;
  arrivalConsciousness: string;
  arrivalStability: string;
  stages: StageDraft[];
  treatments: TreatmentDraft[];
  recoveryAfter: Num;
  recoveryVitals: VitalsDraft;
  recoveryConsciousness: string;
  recoveryNurse: string;
  basis: string;
}

let nextKey = 1;
const stage = (): StageDraft => ({ key: nextKey++, name: '', at: '', vitals: noVitals(), rhythm: '', consciousness: '', stability: '', nurse: '' });
const treatment = (role: TreatmentDraft['role'] = 'essential'): TreatmentDraft => ({
  key: nextKey++,
  label: '',
  detail: '',
  group: 'medications',
  role,
  within: '',
  effect: noVitals(),
  says: '',
  why: '',
  stops: false,
});

const num = (s: Num) => (s.trim() === '' ? undefined : Number(s));
const vitalsOf = (d: VitalsDraft): LiveVitals => {
  const out: LiveVitals = {};
  for (const k of VITAL_KEYS) {
    const n = num(d[k]);
    if (n !== undefined && Number.isFinite(n)) out[k] = n;
  }
  return out;
};
const draftVitals = (v: LiveVitals | undefined): VitalsDraft => {
  const d = noVitals();
  for (const k of VITAL_KEYS) if (v?.[k] !== undefined) d[k] = String(v[k]);
  return d;
};

function fromPlan(p: LivePlan | null): Draft {
  if (!p) {
    return {
      summary: '',
      setting: '',
      window: '',
      limit: '20',
      arrivalConsciousness: '',
      arrivalStability: 'unstable',
      stages: [stage(), stage(), stage()],
      treatments: [treatment('essential'), treatment('supportive'), treatment('harmful')],
      recoveryAfter: '3',
      recoveryVitals: noVitals(),
      recoveryConsciousness: 'alert',
      recoveryNurse: '',
      basis: '',
    };
  }
  return {
    summary: p.summary,
    setting: p.setting ?? '',
    window: String(p.critical_window_minutes),
    limit: String(p.time_limit_minutes),
    arrivalConsciousness: p.arrival?.consciousness ?? '',
    arrivalStability: p.arrival?.stability ?? '',
    stages: p.stages.map((s) => ({ key: nextKey++, name: s.name, at: String(s.at_minutes), vitals: draftVitals(s.vitals), rhythm: s.rhythm ?? '', consciousness: s.consciousness ?? '', stability: s.stability ?? '', nurse: s.nurse_says })),
    treatments: p.treatments.map((t) => ({
      key: nextKey++,
      label: t.label,
      detail: t.detail,
      group: t.group,
      role: t.role,
      within: t.within_minutes !== undefined ? String(t.within_minutes) : '',
      effect: draftVitals(t.effect),
      says: t.says,
      why: t.why ?? '',
      stops: p.stabilised_by.includes(t.id),
    })),
    recoveryAfter: String(p.recovery.after_minutes),
    recoveryVitals: draftVitals(p.recovery.vitals),
    recoveryConsciousness: p.recovery.consciousness ?? 'alert',
    recoveryNurse: p.recovery.nurse_says,
    basis: (p.basis ?? []).join('\n'),
  };
}

function toPlan(d: Draft): LivePlan {
  const treatments = d.treatments.map((t) => {
    const effect = vitalsOf(t.effect);
    return {
      id: slugify(t.label),
      label: t.label.trim(),
      detail: t.detail.trim(),
      group: t.group,
      role: t.role,
      ...(t.role === 'essential' && num(t.within) !== undefined ? { within_minutes: num(t.within) } : {}),
      ...(Object.keys(effect).length > 0 ? { effect } : {}),
      says: t.says.trim(),
      ...(t.why.trim() ? { why: t.why.trim() } : {}),
    };
  });
  return {
    version: 1,
    origin: 'author',
    status: 'proposed',
    summary: d.summary.trim(),
    ...(d.setting.trim() ? { setting: d.setting.trim() } : {}),
    critical_window_minutes: num(d.window) ?? NaN,
    time_limit_minutes: num(d.limit) ?? NaN,
    arrival: {
      ...(d.arrivalConsciousness ? { consciousness: d.arrivalConsciousness } : {}),
      ...(d.arrivalStability ? { stability: d.arrivalStability } : {}),
    },
    stages: d.stages.map((s, i) => ({
      id: `${slugify(s.name || `step_${i + 1}`)}_${i + 1}`,
      name: s.name.trim(),
      at_minutes: num(s.at) ?? NaN,
      vitals: vitalsOf(s.vitals),
      ...(s.rhythm ? { rhythm: s.rhythm } : {}),
      ...(s.consciousness ? { consciousness: s.consciousness } : {}),
      ...(s.stability ? { stability: s.stability } : {}),
      nurse_says: s.nurse.trim(),
    })),
    treatments,
    stabilised_by: d.treatments.filter((t) => t.stops).map((t) => slugify(t.label)),
    recovery: {
      after_minutes: num(d.recoveryAfter) ?? NaN,
      vitals: vitalsOf(d.recoveryVitals),
      ...(d.recoveryConsciousness ? { consciousness: d.recoveryConsciousness } : {}),
      nurse_says: d.recoveryNurse.trim(),
    },
    ...(d.basis.trim() ? { basis: d.basis.split('\n').map((b) => b.trim()).filter(Boolean) } : {}),
  };
}

// ── Small pieces ──

const required = <span className="text-destructive"> *</span>;
const optional = <span className="font-normal text-muted-foreground"> (optional)</span>;

function Select({ value, onChange, options, empty, id }: { value: string; onChange: (v: string) => void; options: ReadonlyArray<{ value: string; label: string }>; empty?: string; id?: string }) {
  return (
    <select id={id} className="select-field" value={value} onChange={(e) => onChange(e.target.value)}>
      {empty !== undefined && <option value="">{empty}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
const words = (list: readonly string[]) => list.map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));

function VitalsRow({ value, onChange, change = false }: { value: VitalsDraft; onChange: (v: VitalsDraft) => void; change?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {VITAL_KEYS.map((k) => (
        <label key={k} className="block">
          <span className="text-[12px] font-semibold text-muted-foreground">
            {VITAL_LABEL[k]}
            {change ? ' ±' : ''}
          </span>
          <Input inputMode="decimal" value={value[k]} onChange={(e) => onChange({ ...value, [k]: e.target.value })} placeholder={change ? '0' : '—'} className="h-10 px-2.5 text-[15px]" />
        </label>
      ))}
    </div>
  );
}

export default function LiveCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loaded, setLoaded] = useState<Awaited<ReturnType<typeof fetchLiveCourse>> | undefined>(undefined);
  const [d, setD] = useState<Draft | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [pending, start] = useTransition();

  useEffect(() => {
    fetchLiveCourse(id)
      .then((r) => {
        setLoaded(r);
        if (r) setD(fromPlan(r.plan));
      })
      .catch(() => setLoaded(null));
  }, [id]);

  const warnings = useMemo(() => (d ? livePlanWarnings(toPlan(d)) : []), [d]);

  if (loaded === undefined) return <Skeleton className="mx-auto mt-10 h-96 max-w-4xl" />;
  if (loaded === null || !d) return <p className="mx-auto mt-10 max-w-4xl text-muted-foreground">Case not found.</p>;

  const readOnly = !loaded.canWrite || !loaded.canEdit;
  const v = loaded.vitals;
  const arrivalNote = [v.pulse && `pulse ${v.pulse}`, v.bp && `BP ${v.bp}`, v.rr && `RR ${v.rr}`, v.temp && `temperature ${v.temp}`].filter(Boolean).join(', ');
  const set = (patch: Partial<Draft>) => setD({ ...d, ...patch });
  const setStage = (i: number, patch: Partial<StageDraft>) => set({ stages: d.stages.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const setTreatment = (i: number, patch: Partial<TreatmentDraft>) => set({ treatments: d.treatments.map((t, j) => (j === i ? { ...t, ...patch } : t)) });

  const save = () =>
    start(async () => {
      const plan = toPlan(d);
      const found = livePlanProblems(plan);
      setProblems(found);
      if (found.length > 0) {
        toast.error('Some parts need fixing first. They are listed at the bottom.');
        return;
      }
      const r = await saveLiveCourseAction(id, plan);
      if (!r.ok) {
        setProblems(r.problems ?? [r.error]);
        toast.error(r.error);
      } else {
        toast.success('Live course saved.');
        router.push(`/cases/${id}`);
      }
    });

  const remove = () => {
    if (!window.confirm('Remove the live course from this case?')) return;
    start(async () => {
      const r = await removeLiveCourseAction(id);
      if (!r.ok) toast.error(r.error);
      else {
        toast.success('Live course removed.');
        router.push(`/cases/${id}`);
      }
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:py-8">
      <BackButton href={`/cases/${id}`} label="Back to the case" />
      <div>
        <p className="eyebrow">Live course</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">{loaded.title}</h1>
        <p className="mt-2 max-w-3xl text-[15.5px] leading-relaxed text-muted-foreground">
          In the live version of this case a clock runs and the patient gets worse until the right treatments are given. Write what happens to
          this patient if nothing is done, what each treatment does, what stops it, and where they settle. A senior clinician checks it before
          students meet it, and you are credited for it.
        </p>
      </div>

      {!loaded.canWrite && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          Live courses are written by PG residents, practising doctors and faculty. You can read this one, but not change it.
        </p>
      )}
      {loaded.canWrite && !loaded.canEdit && (
        <p className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">This case is with a reviewer, so its live course cannot be changed now.</p>
      )}

      <fieldset disabled={readOnly || pending} className="space-y-6">
        {/* 1. Overview */}
        <section className="form-section rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="form-section-title">
            <span className="form-section-number">1</span> The patient, untreated
          </h2>
          <div className="space-y-1.5">
            <Label htmlFor="summary">What happens if nothing is done{required}</Label>
            <Textarea id="summary" value={d.summary} onChange={(e) => set({ summary: e.target.value })} placeholder="e.g. Untreated, this child goes from compensated to decompensated hypovolaemic shock within a quarter of an hour." rows={3} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="setting">Where{optional}</Label>
              <Input id="setting" value={d.setting} onChange={(e) => set({ setting: e.target.value })} placeholder="e.g. Paediatric emergency" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="window">Decisive treatment due by (min){required}</Label>
                <Input id="window" inputMode="numeric" value={d.window} onChange={(e) => set({ window: e.target.value })} placeholder="8" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="limit">Encounter ends at (min){required}</Label>
                <Input id="limit" inputMode="numeric" value={d.limit} onChange={(e) => set({ limit: e.target.value })} placeholder="20" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="arr-c">On arrival, the patient is</Label>
              <Select id="arr-c" value={d.arrivalConsciousness} onChange={(v) => set({ arrivalConsciousness: v })} options={words(CONSCIOUSNESS)} empty="As in the case sheet" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="arr-s">Stability on arrival</Label>
              <Select id="arr-s" value={d.arrivalStability} onChange={(v) => set({ arrivalStability: v })} options={words(STABILITY.slice(0, 3))} empty="As in the case sheet" />
            </div>
          </div>
          <p className="field-hint">
            The vitals on arrival are the ones in your case sheet
            {arrivalNote ? `: ${arrivalNote}` : ''}. The first step below starts from them.
          </p>
        </section>

        {/* 2. Untreated course */}
        <section className="form-section rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="form-section-title">
            <span className="form-section-number">2</span> If nothing is done: step by step
          </h2>
          <p className="field-hint">Two to six steps, in order. Write the monitor at that minute if untreated; leave a vital empty if it has not changed.</p>
          <ol className="space-y-4">
            {d.stages.map((s, i) => (
              <li key={s.key} className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-2 text-sm font-bold text-muted-foreground">{i + 1}.</span>
                  <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_120px]">
                    <Input value={s.name} onChange={(e) => setStage(i, { name: e.target.value })} placeholder="What a clinician would call it, e.g. Compensated shock" aria-label="Step name" />
                    <Input inputMode="numeric" value={s.at} onChange={(e) => setStage(i, { at: e.target.value })} placeholder="At minute" aria-label="At minute" />
                  </div>
                  {d.stages.length > 2 && (
                    <button type="button" onClick={() => set({ stages: d.stages.filter((_, j) => j !== i) })} className="mt-2 text-muted-foreground hover:text-destructive" aria-label="Remove step">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <VitalsRow value={s.vitals} onChange={(v) => setStage(i, { vitals: v })} />
                <div className="grid gap-3 sm:grid-cols-3">
                  <Select value={s.consciousness} onChange={(v) => setStage(i, { consciousness: v })} options={words(CONSCIOUSNESS)} empty="Consciousness unchanged" />
                  <Select value={s.stability} onChange={(v) => setStage(i, { stability: v })} options={words(STABILITY)} empty="Stability unchanged" />
                  <Select value={s.rhythm} onChange={(v) => setStage(i, { rhythm: v })} options={RHYTHMS} empty="Rhythm unchanged" />
                </div>
                <Input value={s.nurse} onChange={(e) => setStage(i, { nurse: e.target.value })} placeholder='What the nurse says, e.g. "Doctor, he is getting sleepy and his pulse is {hr}."' aria-label="What the nurse says" />
              </li>
            ))}
          </ol>
          {d.stages.length < 6 && (
            <Button type="button" variant="outline" size="sm" onClick={() => set({ stages: [...d.stages, stage()] })}>
              <Plus className="mr-1.5 h-4 w-4" /> Add a step
            </Button>
          )}
          <p className="field-hint">In what the nurse says, {'{hr}'}, {'{bp}'}, {'{spo2}'} and {'{rr}'} become the monitor&apos;s own numbers at that moment.</p>
        </section>

        {/* 3. Treatments */}
        <section className="form-section rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="form-section-title">
            <span className="form-section-number">3</span> What the student can give
          </h2>
          <p className="field-hint">
            Everything on the tray for this patient: the essential treatments, reasonable extras, and at least one harmful option a student might reach for, so the
            tray does not give the answer away. Write each one&apos;s effect as a change on the monitor (e.g. systolic +10), not the new value.
          </p>
          <ol className="space-y-4">
            {d.treatments.map((t, i) => (
              <li key={t.key} className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid flex-1 gap-3 sm:grid-cols-2">
                    <Input value={t.label} onChange={(e) => setTreatment(i, { label: e.target.value })} placeholder="Name, e.g. IV fluid bolus" aria-label="Treatment name" />
                    <Input value={t.detail} onChange={(e) => setTreatment(i, { detail: e.target.value })} placeholder="Dose, route and rate, e.g. 20 mL/kg RL over 15 min" aria-label="Dose" />
                  </div>
                  {d.treatments.length > 1 && (
                    <button type="button" onClick={() => set({ treatments: d.treatments.filter((_, j) => j !== i) })} className="mt-2 text-muted-foreground hover:text-destructive" aria-label="Remove treatment">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Select value={t.role} onChange={(v) => setTreatment(i, { role: v as TreatmentDraft['role'], stops: v === 'essential' ? t.stops : false })} options={ROLES.map((r) => ({ value: r.value, label: `${r.label}: ${r.hint}` }))} />
                  <Select value={t.group} onChange={(v) => setTreatment(i, { group: v })} options={GROUPS} />
                  {t.role === 'essential' ? (
                    <Input inputMode="numeric" value={t.within} onChange={(e) => setTreatment(i, { within: e.target.value })} placeholder="Give within (minutes)" aria-label="Give within minutes" />
                  ) : (
                    <span />
                  )}
                </div>
                <VitalsRow value={t.effect} onChange={(v) => setTreatment(i, { effect: v })} change />
                <Input value={t.says} onChange={(e) => setTreatment(i, { says: e.target.value })} placeholder="What the student sees when they give it" aria-label="What the student sees" />
                <Input value={t.why} onChange={(e) => setTreatment(i, { why: e.target.value })} placeholder="Why it is essential, or why it harms this patient (for the debrief)" aria-label="Why" />
                {t.role === 'essential' && (
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input type="checkbox" className="h-4 w-4 accent-primary" checked={t.stops} onChange={(e) => setTreatment(i, { stops: e.target.checked })} />
                    Stops the deterioration (once every ticked treatment has been given)
                  </label>
                )}
              </li>
            ))}
          </ol>
          {d.treatments.length < 14 && (
            <Button type="button" variant="outline" size="sm" onClick={() => set({ treatments: [...d.treatments, treatment('supportive')] })}>
              <Plus className="mr-1.5 h-4 w-4" /> Add a treatment
            </Button>
          )}
        </section>

        {/* 4. Recovery */}
        <section className="form-section rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="form-section-title">
            <span className="form-section-number">4</span> Where the patient settles
          </h2>
          <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
            <div className="space-y-1.5">
              <Label htmlFor="rec-after">Minutes after treatment{required}</Label>
              <Input id="rec-after" inputMode="numeric" value={d.recoveryAfter} onChange={(e) => set({ recoveryAfter: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec-c">Then the patient is</Label>
              <Select id="rec-c" value={d.recoveryConsciousness} onChange={(v) => set({ recoveryConsciousness: v })} options={words(CONSCIOUSNESS)} />
            </div>
          </div>
          <VitalsRow value={d.recoveryVitals} onChange={(v) => set({ recoveryVitals: v })} />
          <Input value={d.recoveryNurse} onChange={(e) => set({ recoveryNurse: e.target.value })} placeholder='What the nurse says, e.g. "He is waking up. Pulse {hr}, BP {bp}."' aria-label="What the nurse says on recovery" />
        </section>

        {/* 5. Basis */}
        <section className="form-section rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="form-section-title">
            <span className="form-section-number">5</span> What this rests on{optional}
          </h2>
          <Textarea value={d.basis} onChange={(e) => set({ basis: e.target.value })} rows={4} placeholder={'One line each: the guideline or textbook behind the timings and doses, the weight you assumed for a child, anything you are unsure of.'} />
          <p className="field-hint">The clinician who signs it off reads this first.</p>
        </section>
      </fieldset>

      {(problems.length > 0 || warnings.length > 0) && (
        <div className="space-y-2">
          {problems.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <p className="font-semibold">To fix before saving:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}
          {warnings.length > 0 && (
            <ul className="list-disc space-y-0.5 rounded-lg border border-amber-300 bg-amber-50 p-4 pl-9 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          {loaded.plan ? (
            <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" disabled={pending} onClick={remove}>
              <Trash2 className="mr-1.5 h-4 w-4" /> Remove the live course
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" size="lg" disabled={pending} onClick={save}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save the live course
          </Button>
        </div>
      )}
    </div>
  );
}
