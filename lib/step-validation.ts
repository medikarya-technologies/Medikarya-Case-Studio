import type { CaseFormData } from '@/lib/case-schema';
import { validateCaseForSubmit } from '@/lib/case-submit-validation';
import { toast } from 'sonner';

/**
 * Validates required fields for each of the 7 steps in the case wizard.
 * Required fields:
 * Step 1: Case Title, Specialty, Patient Name, Age, Sex
 * Step 2: Presenting Complaints, History of Present Illness
 * Step 6: Provisional Diagnosis
 */
export async function validateStepAndNotify(
  step: number,
  methods: any
): Promise<boolean> {
  const { trigger, getValues, setError, getFieldState } = methods;

  let fieldsToValidate: (keyof CaseFormData)[] = [];
  if (step === 1) fieldsToValidate = ['title', 'specialty', 'difficulty', 'tags', 'patient_details'];
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
      if (
        getFieldState('patient_details.patient_name').error ||
        submitErrorsForStep.some((e) => e.field === 'patient_details.patient_name')
      ) {
        missingLabels.push('Patient Name');
      }
      if (
        getFieldState('patient_details.age').error ||
        submitErrorsForStep.some((e) => e.field === 'patient_details.age')
      ) {
        missingLabels.push('Age');
      }
      if (
        getFieldState('patient_details.sex').error ||
        getFieldState('patient_details.gender').error ||
        submitErrorsForStep.some((e) => e.field.startsWith('patient_details.sex'))
      ) {
        missingLabels.push('Sex');
      }
    }

    if (step === 2) {
      if (
        getFieldState('history.presenting_complaints').error ||
        submitErrorsForStep.some((e) => e.field === 'history.presenting_complaints')
      ) {
        missingLabels.push('Presenting Complaints');
      }
      if (
        getFieldState('history.history_of_present_illness').error ||
        submitErrorsForStep.some((e) => e.field === 'history.history_of_present_illness')
      ) {
        missingLabels.push('History of Present Illness');
      }
    }

    if (step === 6) {
      if (
        getFieldState('diagnosis.provisional_diagnosis').error ||
        submitErrorsForStep.some((e) => e.field === 'diagnosis.provisional_diagnosis')
      ) {
        missingLabels.push('Provisional Diagnosis');
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
