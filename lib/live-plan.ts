// A case's LIVE COURSE, as a resident, doctor or faculty member writes it in the Case Studio (/cases/[id]/live):
// what happens to the patient minute by minute if nothing is done, what each treatment does, what stops the
// deterioration, and where the patient settles. Stored on the case (cases.live_plan, migration 015) and carried into
// MediKarya when the case is converted, as a proposal a senior clinician signs off.
//
// The shape is MediKarya's own (its lib/simulation/live-plan.ts), which also checks it again and turns it into the
// encounter's rules. This copy holds the same shape and the checks a writer needs while filling it in; keep the two
// alike. Safe in the browser.

export const VITAL_KEYS = ['hr', 'sbp', 'dbp', 'spo2', 'rr', 'temp'] as const;
export type VitalKey = (typeof VITAL_KEYS)[number];
export type LiveVitals = Partial<Record<VitalKey, number>>;

export const VITAL_LABEL: Record<VitalKey, string> = { hr: 'HR', sbp: 'Systolic', dbp: 'Diastolic', spo2: 'SpO₂', rr: 'RR', temp: 'Temp' };
const VITAL_NAME: Record<VitalKey, string> = { hr: 'heart rate', sbp: 'systolic BP', dbp: 'diastolic BP', spo2: 'SpO₂', rr: 'respiratory rate', temp: 'temperature' };

export const CONSCIOUSNESS = ['alert', 'anxious', 'drowsy', 'altered', 'unresponsive'] as const;
export const STABILITY = ['stable', 'unstable', 'critical', 'arrest'] as const;
export const RHYTHMS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'sinus_normal', label: 'Sinus rhythm' },
  { value: 'sinus_tachycardia', label: 'Sinus tachycardia' },
  { value: 'sinus_bradycardia', label: 'Sinus bradycardia' },
  { value: 'afib', label: 'Atrial fibrillation' },
  { value: 'flutter', label: 'Atrial flutter' },
  { value: 'complete_heart_block', label: 'Complete heart block' },
  { value: 'pvc_occasional', label: 'Occasional ectopics' },
  { value: 'pvc_frequent', label: 'Frequent ectopics' },
  { value: 'pvc_bigeminy', label: 'Bigeminy' },
  { value: 'vt_sustained', label: 'Ventricular tachycardia' },
  { value: 'vf', label: 'Ventricular fibrillation' },
];
export const GROUPS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'airway', label: 'Airway & breathing' },
  { value: 'circulation', label: 'Circulation' },
  { value: 'medications', label: 'Medications' },
  { value: 'cardiac_procedures', label: 'Cardiac procedures' },
  { value: 'other', label: 'Other' },
];
export const ROLES: ReadonlyArray<{ value: 'essential' | 'supportive' | 'harmful'; label: string; hint: string }> = [
  { value: 'essential', label: 'Essential', hint: 'Must be given, in time' },
  { value: 'supportive', label: 'Reasonable', hint: 'Fine to give, not required' },
  { value: 'harmful', label: 'Harmful', hint: 'Makes this patient worse' },
];

export interface LiveStage {
  id: string;
  name: string;
  at_minutes: number;
  vitals: LiveVitals;
  rhythm?: string;
  consciousness?: string;
  stability?: string;
  nurse_says: string;
}

export interface LiveTreatment {
  id: string;
  label: string;
  detail: string;
  group: string;
  role: 'essential' | 'supportive' | 'harmful';
  within_minutes?: number;
  effect?: LiveVitals;
  rhythm?: string;
  consciousness?: string;
  says: string;
  why?: string;
}

export interface LivePlan {
  version: 1;
  origin: 'author';
  status: 'proposed';
  summary: string;
  setting?: string;
  critical_window_minutes: number;
  time_limit_minutes: number;
  arrival?: { consciousness?: string; stability?: string; vitals?: LiveVitals };
  stages: LiveStage[];
  treatments: LiveTreatment[];
  stabilised_by: string[];
  recovery: { after_minutes: number; vitals: LiveVitals; rhythm?: string; consciousness?: string; nurse_says: string };
  basis?: string[];
  drafted_at?: string;
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) || 'item';

const RANGE: Record<VitalKey, [number, number]> = { hr: [20, 240], sbp: [40, 260], dbp: [20, 160], spo2: [50, 100], rr: [4, 70], temp: [32, 42] };
const MAX_EFFECT: Record<VitalKey, number> = { hr: 80, sbp: 80, dbp: 60, spo2: 30, rr: 30, temp: 3 };

function checkAbsolute(v: LiveVitals, where: string, errors: string[]) {
  for (const k of VITAL_KEYS) {
    const n = v[k];
    if (n === undefined) continue;
    const [lo, hi] = RANGE[k];
    if (n < lo || n > hi) errors.push(`${where}: ${VITAL_NAME[k]} ${n} is outside what a monitor can show (${lo}–${hi}).`);
  }
  if (v.sbp !== undefined && v.dbp !== undefined && v.dbp >= v.sbp) errors.push(`${where}: diastolic BP must be below systolic.`);
  if ((v.sbp === undefined) !== (v.dbp === undefined)) errors.push(`${where}: give both systolic and diastolic BP, or neither.`);
}

