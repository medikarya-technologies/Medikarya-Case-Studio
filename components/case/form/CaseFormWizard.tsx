'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBeforeUnloadWarning, useNavigationGuard } from '@/hooks/use-unsaved-changes';
import { ArrowLeft, Save, Send, Check, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BackButton } from '@/components/ui/BackButton';
import { caseSchema, type CaseFormData } from '@/lib/case-schema';
import {
  CASE_FORM_SECTIONS,
  getSectionByStep,
  getStepFieldsToValidate,
} from '@/lib/case-form-schema';
import { validateCaseForSubmit } from '@/lib/case-submit-validation';
import { saveDraftCase, submitCaseAction } from '@/app/actions/case-actions';
import { fetchCaseAttachmentsAction } from '@/app/actions/attachment-actions';
import { FormSectionRenderer } from './FormSectionRenderer';
import { toast } from 'sonner';
import type { CaseAttachment } from '@/lib/types';

export const DEFAULT_FORM_DATA: CaseFormData = {
  title: '',
  specialty: 'internal_medicine',
  difficulty: 'intermediate',
  tags: [],
  patient_details: {
    patient_id: '',
    age: undefined,
    gender: undefined,
    occupation: '',
    location: '',
    presenting_date: '',
  },
  chief_complaint_history: {
    chief_complaint: '',
    hpi_duration: '',
    hpi_onset: '',
    hpi_aggravating: '',
    hpi_relieving: '',
    hpi_additional: '',
    associated_symptoms: '',
  },
  medical_history: {
    past_medical_history: [],
    custom_medical_history: '',
    family_history: '',
    social_history_smoking: '',
    social_history_alcohol: '',
    social_history_occupation: '',
    allergies: [],
  },
  current_medications: [],
  review_of_systems: {
    cardiovascular: '',
    respiratory: '',
    gastrointestinal: '',
    neurological: '',
    musculoskeletal: '',
    dermatological: '',
    constitutional: '',
    psychiatric: '',
    other: '',
  },
  examination_findings: {
    general_appearance: '',
    vital_signs: {
      bp_systolic: undefined,
      bp_diastolic: undefined,
      hr: undefined,
      rr: undefined,
      temp: undefined,
      spo2: undefined,
      weight: undefined,
      height: undefined,
      bmi: undefined,
    },
    systemic: {
      cardiovascular: '',
      respiratory: '',
      gastrointestinal: '',
      neurological: '',
      musculoskeletal: '',
      dermatological: '',
      thyroid: '',
    },
  },
  investigations: [],
  diagnosis_management: {
    provisional_diagnosis: '',
    differential_diagnoses: [],
    final_diagnosis: '',
    treatment_plan: '',
    medications_prescribed: [],
    follow_up_plan: '',
    prognosis: '',
    outcome: '',
    reference_pdfs: [],
  },
  learning_points: [],
};

export function mergeWithDefaults(initial?: Partial<CaseFormData>): CaseFormData {
  if (!initial) return DEFAULT_FORM_DATA;
  return {
    ...DEFAULT_FORM_DATA,
    ...initial,
    tags: Array.isArray(initial.tags) ? initial.tags : [],
    patient_details: {
      ...DEFAULT_FORM_DATA.patient_details,
      ...(initial.patient_details || {}),
    },
    chief_complaint_history: {
      ...DEFAULT_FORM_DATA.chief_complaint_history,
      ...(initial.chief_complaint_history || {}),
    },
    medical_history: {
      ...DEFAULT_FORM_DATA.medical_history,
      ...(initial.medical_history || {}),
      past_medical_history: Array.isArray(initial.medical_history?.past_medical_history)
        ? initial.medical_history!.past_medical_history
        : [],
      allergies: Array.isArray(initial.medical_history?.allergies)
        ? initial.medical_history!.allergies
        : [],
    },
    current_medications: Array.isArray(initial.current_medications)
      ? initial.current_medications
      : [],
    review_of_systems: {
      ...DEFAULT_FORM_DATA.review_of_systems,
      ...(initial.review_of_systems || {}),
    },
    examination_findings: {
      ...DEFAULT_FORM_DATA.examination_findings,
      ...(initial.examination_findings || {}),
      vital_signs: {
        ...DEFAULT_FORM_DATA.examination_findings?.vital_signs,
        ...(initial.examination_findings?.vital_signs || {}),
      },
      systemic: {
        ...DEFAULT_FORM_DATA.examination_findings?.systemic,
        ...(initial.examination_findings?.systemic || {}),
      },
    },
    investigations: Array.isArray(initial.investigations) ? initial.investigations : [],
    diagnosis_management: {
      ...DEFAULT_FORM_DATA.diagnosis_management,
      ...(initial.diagnosis_management || {}),
      differential_diagnoses: Array.isArray(initial.diagnosis_management?.differential_diagnoses)
        ? initial.diagnosis_management!.differential_diagnoses
        : [],
      medications_prescribed: Array.isArray(initial.diagnosis_management?.medications_prescribed)
        ? initial.diagnosis_management!.medications_prescribed
        : [],
      reference_pdfs: Array.isArray(initial.diagnosis_management?.reference_pdfs)
        ? initial.diagnosis_management!.reference_pdfs
        : [],
    },
    learning_points: Array.isArray(initial.learning_points) ? initial.learning_points : [],
  };
}

