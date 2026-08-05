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
  chief_complaint: 'Chief Complaint & HPI',
  medical_history: 'Medical & Personal History',
  examination: 'Examination Findings',
  investigations: 'Investigations & Reports',
  diagnosis: 'Diagnosis & Management',
  learning_points: 'Learning Points',
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
      (typeof value === 'number' ? true : typeof value === 'string' ? value.trim().length >= (options?.minLength || 1) : Array.isArray(value) ? value.length > 0 : Boolean(value));

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
  checkField('patient_details', 'Patient Details', 'Patient ID', pd.patient_id);
  checkField('patient_details', 'Patient Details', 'Age', pd.age);
  checkField('patient_details', 'Patient Details', 'Gender', pd.gender);
  checkField('patient_details', 'Patient Details', 'Location / Facility', pd.location);
  checkField('patient_details', 'Patient Details', 'Presenting Date', pd.presenting_date);

  // 2. Chief Complaint & HPI
  const cc: any = caseData.chief_complaint_history || {};
  checkField('chief_complaint', 'Chief Complaint & HPI', 'Chief Complaint', cc.chief_complaint, { isRequired: true, minLength: 3 });
  checkField('chief_complaint', 'Chief Complaint & HPI', 'Duration', cc.hpi_duration);
  checkField('chief_complaint', 'Chief Complaint & HPI', 'Onset', cc.hpi_onset);
  checkField('chief_complaint', 'Chief Complaint & HPI', 'Additional HPI Notes', cc.hpi_additional, { isRequired: true, minLength: 10 });
  checkField('chief_complaint', 'Chief Complaint & HPI', 'Associated Symptoms', cc.associated_symptoms);

  // 3. Medical & Personal History
  const mh: any = caseData.medical_history || {};
  const hasPMH = (mh.past_medical_history && mh.past_medical_history.length > 0) || Boolean(mh.custom_medical_history);
  checkField('medical_history', 'Medical History', 'Past Medical History', hasPMH);
  checkField('medical_history', 'Medical History', 'Family History', mh.family_history);
  checkField('medical_history', 'Medical History', 'Social History', mh.social_history_smoking || mh.social_history_alcohol || mh.social_history_occupation);
  checkField('medical_history', 'Medical History', 'Current Medications', caseData.current_medications);

  // 4. Examination Findings
  const exam: any = caseData.examination_findings || {};
  checkField('examination', 'Examination Findings', 'General Appearance', exam.general_appearance, { isRequired: true, minLength: 5 });
  
  const vitals: any = exam.vital_signs || {};
  const hasVitals = vitals.bp_systolic != null || vitals.hr != null || vitals.temp != null || vitals.spo2 != null;
  checkField('examination', 'Examination Findings', 'Vital Signs', hasVitals);

  const systemic: any = exam.systemic || {};
  const hasSystemic = Object.values(systemic).some((v) => Boolean(v && String(v).trim()));
  checkField('examination', 'Examination Findings', 'Systemic Examination', hasSystemic);

  // 5. Investigations
  const invs = caseData.investigations || [];
  const atts = caseData.attachments || [];
  const hasInvestigations = invs.length > 0 || atts.length > 0;
  checkField('investigations', 'Investigations & Reports', 'Investigations / Lab Tests', hasInvestigations);

  // 6. Diagnosis & Management
  const dx: any = caseData.diagnosis_management || {};
  checkField('diagnosis', 'Diagnosis & Management', 'Final Diagnosis', dx.final_diagnosis, { isRequired: true, minLength: 3 });
  checkField('diagnosis', 'Diagnosis & Management', 'Treatment Plan', dx.treatment_plan, { isRequired: true, minLength: 10 });
  checkField('diagnosis', 'Diagnosis & Management', 'Medications Prescribed', dx.medications_prescribed);
  checkField('diagnosis', 'Diagnosis & Management', 'Outcome', dx.outcome, { isRequired: true, minLength: 5 });

  // 7. Learning Points
  const lp = caseData.learning_points || [];
  checkField('learning_points', 'Learning Points', 'Learning Points', lp.length > 0);

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