/** Everything a writer has to fix before the live course can be saved, in words. Empty when it is complete. */
export function livePlanProblems(p: LivePlan): string[] {
  const errors: string[] = [];
  const ok = (n: number) => Number.isFinite(n);
  if (p.summary.trim().length < 20) errors.push('Summary: say in a sentence or two what happens to this patient if nothing is done.');
  if (!ok(p.time_limit_minutes) || p.time_limit_minutes < 6 || p.time_limit_minutes > 45) errors.push('The encounter has to end between 6 and 45 minutes.');
  if (!ok(p.critical_window_minutes) || p.critical_window_minutes < 2) errors.push('The decisive treatment is due by: at least 2 minutes.');
  else if (ok(p.time_limit_minutes) && p.critical_window_minutes >= p.time_limit_minutes) errors.push('The decisive treatment has to be due before the encounter ends.');

  if (p.stages.length < 2) errors.push('Untreated course: describe at least two steps.');
  if (p.stages.length > 6) errors.push('Untreated course: at most six steps.');
  let last = 0;
  p.stages.forEach((s, i) => {
    const where = `Step ${i + 1}${s.name ? ` (${s.name})` : ''}`;
    if (!s.name.trim()) errors.push(`${where}: give it a name.`);
    if (!ok(s.at_minutes) || s.at_minutes <= last) errors.push(`${where}: its minute must be later than the step before (${last}).`);
    else last = s.at_minutes;
    if (ok(p.time_limit_minutes) && s.at_minutes >= p.time_limit_minutes) errors.push(`${where}: comes after the encounter ends.`);
    if (Object.keys(s.vitals).length === 0 && !s.rhythm && !s.consciousness) errors.push(`${where}: nothing changes. Give the vitals, rhythm or consciousness at this point.`);
    checkAbsolute(s.vitals, where, errors);
    if (s.nurse_says.trim().length < 10) errors.push(`${where}: write what the nurse says when it happens.`);
  });

  const essential = p.treatments.filter((t) => t.role === 'essential');
  const ids = new Set<string>();
  p.treatments.forEach((t, i) => {
    const where = `Treatment ${i + 1}${t.label ? ` (${t.label})` : ''}`;
    if (!t.label.trim()) errors.push(`${where}: give it a name.`);
    if (ids.has(t.id)) errors.push(`${where}: two treatments have the same name.`);
    ids.add(t.id);
    if (!t.detail.trim()) errors.push(`${where}: give the dose, route and rate.`);
    if (t.says.trim().length < 10) errors.push(`${where}: write what the student sees when they give it.`);
    if (t.role === 'essential' && (!t.within_minutes || t.within_minutes <= 0)) errors.push(`${where}: an essential treatment needs a "give within" minute.`);
    for (const k of VITAL_KEYS) {
      const n = t.effect?.[k];
      if (n !== undefined && Math.abs(n) > MAX_EFFECT[k]) errors.push(`${where}: a change of ${n} in ${VITAL_NAME[k]} is more than one treatment can do. Write the change, not the new value.`);
    }
    if ((t.effect?.sbp === undefined) !== (t.effect?.dbp === undefined)) errors.push(`${where}: give the change in both systolic and diastolic BP, or neither.`);
  });
  if (p.treatments.length > 14) errors.push('At most 14 treatments.');
  if (essential.length === 0) errors.push('Mark at least one treatment as essential.');
  if (p.stabilised_by.length === 0) errors.push('Tick "stops the deterioration" on the treatment (or treatments) that stop it.');
  for (const id of p.stabilised_by) {
    const t = p.treatments.find((x) => x.id === id);
    if (t && t.role !== 'essential') errors.push(`"${t.label}" stops the deterioration, so it has to be essential.`);
  }

  const r = p.recovery;
  if (!ok(r.after_minutes) || r.after_minutes < 1 || r.after_minutes > 15) errors.push('Recovery: the patient settles between 1 and 15 minutes after the last of those treatments.');
  for (const k of ['hr', 'sbp', 'dbp', 'spo2', 'rr'] as const) {
    if (r.vitals[k] === undefined) errors.push(`Recovery: give the ${VITAL_NAME[k]} once settled.`);
  }
  checkAbsolute(r.vitals, 'Recovery', errors);
  if (r.nurse_says.trim().length < 10) errors.push('Recovery: write what the nurse says when the patient settles.');
  return errors;
}

/** Things worth a second look, which do not stop it being saved. */
export function livePlanWarnings(p: LivePlan): string[] {
  const out: string[] = [];
  if (p.treatments.length - p.treatments.filter((t) => t.role === 'essential').length < 2) {
    out.push('Fewer than two treatments are not essential, so the tray gives the answer away. Add reasonable-but-unnecessary or harmful options.');
  }
  if (p.treatments.some((t) => t.role === 'harmful' && !t.why?.trim())) out.push('Say why each harmful treatment harms this patient: students read it in their debrief.');
  return out;
}
