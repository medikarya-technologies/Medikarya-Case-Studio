import type { CaseFormData } from '@/lib/case-schema';
import type { CaseAttachment } from '@/lib/types';
import { validateCaseForSubmit } from '@/lib/case-submit-validation';
import { toast } from 'sonner';

/**
 * Validates all required fields for a specific step in the case wizard.
 * If validation fails:
 * - Sets field-level inline errors
 * - Shows a Sonner toast listing the exact missing fields on this step
 * - Returns false to block navigation
 */
export async function validateStepAndNotify(
  step: number,
  methods: any,
  attachments: CaseAttachment[] = []
): Promise<boolean> {
  const { trigger, getValues, setError, getFieldState } = methods;

  let fieldsToValidate: (keyof CaseFormData)[] = [];
  if (step === 1) fieldsToValidate = ['title', 'specialty', 'custom_specialty', 'difficulty', 'tags', 'patient_details'];
  if (step === 2) fieldsToValidate = ['history'];
  if (step === 3) fieldsToValidate = ['general_physical_examination'];
  if (step === 4) fieldsToValidate = ['systemic_examination'];
  if (step === 5) fieldsToValidate = ['local_examination'];
  if (step === 6) fieldsToValidate = ['diagnosis'];
  if (step === 7) fieldsToValidate = ['investigations_info'];

  // Trigger Zod validation for this step's fields
  const isValidZod = await trigger(fieldsToValidate as any);

  // Check submit validation rules for this step
  const data = getValues();
  const submitErrorsForStep = validateCaseForSubmit(data, attachments).filter((err) => err.step === step);

  if (submitErrorsForStep.length > 0) {
    submitErrorsForStep.forEach((err) => {
      setError(err.field as any, { type: 'manual', message: err.message });
    });
  }

  const isStepValid = isValidZod && submitErrorsForStep.length === 0;

  if (!isStepValid) {
    const missingLabels: string[] = [];

    if (step === 1) {
      if (getFieldState('title').error || submitErrorsForStep.some((e) => e.field === 'title')) missingLabels.push('Case Title');
      if (getFieldState('specialty').error || submitErrorsForStep.some((e) => e.field === 'specialty')) missingLabels.push('Specialty');
      if (getFieldState('custom_specialty').error || submitErrorsForStep.some((e) => e.field === 'custom_specialty')) missingLabels.push('Custom Specialty');
      if (getFieldState('patient_details.case_no').error || submitErrorsForStep.some((e) => e.field === 'patient_details.case_no')) missingLabels.push('Case No.');
      if (getFieldState('patient_details.patient_name').error || submitErrorsForStep.some((e) => e.field === 'patient_details.patient_name')) missingLabels.push('Patient Name');
      if (getFieldState('patient_details.age').error || submitErrorsForStep.some((e) => e.field === 'patient_details.age')) missingLabels.push('Age');
      if (getFieldState('patient_details.sex').error || submitErrorsForStep.some((e) => e.field.startsWith('patient_details.sex'))) missingLabels.push('Sex');
      if (getFieldState('patient_details.religion').error || submitErrorsForStep.some((e) => e.field === 'patient_details.religion')) missingLabels.push('Religion');
      if (getFieldState('patient_details.occupation').error || submitErrorsForStep.some((e) => e.field === 'patient_details.occupation')) missingLabels.push('Occupation');
      if (getFieldState('patient_details.address').error || submitErrorsForStep.some((e) => e.field === 'patient_details.address')) missingLabels.push('Address');
    }

    if (step === 2) {
      if (getFieldState('history.presenting_complaints').error || submitErrorsForStep.some((e) => e.field === 'history.presenting_complaints')) missingLabels.push('Presenting Complaints');
      if (getFieldState('history.history_of_present_illness').error || submitErrorsForStep.some((e) => e.field === 'history.history_of_present_illness')) missingLabels.push('History of Present Illness');
      if (getFieldState('history.past_history').error || submitErrorsForStep.some((e) => e.field === 'history.past_history')) missingLabels.push('Past History');
      if (getFieldState('history.personal_history').error || submitErrorsForStep.some((e) => e.field === 'history.personal_history')) missingLabels.push('Personal History');
      if (getFieldState('history.treatment_history').error || submitErrorsForStep.some((e) => e.field === 'history.treatment_history')) missingLabels.push('Treatment History');
      if (getFieldState('history.family_history').error || submitErrorsForStep.some((e) => e.field === 'history.family_history')) missingLabels.push('Family History');
      if (getFieldState('history.socio_economic_history').error || submitErrorsForStep.some((e) => e.field === 'history.socio_economic_history')) missingLabels.push('Socio-economic History');
      if (getFieldState('history.any_other').error || submitErrorsForStep.some((e) => e.field === 'history.any_other')) missingLabels.push('Any Other');

      const sex = data.patient_details?.sex || data.patient_details?.gender;
      if (sex && sex !== 'male') {
        if (getFieldState('history.menstrual_history').error || submitErrorsForStep.some((e) => e.field === 'history.menstrual_history')) missingLabels.push('Menstrual History');
        if (getFieldState('history.obstetric_history').error || submitErrorsForStep.some((e) => e.field === 'history.obstetric_history')) missingLabels.push('Obstetric History');
      }
    }

    if (step === 3) {
      if (getFieldState('general_physical_examination.consciousness_orientation').error || submitErrorsForStep.some((e) => e.field === 'general_physical_examination.consciousness_orientation')) missingLabels.push('Consciousness / Orientation');
      if (getFieldState('general_physical_examination.pallor').error || submitErrorsForStep.some((e) => e.field === 'general_physical_examination.pallor')) missingLabels.push('Pallor');
      if (getFieldState('general_physical_examination.cyanosis').error || submitErrorsForStep.some((e) => e.field === 'general_physical_examination.cyanosis')) missingLabels.push('Cyanosis');
      if (getFieldState('general_physical_examination.icterus').error || submitErrorsForStep.some((e) => e.field === 'general_physical_examination.icterus')) missingLabels.push('Icterus');
      if (getFieldState('general_physical_examination.peripheral_oedema').error || submitErrorsForStep.some((e) => e.field === 'general_physical_examination.peripheral_oedema')) missingLabels.push('Peripheral Oedema');
      if (getFieldState('general_physical_examination.clubbing').error || submitErrorsForStep.some((e) => e.field === 'general_physical_examination.clubbing')) missingLabels.push('Clubbing');
      if (getFieldState('general_physical_examination.jvp').error || submitErrorsForStep.some((e) => e.field === 'general_physical_examination.jvp')) missingLabels.push('JVP');
      if (getFieldState('general_physical_examination.lymph_nodes.cervical').error || submitErrorsForStep.some((e) => e.field === 'general_physical_examination.lymph_nodes.cervical')) missingLabels.push('Cervical Lymph Nodes');
      if (getFieldState('general_physical_examination.lymph_nodes.axillary').error || submitErrorsForStep.some((e) => e.field === 'general_physical_examination.lymph_nodes.axillary')) missingLabels.push('Axillary Lymph Nodes');
      if (getFieldState('general_physical_examination.lymph_nodes.inguinal').error || submitErrorsForStep.some((e) => e.field === 'general_physical_examination.lymph_nodes.inguinal')) missingLabels.push('Inguinal Lymph Nodes');
      if (getFieldState('general_physical_examination.pulse').error || submitErrorsForStep.some((e) => e.field === 'general_physical_examination.pulse')) missingLabels.push('Pulse');
      if (getFieldState('general_physical_examination.bp').error || submitErrorsForStep.some((e) => e.field === 'general_physical_examination.bp')) missingLabels.push('Blood Pressure');
      if (getFieldState('general_physical_examination.respiratory_rate').error || submitErrorsForStep.some((e) => e.field === 'general_physical_examination.respiratory_rate')) missingLabels.push('Respiratory Rate');
      if (getFieldState('general_physical_examination.temperature').error || submitErrorsForStep.some((e) => e.field === 'general_physical_examination.temperature')) missingLabels.push('Temperature');
      if (getFieldState('general_physical_examination.other_significant_findings').error || submitErrorsForStep.some((e) => e.field === 'general_physical_examination.other_significant_findings')) missingLabels.push('Other Significant Findings');
    }

    if (step === 4) {
      if (getFieldState('systemic_examination.respiratory_system').error || submitErrorsForStep.some((e) => e.field === 'systemic_examination.respiratory_system')) missingLabels.push('Respiratory System');
      if (getFieldState('systemic_examination.cardiovascular_system').error || submitErrorsForStep.some((e) => e.field === 'systemic_examination.cardiovascular_system')) missingLabels.push('Cardiovascular System');
      if (getFieldState('systemic_examination.nervous_system').error || submitErrorsForStep.some((e) => e.field === 'systemic_examination.nervous_system')) missingLabels.push('Nervous System');
      if (getFieldState('systemic_examination.genito_urinary_system').error || submitErrorsForStep.some((e) => e.field === 'systemic_examination.genito_urinary_system')) missingLabels.push('Genito-Urinary System');
      if (getFieldState('systemic_examination.gastrointestinal_system').error || submitErrorsForStep.some((e) => e.field === 'systemic_examination.gastrointestinal_system')) missingLabels.push('Gastrointestinal System');
    }

    if (step === 5) {
      if (getFieldState('local_examination.inspection').error || submitErrorsForStep.some((e) => e.field === 'local_examination.inspection')) missingLabels.push('Inspection');
      if (getFieldState('local_examination.palpation').error || submitErrorsForStep.some((e) => e.field === 'local_examination.palpation')) missingLabels.push('Palpation');
      if (getFieldState('local_examination.percussion').error || submitErrorsForStep.some((e) => e.field === 'local_examination.percussion')) missingLabels.push('Percussion');
      if (getFieldState('local_examination.auscultation').error || submitErrorsForStep.some((e) => e.field === 'local_examination.auscultation')) missingLabels.push('Auscultation');
    }

    if (step === 6) {
      if (getFieldState('diagnosis.provisional_diagnosis').error || submitErrorsForStep.some((e) => e.field === 'diagnosis.provisional_diagnosis')) missingLabels.push('Provisional Diagnosis');
      if (getFieldState('diagnosis.differential_diagnosis').error || submitErrorsForStep.some((e) => e.field === 'diagnosis.differential_diagnosis')) missingLabels.push('Differential Diagnosis');
    }

    if (step === 7) {
      if (getFieldState('investigations_info.investigations_confirmation').error || submitErrorsForStep.some((e) => e.field === 'investigations_info.investigations_confirmation')) missingLabels.push('7.1 Confirmation Findings (Written or Upload)');
      if (getFieldState('investigations_info.confirmation_explanation').error || submitErrorsForStep.some((e) => e.field === 'investigations_info.confirmation_explanation')) missingLabels.push('Confirmation Explanation');
      if (getFieldState('investigations_info.investigations_staging').error || submitErrorsForStep.some((e) => e.field === 'investigations_info.investigations_staging')) missingLabels.push('7.2 Extent of Disease / Staging (Written or Upload)');
      if (getFieldState('investigations_info.staging_explanation').error || submitErrorsForStep.some((e) => e.field === 'investigations_info.staging_explanation')) missingLabels.push('Staging Explanation');
    }

    const uniqueLabels = Array.from(new Set(missingLabels));
    if (uniqueLabels.length > 0) {
      toast.error(`Please fill in required fields: ${uniqueLabels.join(', ')}`);
    } else {
      toast.error('Please complete all required fields on this step before advancing');
    }

    return false;
  }

  return true;
}
