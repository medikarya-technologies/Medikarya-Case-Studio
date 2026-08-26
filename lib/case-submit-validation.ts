import type { CaseFormData } from '@/lib/case-schema';

export interface SubmitValidationError {
  field: string;
  message: string;
  step: number;
}

function hasMinText(value: string | undefined | null, min = 1): boolean {
  return (value?.trim().length ?? 0) >= min;
}

/** Validates mandatory fields required before Draft → Submitted. */
export function validateCaseForSubmit(data: CaseFormData): SubmitValidationError[] {
  const errors: SubmitValidationError[] = [];

  // Step 1: Metadata & Patient Details
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

  const patientName = data.patient_details?.patient_name?.trim();
  if (!patientName) {
    errors.push({
      field: 'patient_details.patient_name',
      message: 'Patient Name is required',
      step: 1,
    });
  }

  const age = data.patient_details?.age;
  if (age === undefined || age === null || isNaN(age)) {
    errors.push({
      field: 'patient_details.age',
      message: 'Age is required',
      step: 1,
    });
  }

  const sex = data.patient_details?.sex || data.patient_details?.gender;
  if (!sex) {
    errors.push({
      field: 'patient_details.sex',
      message: 'Sex is required',
      step: 1,
    });
  }

  // Step 2: History
  const presentingComplaints =
    data.history?.presenting_complaints?.trim() ||
    data.chief_complaint_history?.chief_complaint?.trim();
  if (!presentingComplaints) {
    errors.push({
      field: 'history.presenting_complaints',
      message: 'Presenting Complaints is required',
      step: 2,
    });
  }

  const hpi =
    data.history?.history_of_present_illness?.trim() ||
    data.chief_complaint_history?.hpi_additional?.trim();
  if (!hpi) {
    errors.push({
      field: 'history.history_of_present_illness',
      message: 'History of Present Illness is required',
      step: 2,
    });
  }

  // Step 6: Diagnosis
  const provisionalDx =
    data.diagnosis?.provisional_diagnosis?.trim() ||
    data.diagnosis_management?.provisional_diagnosis?.trim() ||
    data.diagnosis_management?.final_diagnosis?.trim();
  if (!provisionalDx) {
    errors.push({
      field: 'diagnosis.provisional_diagnosis',
      message: 'Provisional Diagnosis is required',
      step: 6,
    });
  }

  return errors;
}
