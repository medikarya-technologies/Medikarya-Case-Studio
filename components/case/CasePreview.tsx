'use client';

// The whole case, as its reviewer will read it, shown to the author before they submit (the Preview step of the new
// and edit forms). Every section and every field that has something in it, with its formatting.

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RichTextRenderer } from '@/components/ui/RichTextRenderer';
import { AttachmentGallery } from '@/components/attachments/AttachmentGallery';
import { formatSpecialtyLabel } from '@/lib/specialtyIcons';
import { isRichTextEmpty } from '@/lib/rich-text';
import type { CaseFormData } from '@/lib/case-schema';
import type { CaseAttachment } from '@/lib/types';

const filled = (v: unknown) => (typeof v === 'string' ? !isRichTextEmpty(v) : v !== undefined && v !== null && v !== '');

/** A short value: its name small above it. */
function Fact({ name, value }: { name: string; value: unknown }) {
  return (
    <div>
      <p className="field-name">{name}</p>
      <p className="mt-0.5 text-[15px] font-medium text-foreground">{filled(value) ? String(value) : <span className="font-normal text-muted-foreground">Not given</span>}</p>
    </div>
  );
}

/** A longer, formatted answer. Left out when empty unless it is one the form requires. */
function Passage({ name, value, always }: { name: string; value?: string | null; always?: boolean }) {
  if (!filled(value) && !always) return null;
  return (
    <div>
      <p className="field-name">{name}</p>
      {filled(value) ? <RichTextRenderer content={value} className="mt-1" /> : <p className="mt-1 text-sm text-muted-foreground">Not filled in</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function Investigation({ title, note, text, files }: { title: string; note?: React.ReactNode; text?: string | null; files: CaseAttachment[] }) {
  return (
    <div className="space-y-2 rounded-lg border border-border p-4">
      <p className="font-semibold text-foreground">{title}</p>
      {note}
      {!note && (filled(text) ? <RichTextRenderer content={text} /> : <p className="text-sm text-muted-foreground">No written findings{files.length ? ' (see the attached reports).' : '.'}</p>)}
      {files.length > 0 && (
        <div className="pt-1">
          <p className="field-name mb-1.5">Attached reports and scans ({files.length})</p>
          <AttachmentGallery attachments={files} canDelete={false} />
        </div>
      )}
    </div>
  );
}

export function CasePreview({ data, attachments }: { data: CaseFormData; attachments: CaseAttachment[] }) {
  const p = data.patient_details;
  const h = data.history;
  const g = data.general_physical_examination;
  const s = data.systemic_examination;
  const l = data.local_examination;
  const inv = data.investigations_info;
  const region = l?.region?.trim();
  const confirmation = attachments.filter((a) => a.investigation_group === 'confirmation');
  const staging = attachments.filter((a) => a.investigation_group === 'staging');

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Preview: this is what your reviewer will read</p>
        <h1 className="mt-1.5 text-2xl font-bold">{data.title || 'Untitled case'}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{formatSpecialtyLabel(data.specialty, data.custom_specialty)}</Badge>
          <Badge className="capitalize">{data.difficulty}</Badge>
          {data.original_author_name && <span className="text-sm text-muted-foreground">Written by {data.original_author_name}</span>}
        </div>
      </div>

      <Section title="1. Patient Details">
        <div className="grid grid-cols-2 gap-x-4 gap-y-4 md:grid-cols-4">
          <Fact name="Case No." value={p?.case_no} />
          <Fact name="Patient name" value={p?.patient_name} />
          <Fact name="Age" value={p?.age != null && !Number.isNaN(p.age) ? `${p.age} yrs` : ''} />
          <Fact name="Sex" value={p?.sex ? p.sex.charAt(0).toUpperCase() + p.sex.slice(1) : ''} />
          <Fact name="Religion" value={p?.religion} />
          <Fact name="Occupation" value={p?.occupation} />
          <Fact name="Place" value={p?.address} />
          <Fact name="State" value={p?.state} />
          <Fact name="Date of admission" value={p?.date_of_admission} />
        </div>
      </Section>

      <Section title="2. History">
        <Passage name="Presenting complaints" value={h?.presenting_complaints} always />
        <Passage name="History of present illness" value={h?.history_of_present_illness} always />
        <Passage name="Past history" value={h?.past_history} />
        <Passage name="Personal history" value={h?.personal_history} />
        <Passage name="Treatment history" value={h?.treatment_history} />
        <Passage name="Family history" value={h?.family_history} />
        <Passage name="Menstrual history" value={h?.menstrual_history} />
        <Passage name="Obstetric history" value={h?.obstetric_history} />
        <Passage name="Socio-economic history" value={h?.socio_economic_history} />
        <Passage name="Any other" value={h?.any_other} />
      </Section>

      <Section title="3. General Physical Examination">
        <div className="grid grid-cols-2 gap-x-4 gap-y-4 md:grid-cols-4">
          <Fact name="Consciousness / orientation" value={g?.consciousness_orientation} />
          <Fact name="Pulse" value={g?.pulse} />
          <Fact name="Blood pressure" value={g?.bp} />
          <Fact name="Respiratory rate" value={g?.respiratory_rate} />
          <Fact name="Temperature" value={g?.temperature} />
          <Fact name="JVP" value={g?.jvp} />
          <Fact name="Pallor" value={g?.pallor} />
          <Fact name="Cyanosis" value={g?.cyanosis} />
          <Fact name="Icterus" value={g?.icterus} />
          <Fact name="Peripheral oedema" value={g?.peripheral_oedema} />
          <Fact name="Clubbing" value={g?.clubbing} />
        </div>
        <div className="grid grid-cols-3 gap-4 rounded-lg border border-border p-4">
          <Fact name="Lymph nodes: cervical" value={g?.lymph_nodes?.cervical} />
          <Fact name="Axillary" value={g?.lymph_nodes?.axillary} />
          <Fact name="Inguinal" value={g?.lymph_nodes?.inguinal} />
        </div>
        <Passage name="Other significant findings" value={g?.other_significant_findings} />
      </Section>

      <Section title="4. Systemic Examination">
        <Passage name="Respiratory system" value={s?.respiratory_system} always />
        <Passage name="Cardiovascular system" value={s?.cardiovascular_system} always />
        <Passage name="Nervous system" value={s?.nervous_system} always />
        <Passage name="Genito-urinary system" value={s?.genito_urinary_system} always />
        <Passage name="Gastrointestinal system" value={s?.gastrointestinal_system} always />
      </Section>

      <Section title={region ? `5. Local Examination (${region})` : '5. Local Examination'}>
        <Passage name="Inspection" value={l?.inspection} always />
        <Passage name="Palpation" value={l?.palpation} always />
        <Passage name="Percussion" value={l?.percussion} always />
        <Passage name="Auscultation" value={l?.auscultation} always />
      </Section>

      <Section title="6. Diagnosis">
        <Passage name="Provisional diagnosis" value={data.diagnosis?.provisional_diagnosis} always />
        <Passage name="Differential diagnosis" value={data.diagnosis?.differential_diagnosis} always />
      </Section>

      <Section title="7. Investigations">
        <Investigation
          title="7.1 Confirmation of diagnosis"
          text={inv?.investigations_confirmation}
          files={confirmation}
          note={
            inv?.confirmation_performed === 'no' || inv?.confirmation_performed === 'not_required' ? (
              <div className="text-sm">
                <p className="font-medium text-foreground">{inv.confirmation_performed === 'no' ? 'Not performed' : 'Not required'}</p>
                {filled(inv.confirmation_explanation) ? <RichTextRenderer content={inv.confirmation_explanation} className="mt-1" /> : <p className="text-muted-foreground">No reason given.</p>}
              </div>
            ) : undefined
          }
        />
        <Investigation
          title="7.2 Extent of disease (staging)"
          text={inv?.investigations_staging}
          files={staging}
          note={
            inv?.staging_applicable === 'no' ? (
              <div className="text-sm">
                <p className="font-medium text-foreground">Not applicable</p>
                {filled(inv.staging_explanation) && <RichTextRenderer content={inv.staging_explanation} className="mt-1" />}
              </div>
            ) : undefined
          }
        />
      </Section>

      {(data.custom_fields ?? []).filter((f: any) => filled(f?.value)).length > 0 && (
        <Section title="Additional fields">
          {(data.custom_fields ?? [])
            .filter((f: any) => filled(f?.value))
            .map((f: any, i: number) => (
              <Passage key={f.id ?? i} name={f.label || f.name || 'Field'} value={String(f.value)} />
            ))}
        </Section>
      )}
    </div>
  );
}
