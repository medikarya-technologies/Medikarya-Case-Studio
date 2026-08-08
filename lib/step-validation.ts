import type { CaseFormData } from '@/lib/case-schema';
import { validateCaseForSubmit } from '@/lib/case-submit-validation';
import { toast } from 'sonner';

/**
 * Validates only the required fields for a specific step in the case wizard.
 * If validation fails:
 * - Sets field-level errors (for inline displays)
 * - Shows a Sonner toast listing the exact missing fields on this step (e.g. "Please fill in: History of Present Illness, Chief Complaint")
 * - Returns false to block navigation
 */
export async function validateStepAndNotify(
  step: number,
  methods: any
): Promise<boolean> {
  const { trigger, getValues, setError, getFieldState } = methods;

  let fieldsToValidate: (keyof CaseFormData)[] = [];
  if (step === 1) fieldsToValidate = ['title', 'specialty', 'difficulty', 'tags', 'patient_details'];
  if (step === 2) fieldsToValidate = ['chief_complaint_history'];
  if (step === 3) fieldsToValidate = ['medical_history', 'current_medications', 'review_of_systems'];
  if (step === 4) fieldsToValidate = ['examination_findings'];
  if (step === 5) fieldsToValidate = ['investigations'];
  if (step === 6) fieldsToValidate = ['diagnosis_management', 'learning_points'];

  // Trigger RHF/Zod validation for this step
  const isValidZod = await trigger(fieldsToValidate as any);

  // Check fallback submit validation for this step
  const data = getValues();
  const submitErrorsForStep = validateCaseForSubmit(data).filter((err) => err.step === step);

  if (submitErrorsForStep.length > 0) {
    submitErrorsForStep.forEach((err) => {
      setError(err.field as any, { type: 'manual', message: err.message });
    });
  }

  const isStepValid = isValidZod && submitErrorsForStep.length === 0;

  if (!isStepValid) {
    const missingLabels: string[] = [];

    if (step === 1) {
      if (getFieldState('title').error || submitErrorsForStep.some((e) => e.field === 'title')) {
        missingLabels.push('Case Title');
      }
      if (getFieldState('specialty').error || submitErrorsForStep.some((e) => e.field === 'specialty')) {
        missingLabels.push('Specialty');
      }
    }

    if (step === 2) {
      if (
        getFieldState('chief_complaint_history.chief_complaint').error ||
        submitErrorsForStep.some((e) => e.field === 'chief_complaint_history.chief_complaint')
      ) {
        missingLabels.push('Chief Complaint');
      }
      if (
        getFieldState('chief_complaint_history.hpi_additional').error ||
        submitErrorsForStep.some((e) => e.field === 'chief_complaint_history.hpi_additional')
      ) {
        missingLabels.push('History of Present Illness');
      }
    }

    if (step === 3) {
      if (getFieldState('current_medications').error) {
        missingLabels.push('Current Medications');
      }
    }

    if (step === 4) {
      if (
        getFieldState('examination_findings.general_appearance').error ||
        submitErrorsForStep.some((e) => e.field === 'examination_findings.general_appearance')
      ) {
        missingLabels.push('General Appearance');
      }
    }

    if (step === 5) {
      if (getFieldState('investigations').error) {
        missingLabels.push('Investigations');
      }
    }

    if (step === 6) {
      if (
        getFieldState('diagnosis_management.final_diagnosis').error ||
        submitErrorsForStep.some((e) => e.field === 'diagnosis_management.final_diagnosis')
      ) {
        missingLabels.push('Final Diagnosis');
      }
      if (
        getFieldState('diagnosis_management.treatment_plan').error ||
        submitErrorsForStep.some((e) => e.field === 'diagnosis_management.treatment_plan')
      ) {
        missingLabels.push('Treatment Plan');
      }
      if (
        getFieldState('diagnosis_management.outcome').error ||
        submitErrorsForStep.some((e) => e.field === 'diagnosis_management.outcome')
      ) {
        missingLabels.push('Outcome');
      }
    }

    const uniqueLabels = Array.from(new Set(missingLabels));
    if (uniqueLabels.length > 0) {
      toast.error(`Please fill in: ${uniqueLabels.join(', ')}`);
    } else {
      toast.error('Please complete required fields before advancing');
    }

    return false;
  }

  return true;
}
