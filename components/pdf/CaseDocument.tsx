import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Case, User } from '@/lib/types';
import { formatSpecialtyLabel } from '@/lib/specialtyIcons';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: 'Helvetica' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 12, marginBottom: 4, textAlign: 'center', color: '#555' },
  meta: { fontSize: 10, marginBottom: 20, textAlign: 'center', color: '#777' },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 14,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 3,
  },
  body: { lineHeight: 1.5, marginBottom: 4 },
  label: { fontWeight: 'bold', marginTop: 4 },
  approval: {
    marginTop: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: '#16A34A',
    borderRadius: 4,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 40,
    right: 40,
    fontSize: 9,
    textAlign: 'center',
    color: '#999',
  },
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function P({ children }: { children?: string | null }) {
  if (!children?.trim()) return null;
  return <Text style={styles.body}>{children}</Text>;
}

interface CaseDocumentProps {
  caseData: Case;
  author?: User;
}

export function CaseDocument({ caseData, author }: CaseDocumentProps) {
  const pd = caseData.patient_details;
  const cc = caseData.chief_complaint_history;
  const mh = caseData.medical_history;
  const exam = caseData.examination_findings;
  const dx = caseData.diagnosis_management;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{caseData.title}</Text>
        {author && <Text style={styles.subtitle}>By: {author.name}</Text>}
        <Text style={styles.meta}>
          {formatSpecialtyLabel(caseData.specialty)} · {caseData.difficulty} ·{' '}
          {new Date(caseData.created_at).toLocaleDateString()}
        </Text>

        {pd && (
          <Section title="Patient Details">
            {pd.age != null && <P>{`Age: ${pd.age}`}</P>}
            {pd.gender && <P>{`Gender: ${pd.gender}`}</P>}
            {pd.occupation && <P>{`Occupation: ${pd.occupation}`}</P>}
            {pd.location && <P>{`Location: ${pd.location}`}</P>}
          </Section>
        )}

        {cc && (
          <Section title="Chief Complaint & HPI">
            <P>{cc.chief_complaint}</P>
            {cc.hpi_duration && <P>{`Duration: ${cc.hpi_duration}`}</P>}
            {cc.hpi_onset && <P>{`Onset: ${cc.hpi_onset}`}</P>}
            {cc.hpi_additional && <P>{cc.hpi_additional}</P>}
            {cc.associated_symptoms && <P>{`Associated symptoms: ${cc.associated_symptoms}`}</P>}
          </Section>
        )}

        {mh && (
          <Section title="Medical History">
            {mh.past_medical_history?.length > 0 && (
              <P>{`PMH: ${mh.past_medical_history.join(', ')}`}</P>
            )}
            {mh.family_history && <P>{`Family history: ${mh.family_history}`}</P>}
            {mh.allergies?.length > 0 && <P>{`Allergies: ${mh.allergies.join(', ')}`}</P>}
          </Section>
        )}

        {caseData.current_medications && caseData.current_medications.length > 0 && (
          <Section title="Current Medications">
            {caseData.current_medications.map((m, i) => (
              <P key={i}>{`${m.name} — ${m.dose}, ${m.frequency}`}</P>
            ))}
          </Section>
        )}

        {exam && (
          <Section title="Examination">
            {exam.general_appearance && <P>{exam.general_appearance}</P>}
            {exam.vital_signs?.bp_systolic && exam.vital_signs?.bp_diastolic && (
              <P>{`BP: ${exam.vital_signs.bp_systolic}/${exam.vital_signs.bp_diastolic}`}</P>
            )}
            {exam.systemic?.cardiovascular && <P>{`CV: ${exam.systemic.cardiovascular}`}</P>}
            {exam.systemic?.respiratory && <P>{`Resp: ${exam.systemic.respiratory}`}</P>}
            {exam.systemic?.neurological && <P>{`Neuro: ${exam.systemic.neurological}`}</P>}
          </Section>
        )}

        {caseData.investigations && caseData.investigations.length > 0 && (
          <Section title="Investigations">
            {caseData.investigations.map((inv, i) => (
              <P key={i}>
                {`${inv.test_name}${inv.result ? `: ${inv.result}` : ''}${inv.interpretation ? ` — ${inv.interpretation}` : ''}`}
              </P>
            ))}
          </Section>
        )}

        {dx && (
          <Section title="Diagnosis & Management">
            {dx.provisional_diagnosis && <P>{`Provisional: ${dx.provisional_diagnosis}`}</P>}
            {dx.final_diagnosis && <P>{`Final: ${dx.final_diagnosis}`}</P>}
            {dx.treatment_plan && <P>{dx.treatment_plan}</P>}
            {dx.outcome && <P>{`Outcome: ${dx.outcome}`}</P>}
          </Section>
        )}

        {caseData.learning_points && caseData.learning_points.length > 0 && (
          <Section title="Learning Points">
            {caseData.learning_points.map((pt, i) => (
              <P key={i}>{`• ${pt}`}</P>
            ))}
          </Section>
        )}

        {caseData.approved_at && (
          <View style={styles.approval}>
            <Text style={{ fontWeight: 'bold', color: '#16A34A' }}>APPROVED</Text>
            <Text>{new Date(caseData.approved_at).toLocaleDateString()}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          MediKarya Case Report — Generated {new Date().toLocaleDateString()}
        </Text>
      </Page>
    </Document>
  );
}