interface CaseFormWizardProps {
  initialData?: CaseFormData;
  initialCaseId?: string | null;
  mode: 'create' | 'edit';
  backHref?: string;
  initialAttachments?: CaseAttachment[];
}

export function CaseFormWizard({
  initialData,
  initialCaseId = null,
  mode,
  backHref = '/dashboard/author',
  initialAttachments = [],
}: CaseFormWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [caseId, setCaseId] = useState<string | null>(initialCaseId);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNavigatingNext, setIsNavigatingNext] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [attachments, setAttachments] = useState<CaseAttachment[]>(initialAttachments);

  const methods = useForm<CaseFormData>({
    resolver: zodResolver(caseSchema),
    defaultValues: mergeWithDefaults(initialData),
  });

  const { handleSubmit, getValues, setError, reset, formState: { isDirty } } = methods;

  useEffect(() => {
    if (initialData) {
      reset(mergeWithDefaults(initialData));
    }
  }, [initialData, reset]);

  useEffect(() => {
    setHasUnsavedChanges(isDirty);
  }, [isDirty]);

  useBeforeUnloadWarning(hasUnsavedChanges);
  const { confirmNavigation } = useNavigationGuard(hasUnsavedChanges);

  // Refresh attachments when caseId is set
  useEffect(() => {
    if (caseId) {
      fetchCaseAttachmentsAction(caseId)
        .then(setAttachments)
        .catch((err) => console.error('Error loading attachments:', err));
    }
  }, [caseId]);

  const handleAttachmentUploaded = (attachment: CaseAttachment) => {
    setAttachments((prev) => [attachment, ...prev]);
  };

  const handleAttachmentDeleted = (deletedId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== deletedId));
  };

  const saveDraft = async (status: 'draft' | 'submitted' = 'draft') => {
    const data = getValues();

    if (status === 'draft') {
      setIsSavingDraft(true);
    } else {
      setIsSubmitting(true);
    }

    try {
      const result = await saveDraftCase(data, caseId || undefined);
      setCaseId(result.caseId);
      setLastSavedAt(new Date());
      setHasUnsavedChanges(false);

      if (status === 'submitted') {
        await submitCaseAction(result.caseId);
        toast.success('Case submitted successfully');
      } else {
        toast.success('Draft saved successfully');
      }
      return result.caseId;
    } catch (e) {
      console.error('Error saving case:', e);
      const message = e instanceof Error ? e.message : 'Failed to save case';
      toast.error(message);
      throw e;
    } finally {
      if (status === 'draft') {
        setIsSavingDraft(false);
      } else {
        setIsSubmitting(false);
      }
    }
  };

  const validateStep = async (step: number) => {
    const fieldsToValidate = getStepFieldsToValidate(step);
    const result = await methods.trigger(fieldsToValidate as any);
    return result;
  };

  const handleNextStep = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid) {
      setIsNavigatingNext(true);
      try {
        await saveDraft('draft');
        setCurrentStep((prev) => prev + 1);
      } catch (err) {
        // saveDraft already shows toast
      } finally {
        setIsNavigatingNext(false);
      }
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleSubmitCase = async () => {
    const data = getValues();
    const validationErrors = validateCaseForSubmit(data);

    if (validationErrors.length > 0) {
      validationErrors.forEach((err) => {
        setError(err.field as never, { message: err.message });
      });
      setCurrentStep(validationErrors[0].step);
      setIsPreviewMode(false);
      toast.error(
        `Complete required fields before submitting: ${validationErrors.map((e) => e.message).join('; ')}`
      );
      return false;
    }

    await saveDraft('submitted');
    router.push(backHref);
    return true;
  };

  const onSubmit = async () => {
    await handleSubmitCase();
  };

  const currentSection = getSectionByStep(currentStep);

  if (isPreviewMode) {
    const data = getValues();
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <BackButton href={backHref} onBeforeNavigate={confirmNavigation} />
          <Button variant="outline" onClick={() => setIsPreviewMode(false)}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Edit
          </Button>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">{data.title}</h1>
            <Badge>{data.difficulty}</Badge>
            <Badge variant="secondary">{data.specialty}</Badge>
          </div>
          {data.tags.length > 0 && (
            <div className="flex gap-2">
              {data.tags.map((tag: string, i: number) => (
                <Badge key={i} variant="outline">{tag}</Badge>
              ))}
            </div>
          )}

          <Card>
            <CardHeader><CardTitle>Patient Details</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground">Age</Label><p>{data.patient_details?.age || 'N/A'}</p></div>
                <div><Label className="text-muted-foreground">Gender</Label><p>{data.patient_details?.gender || 'N/A'}</p></div>
                <div><Label className="text-muted-foreground">Occupation</Label><p>{data.patient_details?.occupation || 'N/A'}</p></div>
                <div><Label className="text-muted-foreground">Location</Label><p>{data.patient_details?.location || 'N/A'}</p></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Chief Complaint & HPI</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div><Label className="text-muted-foreground">Chief Complaint</Label><p>{data.chief_complaint_history?.chief_complaint}</p></div>
              <div><Label className="text-muted-foreground">History of Present Illness</Label><p>{data.chief_complaint_history?.hpi_additional}</p></div>
            </CardContent>
          </Card>
        </div>
        <div className="flex justify-between gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => setIsPreviewMode(false)}
            disabled={isSubmitting}
          >
            Back to Edit
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Submit Case
          </Button>
        </div>
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <BackButton href={backHref} onBeforeNavigate={confirmNavigation} />
          {lastSavedAt && (
            <span className="text-xs text-muted-foreground">
              Last saved: {lastSavedAt.toLocaleTimeString()}
            </span>
          )}
        </div>

        <div>
          <h1 className="text-2xl font-bold">{mode === 'create' ? 'New Case' : 'Edit Case'}</h1>
          <p className="text-muted-foreground mt-1">
            Step {currentStep} of {CASE_FORM_SECTIONS.length} — {currentSection?.title}
          </p>
        </div>

        {/* Step Indicator Header */}
        <div className="flex items-center justify-between overflow-x-auto pb-2">
          {CASE_FORM_SECTIONS.map((section, i) => (
            <div key={section.id} className="flex items-center min-w-0">
              <div className="flex flex-col items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 text-xs sm:text-sm font-semibold shrink-0 cursor-pointer ${
                    section.stepNumber < currentStep
                      ? 'bg-primary border-primary text-primary-foreground'
                      : section.stepNumber === currentStep
                      ? 'border-primary text-primary'
                      : 'border-muted-foreground text-muted-foreground'
                  }`}
                  onClick={async () => {
                    if (section.stepNumber < currentStep) {
                      setCurrentStep(section.stepNumber);
                    } else if (section.stepNumber === currentStep + 1) {
                      await handleNextStep();
                    }
                  }}
                >
                  {section.stepNumber < currentStep ? (
                    <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    section.stepNumber
                  )}
                </div>
                <span className="mt-2 text-xs font-medium text-center w-16 sm:w-20 hidden sm:block">
                  {section.title}
                </span>
              </div>
              {i < CASE_FORM_SECTIONS.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-1 sm:mx-2 min-w-[12px] ${
                    section.stepNumber < currentStep ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {currentSection && (
            <FormSectionRenderer
              section={currentSection}
              caseId={caseId}
              attachments={attachments}
              onAttachmentUploaded={handleAttachmentUploaded}
              onAttachmentDeleted={handleAttachmentDeleted}
            />
          )}

          {/* Navigation Controls */}
          <div className="flex justify-between gap-4 pt-4 border-t">
            <div>
              {currentStep > 1 && (
                <Button type="button" variant="outline" onClick={handlePrevStep}>
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => saveDraft('draft')}
                disabled={isSavingDraft || isNavigatingNext}
              >
                {isSavingDraft ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Draft
              </Button>

              {currentStep < CASE_FORM_SECTIONS.length ? (
                <Button
                  type="button"
                  onClick={handleNextStep}
                  disabled={isNavigatingNext || isSavingDraft}
                >
                  {isNavigatingNext ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <>
                      Next
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => setIsPreviewMode(true)}
                >
                  Preview & Submit
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </FormProvider>
  );
}
