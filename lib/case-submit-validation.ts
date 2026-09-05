import type { CaseFormData } from '@/lib/case-schema';
import type { CaseAttachment } from '@/lib/types';

export interface SubmitValidationError {
  field: string;
  message: string;
  step: number;
}

function hasMinText(value: string | undefined | null, min = 1): boolean {
  if (!value) return false;
  // Strip simple HTML tags if rich text editor produced empty paragraph like <p></p>
  const stripped = value.replace(/<[^>]*>/g, '').trim();
  return stripped.length >= min;
}

/** Validates mandatory fields required before Draft → Submitted or advancing steps. */
export function validateCaseForSubmit(
  data: CaseFormData,
  attachments: CaseAttachment[] = []
): SubmitValidationError[] {
  const errors: SubmitValidationError[] = [];

  // ==========================================
  // Step 1: Patient Details & Case Metadata
  // ==========================================
  if (!hasMinText(data.title, 5)) {
    errors.push({ field: 'title', message: 'Case title is required (minimum 5 characters)', step: 1 });
  }

  if (!data.specialty) {
    errors.push({ field: 'specialty', message: 'Specialty is required', step: 1 });
  }

  if (!hasMinText(data.patient_details?.case_no)) {
    errors.push({ field: 'patient_details.case_no', message: 'Case No. is required', step: 1 });
  }

  if (!hasMinText(data.patient_details?.patient_name)) {
    errors.push({ field: 'patient_details.patient_name', message: 'Patient Name is required', step: 1 });
  }

  const age = data.patient_details?.age;
  if (age === undefined || age === null || isNaN(age)) {
    errors.push({ field: 'patient_details.age', message: 'Age is required', step: 1 });
  }

  const sex = data.patient_details?.sex || data.patient_details?.gender;
  if (!sex) {
    errors.push({ field: 'patient_details.sex', message: 'Sex is required', step: 1 });
  }

  if (!hasMinText(data.patient_details?.religion)) {
    errors.push({ field: 'patient_details.religion', message: 'Religion is required', step: 1 });
  }

  if (!hasMinText(data.patient_details?.occupation)) {
    errors.push({ field: 'patient_details.occupation', message: 'Occupation is required', step: 1 });
  }

  if (!hasMinText(data.patient_details?.address || data.patient_details?.location)) {
    errors.push({ field: 'patient_details.address', message: 'Address is required', step: 1 });
  }

  if (!hasMinText(data.patient_details?.date_of_admission || data.patient_details?.presenting_date)) {
    errors.push({ field: 'patient_details.date_of_admission', message: 'Date of Admission is required', step: 1 });
  }

  // ==========================================
  // Step 2: History
  // ==========================================
  const presentingComplaints =
    data.history?.presenting_complaints || data.chief_complaint_history?.chief_complaint;
  if (!hasMinText(presentingComplaints)) {
    errors.push({ field: 'history.presenting_complaints', message: 'Presenting Complaints is required', step: 2 });
  }

  const hpi =
    data.history?.history_of_present_illness || data.chief_complaint_history?.hpi_additional;
  if (!hasMinText(hpi)) {
    errors.push({ field: 'history.history_of_present_illness', message: 'History of Present Illness is required', step: 2 });
  }

  if (!hasMinText(data.history?.past_history)) {
    errors.push({ field: 'history.past_history', message: 'Past History is required', step: 2 });
  }

  if (!hasMinText(data.history?.personal_history)) {
    errors.push({ field: 'history.personal_history', message: 'Personal History is required', step: 2 });
  }

  if (!hasMinText(data.history?.treatment_history)) {
    errors.push({ field: 'history.treatment_history', message: 'Treatment History is required', step: 2 });
  }

  if (!hasMinText(data.history?.family_history)) {
    errors.push({ field: 'history.family_history', message: 'Family History is required', step: 2 });
  }

  if (!hasMinText(data.history?.socio_economic_history)) {
    errors.push({ field: 'history.socio_economic_history', message: 'Socio-economic History is required', step: 2 });
  }

  if (!hasMinText(data.history?.any_other)) {
    errors.push({ field: 'history.any_other', message: 'Any Other field is required', step: 2 });
  }

  // Gender Exception check: Require Menstrual & Obstetric History ONLY if Sex != male
  if (sex && sex !== 'male') {
    if (!hasMinText(data.history?.menstrual_history)) {
      errors.push({ field: 'history.menstrual_history', message: 'Menstrual History is required', step: 2 });
    }
    if (!hasMinText(data.history?.obstetric_history)) {
      errors.push({ field: 'history.obstetric_history', message: 'Obstetric History is required', step: 2 });
    }
  }

  // ==========================================
  // Step 3: General Physical Examination
  // ==========================================
  const gpe = data.general_physical_examination;
  if (!hasMinText(gpe?.consciousness_orientation || data.examination_findings?.general_appearance)) {
    errors.push({ field: 'general_physical_examination.consciousness_orientation', message: 'Consciousness / Orientation is required', step: 3 });
  }

  if (!hasMinText(gpe?.pallor)) {
    errors.push({ field: 'general_physical_examination.pallor', message: 'Pallor is required', step: 3 });
  }

  if (!hasMinText(gpe?.cyanosis)) {
    errors.push({ field: 'general_physical_examination.cyanosis', message: 'Cyanosis is required', step: 3 });
  }

  if (!hasMinText(gpe?.icterus)) {
    errors.push({ field: 'general_physical_examination.icterus', message: 'Icterus is required', step: 3 });
  }

  if (!hasMinText(gpe?.peripheral_oedema)) {
    errors.push({ field: 'general_physical_examination.peripheral_oedema', message: 'Peripheral Oedema is required', step: 3 });
  }

  if (!hasMinText(gpe?.clubbing)) {
    errors.push({ field: 'general_physical_examination.clubbing', message: 'Clubbing is required', step: 3 });
  }

  if (!hasMinText(gpe?.jvp)) {
    errors.push({ field: 'general_physical_examination.jvp', message: 'JVP is required', step: 3 });
  }

  if (!hasMinText(gpe?.lymph_nodes?.cervical)) {
    errors.push({ field: 'general_physical_examination.lymph_nodes.cervical', message: 'Cervical Lymph Nodes finding is required', step: 3 });
  }

  if (!hasMinText(gpe?.lymph_nodes?.axillary)) {
    errors.push({ field: 'general_physical_examination.lymph_nodes.axillary', message: 'Axillary Lymph Nodes finding is required', step: 3 });
  }

  if (!hasMinText(gpe?.lymph_nodes?.inguinal)) {
    errors.push({ field: 'general_physical_examination.lymph_nodes.inguinal', message: 'Inguinal Lymph Nodes finding is required', step: 3 });
  }

  if (!hasMinText(gpe?.pulse || data.examination_findings?.vital_signs?.hr)) {
    errors.push({ field: 'general_physical_examination.pulse', message: 'Pulse is required', step: 3 });
  }

  if (!hasMinText(gpe?.bp || data.examination_findings?.vital_signs?.bp_systolic)) {
    errors.push({ field: 'general_physical_examination.bp', message: 'Blood Pressure is required', step: 3 });
  }

  if (!hasMinText(gpe?.respiratory_rate || data.examination_findings?.vital_signs?.rr)) {
    errors.push({ field: 'general_physical_examination.respiratory_rate', message: 'Respiratory Rate is required', step: 3 });
  }

  if (!hasMinText(gpe?.temperature || data.examination_findings?.vital_signs?.temp)) {
    errors.push({ field: 'general_physical_examination.temperature', message: 'Temperature is required', step: 3 });
  }

  if (!hasMinText(gpe?.other_significant_findings)) {
    errors.push({ field: 'general_physical_examination.other_significant_findings', message: 'Other Significant Findings is required', step: 3 });
  }

  // ==========================================
  // Step 4: Systemic Examination
  // ==========================================
  const sys = data.systemic_examination || data.examination_findings?.systemic;
  if (!hasMinText(sys?.respiratory_system)) {
    errors.push({ field: 'systemic_examination.respiratory_system', message: 'Respiratory System examination is required', step: 4 });
  }

  if (!hasMinText(sys?.cardiovascular_system)) {
    errors.push({ field: 'systemic_examination.cardiovascular_system', message: 'Cardiovascular System examination is required', step: 4 });
  }

  if (!hasMinText(sys?.nervous_system)) {
    errors.push({ field: 'systemic_examination.nervous_system', message: 'Nervous System examination is required', step: 4 });
  }

  if (!hasMinText(sys?.genito_urinary_system)) {
    errors.push({ field: 'systemic_examination.genito_urinary_system', message: 'Genito-Urinary System examination is required', step: 4 });
  }

  if (!hasMinText(sys?.gastrointestinal_system)) {
    errors.push({ field: 'systemic_examination.gastrointestinal_system', message: 'Gastrointestinal System examination is required', step: 4 });
  }

  // ==========================================
  // Step 5: Local Examination
  // ==========================================
  const loc = data.local_examination;
  if (!hasMinText(loc?.inspection)) {
    errors.push({ field: 'local_examination.inspection', message: 'Inspection is required', step: 5 });
  }

  if (!hasMinText(loc?.palpation)) {
    errors.push({ field: 'local_examination.palpation', message: 'Palpation is required', step: 5 });
  }

  if (!hasMinText(loc?.percussion)) {
    errors.push({ field: 'local_examination.percussion', message: 'Percussion is required', step: 5 });
  }

  if (!hasMinText(loc?.auscultation)) {
    errors.push({ field: 'local_examination.auscultation', message: 'Auscultation is required', step: 5 });
  }

  // ==========================================
  // Step 6: Diagnosis
  // ==========================================
  const provisionalDx =
    data.diagnosis?.provisional_diagnosis ||
    data.diagnosis_management?.provisional_diagnosis ||
    data.diagnosis_management?.final_diagnosis;
  if (!hasMinText(provisionalDx)) {
    errors.push({ field: 'diagnosis.provisional_diagnosis', message: 'Provisional Diagnosis is required', step: 6 });
  }

  const diffDx =
    data.diagnosis?.differential_diagnosis ||
    (data.diagnosis_management?.differential_diagnoses ? data.diagnosis_management.differential_diagnoses.join(', ') : '');
  if (!hasMinText(diffDx)) {
    errors.push({ field: 'diagnosis.differential_diagnosis', message: 'Differential Diagnosis is required', step: 6 });
  }

  // ==========================================
  // Step 7: Investigations
  // ==========================================
  const inv = data.investigations_info;
  const confPerformed = inv?.confirmation_performed || 'yes';

  if (confPerformed === 'yes') {
    if (!hasMinText(inv?.investigations_confirmation)) {
      errors.push({
        field: 'investigations_info.investigations_confirmation',
        message: 'Confirmation of Diagnosis written findings are required',
        step: 7,
      });
    }

    const hasConfirmationAttachment = attachments.some((a) => a.investigation_group === 'confirmation');
    if (!hasConfirmationAttachment) {
      errors.push({
        field: 'investigations_info.investigations_confirmation_attachment',
        message: 'At least one report/scan attachment for Confirmation of Diagnosis is required',
        step: 7,
      });
    }
  } else if (confPerformed === 'no') {
    const expl = inv?.confirmation_explanation || inv?.investigations_confirmation;
    if (!hasMinText(expl)) {
      errors.push({
        field: 'investigations_info.confirmation_explanation',
        message: 'Please provide an explanation why confirmation investigations were not performed',
        step: 7,
      });
    }
  }

  const stagingApp = inv?.staging_applicable || 'yes';
  if (stagingApp === 'yes') {
    if (!hasMinText(inv?.investigations_staging)) {
      errors.push({
        field: 'investigations_info.investigations_staging',
        message: 'Extent of Disease / Staging findings text is required',
        step: 7,
      });
    }

    const hasStagingAttachment = attachments.some((a) => a.investigation_group === 'staging');
    if (!hasStagingAttachment) {
      errors.push({
        field: 'investigations_info.investigations_staging_attachment',
        message: 'At least one report/scan attachment for Extent of Disease / Staging is required',
        step: 7,
      });
    }
  }

  return errors;
}
