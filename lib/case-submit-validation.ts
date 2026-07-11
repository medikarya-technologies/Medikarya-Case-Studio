import type { CaseFormData } from '@/lib/case-schema';

export interface SubmitValidationError {
  field: string;
  message: string;
  step: number;
}

function hasMinText(value: string | undefined | null, min: number): boolean {
  return (value?.trim().length ?? 0) >= min;
}

function getHpiNarrative(data: CaseFormData): string {
  const hpi = data.chief_complaint_history;
  return [
    hpi?.hpi_duration,
    hpi?.hpi_onset,
    hpi?.hpi_aggravating,
    hpi?.hpi_relieving,
    hpi?.hpi_additional,
    hpi?.associated_symptoms,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
}

function getExaminationText(data: CaseFormData): string {
  const exam = data.examination_findings;
  if (!exam) return '';
  return [
    exam.general_appearance,
    ...Object.values(exam.systemic ?? {}),
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
}

function getOutcomeText(data: CaseFormData): string {
  return (
    data.diagnosis_management?.outcome?.trim() ||
    data.diagnosis_management?.prognosis?.trim() ||
    ''
  );
}

/** Validates mandatory fields required before Draft → Submitted. Draft saves skip this. */
export function validateCaseForSubmit(data: CaseFormData): SubmitValidationError[] {
  const errors: SubmitValidationError[] = [];

  if (!hasMinText(data.title, 5)) {
    errors.push({
      field: 'title',
      message: 'Case title is required (minimum 5 characters)',
      step: 1,
    });
  }

  if (!data.specialty) {
    errors.push({
      field: 'specialty',
      message: 'Specialty is required',
      step: 1,
    });
  }

  if (!hasMinText(data.chief_complaint_history?.chief_complaint, 3)) {
    errors.push({
      field: 'chief_complaint_history.chief_complaint',
      message: 'Chief complaint is required',
      step: 2,
    });
  }

  if (getHpiNarrative(data).length < 10) {
    errors.push({
      field: 'chief_complaint_history.hpi_additional',
      message: 'History of present illness is required',
      step: 2,
    });
  }

  if (getExaminationText(data).length < 5) {
    errors.push({
      field: 'examination_findings.general_appearance',
      message: 'Examination findings are required before submitting',
      step: 4,
    });
  }

  const diagnosis =
    data.diagnosis_management?.final_diagnosis?.trim() ||
    data.diagnosis_management?.provisional_diagnosis?.trim() ||
    '';

  if (!hasMinText(diagnosis, 3)) {
    errors.push({
      field: 'diagnosis_management.final_diagnosis',
      message: 'Diagnosis is required before submitting',
      step: 6,
    });
  }

  if (!hasMinText(data.diagnosis_management?.treatment_plan, 5)) {
    errors.push({
      field: 'diagnosis_management.treatment_plan',
      message: 'Treatment/Management plan is required before submitting',
      step: 6,
    });
  }

  if (!hasMinText(getOutcomeText(data), 3)) {
    errors.push({
      field: 'diagnosis_management.outcome',
      message:
        'Outcome is required before submitting (e.g. "Recovered", "Ongoing follow-up")',
      step: 6,
    });
  }

  return errors;
}
