import type { Case } from '@/lib/types';

export interface IncompleteFieldItem {
  sectionId: string;
  sectionTitle: string;
  fieldName: string;
  reason: string;
}

export interface CaseCompletenessResult {
  score: number; // 0 to 100
  totalFieldsCount: number;
  filledFieldsCount: number;
  incompleteItems: IncompleteFieldItem[];
  isIncompleteSection: (sectionId: string) => boolean;
}

export const SECTION_LABELS: Record<string, string> = {
  patient_details: 'Patient Details',
  history: 'History',
  general_physical_examination: 'General Physical Examination',
  systemic_examination: 'Systemic Examination',
  local_examination: 'Local Examination',
  diagnosis: 'Diagnosis',
  investigations: 'Investigations',
  general: 'General Feedback',
};

export function getCaseCompleteness(caseData: Partial<Case> | null | undefined): CaseCompletenessResult {
  if (!caseData) {
    return {
      score: 0,
      totalFieldsCount: 1,
      filledFieldsCount: 0,
      incompleteItems: [],
      isIncompleteSection: () => false,
    };
  }

  const incompleteItems: IncompleteFieldItem[] = [];
  let totalFields = 0;
  let filledFields = 0;

  const checkField = (
    sectionId: string,
    sectionTitle: string,
    fieldName: string,
    value: any,
    options?: { isRequired?: boolean; minLength?: number }
  ) => {
    totalFields += 1;
    const isFilled =
      value !== undefined &&
      value !== null &&
      (typeof value === 'number'
        ? true
        : typeof value === 'string'
        ? value.trim().length >= (options?.minLength || 1)
        : Array.isArray(value)
        ? value.length > 0
        : Boolean(value));

    if (isFilled) {
      filledFields += 1;
    } else {
      incompleteItems.push({
        sectionId,
        sectionTitle,
        fieldName,
        reason: options?.isRequired ? 'Required field is empty' : 'Field is unpopulated',
      });
    }
  };

  // 1. Patient Details
  const pd: any = caseData.patient_details || {};
  checkField('patient_details', 'Patient Details', 'Patient Name', pd.patient_name, { isRequired: true });
  checkField('patient_details', 'Patient Details', 'Age', pd.age, { isRequired: true });
  checkField('patient_details', 'Patient Details', 'Sex', pd.sex || pd.gender, { isRequired: true });
  checkField('patient_details', 'Patient Details', 'Occupation', pd.occupation);
  checkField('patient_details', 'Patient Details', 'Address', pd.address || pd.location);
  checkField('patient_details', 'Patient Details', 'Date of Admission', pd.date_of_admission || pd.presenting_date);

  // 2. History
  const h: any = caseData.history || {};
  const cc: any = caseData.chief_complaint_history || {};
  checkField('history', 'History', 'Presenting Complaints', h.presenting_complaints || cc.chief_complaint, { isRequired: true });
  checkField('history', 'History', 'History of Present Illness', h.history_of_present_illness || cc.hpi_additional, { isRequired: true });
  checkField('history', 'History', 'Past History', h.past_history || caseData.medical_history?.past_medical_history);
  checkField('history', 'History', 'Personal History', h.personal_history);
  checkField('history', 'History', 'Treatment History', h.treatment_history);
  checkField('history', 'History', 'Family History', h.family_history || caseData.medical_history?.family_history);

  // 3. General Physical Examination
  const gpe: any = caseData.general_physical_examination || {};
  checkField('general_physical_examination', 'General Physical Examination', 'Consciousness / Orientation', gpe.consciousness_orientation || caseData.examination_findings?.general_appearance);
  checkField('general_physical_examination', 'General Physical Examination', 'Pulse', gpe.pulse || caseData.examination_findings?.vital_signs?.hr);
  checkField('general_physical_examination', 'General Physical Examination', 'Blood Pressure', gpe.bp || caseData.examination_findings?.vital_signs?.bp_systolic);
  checkField('general_physical_examination', 'General Physical Examination', 'Respiratory Rate', gpe.respiratory_rate || caseData.examination_findings?.vital_signs?.rr);

  // 4. Systemic Examination
  const sys: any = caseData.systemic_examination || caseData.examination_findings?.systemic || {};
  const hasSystemic = Object.values(sys).some((v) => Boolean(v && String(v).trim()));
  checkField('systemic_examination', 'Systemic Examination', 'Systemic Examination Findings', hasSystemic);

  // 5. Local Examination
  const local: any = caseData.local_examination || caseData.examination_findings?.local || {};
  const hasLocal = Object.values(local).some((v) => Boolean(v && String(v).trim()));
  checkField('local_examination', 'Local Examination', 'Local Examination Findings', hasLocal);

  // 6. Diagnosis
  const dx: any = caseData.diagnosis || caseData.diagnosis_management || {};
  checkField('diagnosis', 'Diagnosis', 'Provisional Diagnosis', dx.provisional_diagnosis || dx.final_diagnosis, { isRequired: true });
  checkField('diagnosis', 'Diagnosis', 'Differential Diagnosis', dx.differential_diagnosis || dx.differential_diagnoses);

  // 7. Investigations
  const invsInfo: any = caseData.investigations_info || {};
  const invsList = caseData.investigations || [];
  const attsList = caseData.attachments || [];
  const hasInvs =
    Boolean(
      invsInfo.investigations_confirmation ||
      invsInfo.confirmation_explanation ||
      invsInfo.investigations_staging ||
      invsInfo.staging_explanation
    ) ||
    invsInfo.confirmation_performed === 'not_required' ||
    invsInfo.staging_applicable === 'no' ||
    invsList.length > 0 ||
    attsList.length > 0;
  checkField('investigations', 'Investigations', 'Investigations & Attachments', hasInvs);

  const score = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 100;
  const incompleteSectionIds = new Set(incompleteItems.map((item) => item.sectionId));

  return {
    score,
    totalFieldsCount: totalFields,
    filledFieldsCount: filledFields,
    incompleteItems,
    isIncompleteSection: (sectionId: string) => incompleteSectionIds.has(sectionId),
  };
}
