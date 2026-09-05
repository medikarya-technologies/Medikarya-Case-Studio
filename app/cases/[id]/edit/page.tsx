'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useBeforeUnloadWarning, useNavigationGuard } from '@/hooks/use-unsaved-changes';
import { useLocalDraft } from '@/hooks/use-local-draft';
import { Save, Send, Check, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { useForm, Controller, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/case/form/RichTextEditor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BackButton } from '@/components/ui/BackButton';
import { useUser } from '@clerk/nextjs';
import { caseSchema, type CaseFormData } from '@/lib/case-schema';
import { validateCaseForSubmit } from '@/lib/case-submit-validation';
import { validateStepAndNotify } from '@/lib/step-validation';
import type { Case, CaseAttachment } from '@/lib/types';
import { saveDraftCase, submitCaseAction, fetchCaseById } from '@/app/actions/case-actions';
import { AttachmentUploader } from '@/components/attachments/AttachmentUploader';
import { AttachmentGallery } from '@/components/attachments/AttachmentGallery';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { CustomFieldsSection } from '@/components/case/form/CustomFieldsSection';

import { formatSpecialtyLabel } from '@/lib/specialtyIcons';

const STEPS = [
  { number: 1, title: 'Patient Details' },
  { number: 2, title: 'History' },
  { number: 3, title: 'General Physical Exam' },
  { number: 4, title: 'Systemic Exam' },
  { number: 5, title: 'Local Exam' },
  { number: 6, title: 'Diagnosis' },
  { number: 7, title: 'Investigations' },
];

const DEFAULT_FORM_DATA: CaseFormData = {
  title: '',
  original_author_name: '',
  specialty: 'internal_medicine',
  custom_specialty: '',
  difficulty: 'intermediate',
  tags: [],
  patient_details: {
    case_no: '',
    patient_name: '',
    age: undefined as any,
    sex: undefined as any,
    religion: '',
    occupation: '',
    address: '',
    date_of_admission: '',
  },
  history: {
    presenting_complaints: '',
    history_of_present_illness: '',
    past_history: '',
    personal_history: '',
    treatment_history: '',
    family_history: '',
    menstrual_history: '',
    obstetric_history: '',
    socio_economic_history: '',
    any_other: '',
  },
  general_physical_examination: {
    consciousness_orientation: '',
    pallor: '',
    cyanosis: '',
    icterus: '',
    peripheral_oedema: '',
    clubbing: '',
    jvp: '',
    lymph_nodes: {
      cervical: '',
      axillary: '',
      inguinal: '',
    },
    pulse: '',
    bp: '',
    respiratory_rate: '',
    temperature: '',
    other_significant_findings: '',
  },
  systemic_examination: {
    respiratory_system: '',
    cardiovascular_system: '',
    nervous_system: '',
    genito_urinary_system: '',
    gastrointestinal_system: '',
  },
  local_examination: {
    region: '',
    inspection: '',
    palpation: '',
    percussion: '',
    auscultation: '',
  },
  diagnosis: {
    provisional_diagnosis: '',
    differential_diagnosis: '',
  },
  investigations_info: {
    confirmation_performed: 'yes',
    investigations_confirmation: '',
    confirmation_explanation: '',
    staging_applicable: 'yes',
    investigations_staging: '',
    staging_explanation: '',
  },
  custom_fields: [],
};

export default function EditCasePage() {
  const router = useRouter();
  const params = useParams();
  const { isLoaded } = useUser();
  const [currentStep, setCurrentStep] = useState(1);
  const caseId = params.id as string;
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [attachments, setAttachments] = useState<CaseAttachment[]>([]);
  const [isLoadingCase, setIsLoadingCase] = useState(true);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNavigatingNext, setIsNavigatingNext] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const handleAttachmentUploaded = (newAtt: CaseAttachment) => {
    setAttachments((prev) => [...prev, newAtt]);
  };

  const handleAttachmentDeleted = (deletedId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== deletedId));
  };

  const methods = useForm<CaseFormData>({
    resolver: zodResolver(caseSchema),
    defaultValues: DEFAULT_FORM_DATA,
  });
  const { control, handleSubmit, watch, getValues, reset, setError, formState: { errors, isDirty } } = methods;

  const localRegion = watch('local_examination.region');
  const patientSex = watch('patient_details.sex') || watch('patient_details.gender' as any);
  const selectedSpecialty = watch('specialty');
  const confirmationPerformed = watch('investigations_info.confirmation_performed') || 'yes';
  const stagingApplicable = watch('investigations_info.staging_applicable') || 'yes';

  // Persist form to localStorage per-case so refreshes / tab switches don't wipe state or step
  const { clearDraft } = useLocalDraft(`case-draft-${caseId}`, watch, reset, {
    currentStep,
    onRestoreStep: setCurrentStep,
  });

  useBeforeUnloadWarning(isDirty);
  const { confirmNavigation } = useNavigationGuard(isDirty);

  // Fetch case data
  useEffect(() => {
    if (!isLoaded || !caseId) return;

    async function fetchCase() {
      setIsLoadingCase(true);
      try {
        const data = await fetchCaseById(caseId);

        if (data) {
          setCaseData(data);
          setAttachments(data.attachments || []);

          // If a local draft exists for this case, don't overwrite it with server
          // data — the useLocalDraft hook already restored it silently above.
          const localDraftRaw = localStorage.getItem(`case-draft-${caseId}`);
          let localDraftHasContent = false;
          if (localDraftRaw) {
            try {
              const saved = JSON.parse(localDraftRaw);
              if (typeof saved?.title === 'string' && saved.title.trim().length > 0) {
                localDraftHasContent = true;
              }
            } catch {
              // corrupt — ignore, fall through to server reset
            }
          }

          if (localDraftHasContent) {
            // Local draft wins — don't call reset() so the restored draft stays
            return;
          }

          // No local draft: populate form from server data as normal
          reset({
            title: data.title || '',
            original_author_name: data.original_author_name || '',
            specialty: data.specialty || 'internal_medicine',
            custom_specialty: data.custom_specialty || (data.patient_details as any)?.custom_specialty || '',
            difficulty: data.difficulty || 'intermediate',
            tags: data.tags || [],
            patient_details: {
              case_no: data.patient_details?.case_no || '',
              patient_name: data.patient_details?.patient_name || '',
              age: data.patient_details?.age,
              sex: data.patient_details?.sex || data.patient_details?.gender,
              religion: data.patient_details?.religion || '',
              occupation: data.patient_details?.occupation || '',
              address: data.patient_details?.address || data.patient_details?.location || '',
              date_of_admission: data.patient_details?.date_of_admission || data.patient_details?.presenting_date || '',
            },
            history: {
              presenting_complaints:
                data.history?.presenting_complaints ||
                data.chief_complaint_history?.chief_complaint ||
                '',
              history_of_present_illness:
                data.history?.history_of_present_illness ||
                data.chief_complaint_history?.hpi_additional ||
                '',
              past_history:
                data.history?.past_history ||
                (data.medical_history?.past_medical_history
                  ? data.medical_history.past_medical_history.join(', ')
                  : ''),
              personal_history: data.history?.personal_history || '',
              treatment_history: data.history?.treatment_history || '',
              family_history:
                data.history?.family_history || data.medical_history?.family_history || '',
              menstrual_history: data.history?.menstrual_history || '',
              obstetric_history: data.history?.obstetric_history || '',
              socio_economic_history: data.history?.socio_economic_history || '',
              any_other: data.history?.any_other || '',
            },
            general_physical_examination: {
              consciousness_orientation:
                data.general_physical_examination?.consciousness_orientation ||
                data.examination_findings?.general_appearance ||
                '',
              pallor: data.general_physical_examination?.pallor || '',
              cyanosis: data.general_physical_examination?.cyanosis || '',
              icterus: data.general_physical_examination?.icterus || '',
              peripheral_oedema: data.general_physical_examination?.peripheral_oedema || '',
              clubbing: data.general_physical_examination?.clubbing || '',
              jvp: data.general_physical_examination?.jvp || '',
              lymph_nodes: {
                cervical: data.general_physical_examination?.lymph_nodes?.cervical || '',
                axillary: data.general_physical_examination?.lymph_nodes?.axillary || '',
                inguinal: data.general_physical_examination?.lymph_nodes?.inguinal || '',
              },
              pulse:
                data.general_physical_examination?.pulse ||
                (data.examination_findings?.vital_signs?.hr
                  ? `${data.examination_findings.vital_signs.hr} bpm`
                  : ''),
              bp:
                data.general_physical_examination?.bp ||
                (data.examination_findings?.vital_signs?.bp_systolic &&
                data.examination_findings?.vital_signs?.bp_diastolic
                  ? `${data.examination_findings.vital_signs.bp_systolic}/${data.examination_findings.vital_signs.bp_diastolic} mmHg`
                  : ''),
              respiratory_rate:
                data.general_physical_examination?.respiratory_rate ||
                (data.examination_findings?.vital_signs?.rr
                  ? `${data.examination_findings.vital_signs.rr} /min`
                  : ''),
              temperature:
                data.general_physical_examination?.temperature ||
                (data.examination_findings?.vital_signs?.temp
                  ? `${data.examination_findings.vital_signs.temp} °C`
                  : ''),
              other_significant_findings:
                data.general_physical_examination?.other_significant_findings || '',
            },
            systemic_examination: {
              respiratory_system:
                data.systemic_examination?.respiratory_system ||
                data.examination_findings?.systemic?.respiratory ||
                '',
              cardiovascular_system:
                data.systemic_examination?.cardiovascular_system ||
                data.examination_findings?.systemic?.cardiovascular ||
                '',
              nervous_system:
                data.systemic_examination?.nervous_system ||
                data.examination_findings?.systemic?.neurological ||
                '',
              genito_urinary_system: data.systemic_examination?.genito_urinary_system || '',
              gastrointestinal_system:
                data.systemic_examination?.gastrointestinal_system ||
                data.examination_findings?.systemic?.gastrointestinal ||
                '',
            },
            local_examination: {
              region: data.local_examination?.region || '',
              inspection:
                data.local_examination?.inspection ||
                data.examination_findings?.local?.other_local_findings ||
                '',
              palpation: data.local_examination?.palpation || '',
              percussion: data.local_examination?.percussion || '',
              auscultation: data.local_examination?.auscultation || '',
            },
            diagnosis: {
              provisional_diagnosis:
                data.diagnosis?.provisional_diagnosis ||
                data.diagnosis_management?.provisional_diagnosis ||
                data.diagnosis_management?.final_diagnosis ||
                '',
              differential_diagnosis:
                data.diagnosis?.differential_diagnosis ||
                (data.diagnosis_management?.differential_diagnoses
                  ? data.diagnosis_management.differential_diagnoses.join(', ')
                  : ''),
            },
            investigations_info: {
              confirmation_performed: data.investigations_info?.confirmation_performed || 'yes',
              investigations_confirmation: data.investigations_info?.investigations_confirmation || '',
              confirmation_explanation: data.investigations_info?.confirmation_explanation || '',
              staging_applicable: data.investigations_info?.staging_applicable || 'yes',
              investigations_staging: data.investigations_info?.investigations_staging || '',
              staging_explanation: data.investigations_info?.staging_explanation || '',
            },
            custom_fields: data.custom_fields || [],
          });
        }
      } catch (e) {
        console.error('Error loading case:', e);
        toast.error('Failed to load case');
      } finally {
        setIsLoadingCase(false);
      }
    }

    fetchCase();
  }, [caseId, isLoaded, reset]);

  const saveDraft = async (status: 'draft' | 'submitted' = 'draft') => {
    const data = getValues();

    if (status === 'draft') {
      setIsSavingDraft(true);
    } else {
      setIsSubmitting(true);
    }

    try {
      await saveDraftCase(data, caseId);
      setLastSavedAt(new Date());

      if (status === 'submitted') {
        await submitCaseAction(caseId);
        clearDraft(); // Only clear localStorage when fully submitted
        toast.success('Case submitted successfully');
        router.push('/dashboard/author');
      } else {
        toast.success('Draft saved successfully');
        // Keep localStorage draft — it acts as a backup even after server save
      }
    } catch (e) {
      console.error('Error saving case:', e);
      const message = e instanceof Error ? e.message : 'Failed to save case';
      toast.error(message);
    } finally {
      setIsSavingDraft(false);
      setIsSubmitting(false);
    }
  };

  const handleSubmitCase = async () => {
    const data = getValues();
    const validationErrors = validateCaseForSubmit(data, attachments);

    if (validationErrors.length > 0) {
      validationErrors.forEach((err) => {
        setError(err.field as never, { message: err.message });
      });
      setCurrentStep(validationErrors[0].step);
      setIsPreviewMode(false);
      toast.error(
        `Complete required fields before submitting: ${validationErrors.map((e) => e.message).join('; ')}`
      );
      return;
    }

    await saveDraft('submitted');
  };

  const handleNextStep = async () => {
    const isValid = await validateStepAndNotify(currentStep, methods, attachments);
    if (isValid) {
      setIsNavigatingNext(true);
      try {
        await saveDraft();
        setCurrentStep(currentStep + 1);
      } finally {
        setIsNavigatingNext(false);
      }
    }
  };

  const handleStepClick = async (targetStep: number) => {
    if (targetStep === currentStep) return;
    if (targetStep < currentStep) {
      setCurrentStep(targetStep);
      return;
    }
    for (let s = currentStep; s < targetStep; s++) {
      const isValid = await validateStepAndNotify(s, methods, attachments);
      if (!isValid) {
        setCurrentStep(s);
        return;
      }
    }
    setCurrentStep(targetStep);
  };

  const handlePrevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const onSubmit = async () => {
    await handleSubmitCase();
  };

  if (!isLoaded || isLoadingCase) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-6 w-40" />
        <div className="flex justify-between">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-10 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <p className="text-muted-foreground">Case not found</p>
      </div>
    );
  }

  const steps = STEPS;

  if (isPreviewMode) {
    const data = getValues();
    const localTitle = data.local_examination?.region?.trim()
      ? `Local Examination (${data.local_examination.region.trim()})`
      : 'Local Examination';

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <BackButton href={`/cases/${caseId}`} onBeforeNavigate={confirmNavigation} />
          <Button variant="outline" onClick={() => setIsPreviewMode(false)}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Edit
          </Button>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{data.title}</h1>
            <div className="flex gap-2 items-center">
              <Badge>{data.difficulty}</Badge>
              <Badge variant="secondary">{formatSpecialtyLabel(data.specialty, data.custom_specialty)}</Badge>
            </div>
          </div>

          <Card>
            <CardHeader><CardTitle>1. Patient Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div><Label className="text-muted-foreground">Case No.</Label><p>{data.patient_details.case_no}</p></div>
              <div><Label className="text-muted-foreground">Patient Name</Label><p className="font-semibold">{data.patient_details.patient_name}</p></div>
              <div><Label className="text-muted-foreground">Age</Label><p>{data.patient_details.age}</p></div>
              <div><Label className="text-muted-foreground">Sex</Label><p className="capitalize">{data.patient_details.sex}</p></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>2. History</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><Label className="text-muted-foreground">Presenting Complaints</Label><p className="font-medium">{data.history.presenting_complaints}</p></div>
              <div><Label className="text-muted-foreground">History of Present Illness</Label><p>{data.history.history_of_present_illness}</p></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>5. {localTitle}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {data.local_examination?.inspection && <div><Label className="text-muted-foreground">Inspection</Label><p>{data.local_examination.inspection}</p></div>}
              {data.local_examination?.palpation && <div><Label className="text-muted-foreground">Palpation</Label><p>{data.local_examination.palpation}</p></div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>6. Diagnosis</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><Label className="text-muted-foreground">Provisional Diagnosis</Label><p className="font-semibold">{data.diagnosis.provisional_diagnosis}</p></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>7. Investigations</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="p-3 border rounded-md space-y-2">
                <p className="font-semibold text-foreground">7.1 Confirmation of Diagnosis</p>
                {data.investigations_info?.confirmation_performed === 'no' ? (
                  <p className="text-muted-foreground">Not Performed: {data.investigations_info?.confirmation_explanation || 'No reason provided.'}</p>
                ) : data.investigations_info?.confirmation_performed === 'not_required' ? (
                  <p className="text-muted-foreground">Not Required: {data.investigations_info?.confirmation_explanation || 'Clinical diagnosis established.'}</p>
                ) : (
                  <div>
                    {data.investigations_info?.investigations_confirmation ? (
                      <div dangerouslySetInnerHTML={{ __html: data.investigations_info.investigations_confirmation }} />
                    ) : (
                      <p className="text-muted-foreground italic">Written findings not entered (see attached reports/scans).</p>
                    )}
                  </div>
                )}
                {attachments.filter((a) => a.investigation_group === 'confirmation').length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Attached Reports / Scans ({attachments.filter((a) => a.investigation_group === 'confirmation').length})</p>
                    <AttachmentGallery attachments={attachments.filter((a) => a.investigation_group === 'confirmation')} canDelete={false} />
                  </div>
                )}
              </div>

              <div className="p-3 border rounded-md space-y-2">
                <p className="font-semibold text-foreground">7.2 Determining Extent of Disease (Staging)</p>
                {data.investigations_info?.staging_applicable === 'no' ? (
                  <p className="text-muted-foreground">Not Applicable {data.investigations_info?.staging_explanation ? `(${data.investigations_info.staging_explanation})` : ''}</p>
                ) : (
                  <div>
                    {data.investigations_info?.investigations_staging ? (
                      <div dangerouslySetInnerHTML={{ __html: data.investigations_info.investigations_staging }} />
                    ) : (
                      <p className="text-muted-foreground italic">Written findings not entered (see attached reports/scans).</p>
                    )}
                  </div>
                )}
                {attachments.filter((a) => a.investigation_group === 'staging').length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Attached Staging Reports / Scans ({attachments.filter((a) => a.investigation_group === 'staging').length})</p>
                    <AttachmentGallery attachments={attachments.filter((a) => a.investigation_group === 'staging')} canDelete={false} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsPreviewMode(false)} disabled={isSubmitting}>
            Back to Edit
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Submit Case
          </Button>
        </div>
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <div className="max-w-4xl mx-auto space-y-6">
        <BackButton href={`/cases/${caseId}`} onBeforeNavigate={confirmNavigation} />

        {/* Step Indicator */}
        <div className="flex items-center justify-between overflow-x-auto pb-2">
          {steps.map((step, i) => (
            <div key={step.number} className="flex items-center min-w-0">
              <button
                type="button"
                onClick={() => handleStepClick(step.number)}
                className="flex flex-col items-center focus:outline-none group cursor-pointer"
              >
                <div
                  className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 text-xs sm:text-sm font-semibold shrink-0 transition-colors ${
                    step.number < currentStep
                      ? 'bg-primary border-primary text-primary-foreground group-hover:bg-primary/90'
                      : step.number === currentStep
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'border-muted-foreground text-muted-foreground group-hover:border-primary/50'
                  }`}
                >
                  {step.number < currentStep ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : step.number}
                </div>
                <span className="mt-2 text-xs font-medium text-center w-16 sm:w-20 hidden sm:block">
                  {step.title}
                </span>
              </button>
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-1 sm:mx-2 min-w-[12px] ${
                    step.number < currentStep ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Animated step content wrapper — re-mounts on step change for smooth transition */}
          <div key={currentStep} className="step-enter space-y-4">
          {/* Step 1: Patient Details & Case Metadata */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle>Case Metadata</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
                    <Controller
                      name="title"
                      control={control}
                      render={({ field }: any) => <Input id="title" placeholder="Case title..." {...field} />}
                    />
                    {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="specialty">Specialty <span className="text-destructive">*</span></Label>
                      <Controller
                        name="specialty"
                        control={control}
                        render={({ field }: any) => (
                          <select
                            id="specialty"
                            {...field}
                            className="select-field"
                          >
                            <option value="cardiology">Cardiology</option>
                            <option value="pulmonology">Pulmonology</option>
                            <option value="gastroenterology">Gastroenterology</option>
                            <option value="neurology">Neurology</option>
                            <option value="orthopedics">Orthopedics</option>
                            <option value="dermatology">Dermatology</option>
                            <option value="emergency_medicine">Emergency Medicine</option>
                            <option value="family_medicine">Family Medicine</option>
                            <option value="internal_medicine">Internal Medicine</option>
                            <option value="pediatrics">Pediatrics</option>
                            <option value="other">Other (e.g. General Surgery, ENT, etc.)</option>
                          </select>
                        )}
                      />
                      {errors.specialty && <p className="text-sm text-destructive">{errors.specialty.message}</p>}
                    </div>

                    {selectedSpecialty === 'other' && (
                      <div className="space-y-2 pt-1 md:col-span-2">
                        <Label htmlFor="custom_specialty">
                          Specify Specialty / Category <span className="text-destructive">*</span>
                        </Label>
                        <Controller
                          name="custom_specialty"
                          control={control}
                          render={({ field }: any) => (
                            <Input
                              id="custom_specialty"
                              placeholder="e.g. General Surgery, Ophthalmology, ENT, Psychiatry..."
                              {...field}
                              value={field.value || ''}
                            />
                          )}
                        />
                        {errors.custom_specialty && (
                          <p className="text-sm text-destructive">{errors.custom_specialty.message}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          This case will display as <strong className="text-foreground">Other — {watch('custom_specialty') || 'Custom Specialty'}</strong> in case lists, searches, and exports.
                        </p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Difficulty</Label>
                      <Controller
                        name="difficulty"
                        control={control}
                        render={({ field }: any) => (
                          <select
                            {...field}
                            className="select-field"
                          >
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                          </select>
                        )}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="original_author_name">Original Author (if different from you)</Label>
                    <Controller
                      name="original_author_name"
                      control={control}
                      render={({ field }: any) => (
                        <Input
                          id="original_author_name"
                          placeholder="e.g. Dr. Jane Doe (leave blank if you are the original author)"
                          {...field}
                          value={field.value || ''}
                        />
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>1. Patient Details</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Case No. <span className="text-destructive">*</span></Label>
                    <Controller
                      name="patient_details.case_no"
                      control={control}
                      render={({ field }: any) => <Input placeholder="Case No." {...field} value={field.value || ''} />}
                    />
                    {errors.patient_details?.case_no && (
                      <p className="text-sm text-destructive">{errors.patient_details.case_no.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Patient Name <span className="text-destructive">*</span></Label>
                    <Controller
                      name="patient_details.patient_name"
                      control={control}
                      render={({ field }: any) => <Input placeholder="Full patient name" {...field} value={field.value || ''} />}
                    />
                    {errors.patient_details?.patient_name && (
                      <p className="text-sm text-destructive">{errors.patient_details.patient_name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Age <span className="text-destructive">*</span></Label>
                    <Controller
                      name="patient_details.age"
                      control={control}
                      render={({ field }: any) => (
                        <Input
                          type="number"
                          placeholder="Age"
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(val === '' ? undefined : Number(val));
                          }}
                        />
                      )}
                    />
                    {errors.patient_details?.age && (
                      <p className="text-sm text-destructive">{errors.patient_details.age.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Sex <span className="text-destructive">*</span></Label>
                    <Controller
                      name="patient_details.sex"
                      control={control}
                      render={({ field }: any) => (
                        <select
                          {...field}
                          value={field.value || ''}
                          className="select-field"
                        >
                          <option value="">Select sex</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      )}
                    />
                    {errors.patient_details?.sex && (
                      <p className="text-sm text-destructive">{errors.patient_details.sex.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Religion <span className="text-destructive">*</span></Label>
                    <Controller
                      name="patient_details.religion"
                      control={control}
                      render={({ field }: any) => <Input placeholder="Religion" {...field} value={field.value || ''} />}
                    />
                    {errors.patient_details?.religion && (
                      <p className="text-sm text-destructive">{errors.patient_details.religion.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Occupation <span className="text-destructive">*</span></Label>
                    <Controller
                      name="patient_details.occupation"
                      control={control}
                      render={({ field }: any) => <Input placeholder="Occupation" {...field} value={field.value || ''} />}
                    />
                    {errors.patient_details?.occupation && (
                      <p className="text-sm text-destructive">{errors.patient_details.occupation.message}</p>
                    )}
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Address <span className="text-destructive">*</span></Label>
                    <Controller
                      name="patient_details.address"
                      control={control}
                      render={({ field }: any) => <Input placeholder="Address" {...field} value={field.value || ''} />}
                    />
                    {errors.patient_details?.address && (
                      <p className="text-sm text-destructive">{errors.patient_details.address.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="date_of_admission">Date of Admission <span className="text-xs text-muted-foreground font-normal">(Optional)</span></Label>
                      {watch('patient_details.date_of_admission') && (
                        <button
                          type="button"
                          onClick={() => setValue('patient_details.date_of_admission', '')}
                          className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <Controller
                      name="patient_details.date_of_admission"
                      control={control}
                      render={({ field }: any) => <Input id="date_of_admission" type="date" {...field} value={field.value || ''} />}
                    />
                  </div>
                </CardContent>
              </Card>

              <CustomFieldsSection sectionId="patient_details" sectionTitle="Patient Details" />
            </div>
          )}

          {/* Step 2: History */}
          {currentStep === 2 && (
            <Card>
              <CardHeader><CardTitle>2. History</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Presenting Complaints <span className="text-destructive">*</span></Label>
                  <Controller
                    name="history.presenting_complaints"
                    control={control}
                    render={({ field }: any) => (
                      <RichTextEditor placeholder="Presenting complaints..." value={field.value || ''} onChange={field.onChange} minHeight="90px" />
                    )}
                  />
                  {errors.history?.presenting_complaints && (
                    <p className="text-sm text-destructive">{errors.history.presenting_complaints.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>History of Present Illness <span className="text-destructive">*</span></Label>
                  <Controller
                    name="history.history_of_present_illness"
                    control={control}
                    render={({ field }: any) => (
                      <RichTextEditor placeholder="History of present illness..." value={field.value || ''} onChange={field.onChange} minHeight="120px" />
                    )}
                  />
                  {errors.history?.history_of_present_illness && (
                    <p className="text-sm text-destructive">{errors.history.history_of_present_illness.message}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Past History <span className="text-destructive">*</span></Label>
                    <Controller
                      name="history.past_history"
                      control={control}
                      render={({ field }: any) => <RichTextEditor placeholder="Past history..." value={field.value || ''} onChange={field.onChange} minHeight="80px" />}
                    />
                    {errors.history?.past_history && (
                      <p className="text-sm text-destructive">{errors.history.past_history.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Personal History <span className="text-destructive">*</span></Label>
                    <Controller
                      name="history.personal_history"
                      control={control}
                      render={({ field }: any) => <RichTextEditor placeholder="Personal history..." value={field.value || ''} onChange={field.onChange} minHeight="80px" />}
                    />
                    {errors.history?.personal_history && (
                      <p className="text-sm text-destructive">{errors.history.personal_history.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Treatment History <span className="text-destructive">*</span></Label>
                    <Controller
                      name="history.treatment_history"
                      control={control}
                      render={({ field }: any) => <RichTextEditor placeholder="Treatment history..." value={field.value || ''} onChange={field.onChange} minHeight="80px" />}
                    />
                    {errors.history?.treatment_history && (
                      <p className="text-sm text-destructive">{errors.history.treatment_history.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Family History <span className="text-destructive">*</span></Label>
                    <Controller
                      name="history.family_history"
                      control={control}
                      render={({ field }: any) => <RichTextEditor placeholder="Family history..." value={field.value || ''} onChange={field.onChange} minHeight="80px" />}
                    />
                    {errors.history?.family_history && (
                      <p className="text-sm text-destructive">{errors.history.family_history.message}</p>
                    )}
                  </div>

                  {/* Conditional Menstrual & Obstetric History based on Sex */}
                  {patientSex === 'male' ? (
                    <div className="col-span-2 p-3 border rounded bg-muted/20 text-xs text-muted-foreground italic">
                      Note: Menstrual History & Obstetric History are marked Not Applicable for Male patients.
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>Menstrual History <span className="text-destructive">*</span></Label>
                        <Controller
                          name="history.menstrual_history"
                          control={control}
                          render={({ field }: any) => <RichTextEditor placeholder="Menstrual history..." value={field.value || ''} onChange={field.onChange} minHeight="80px" />}
                        />
                        {errors.history?.menstrual_history && (
                          <p className="text-sm text-destructive">{errors.history.menstrual_history.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Obstetric History <span className="text-destructive">*</span></Label>
                        <Controller
                          name="history.obstetric_history"
                          control={control}
                          render={({ field }: any) => <RichTextEditor placeholder="Obstetric history..." value={field.value || ''} onChange={field.onChange} minHeight="80px" />}
                        />
                        {errors.history?.obstetric_history && (
                          <p className="text-sm text-destructive">{errors.history.obstetric_history.message}</p>
                        )}
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label>Socio-economic History <span className="text-destructive">*</span></Label>
                    <Controller
                      name="history.socio_economic_history"
                      control={control}
                      render={({ field }: any) => <RichTextEditor placeholder="Socio-economic history..." value={field.value || ''} onChange={field.onChange} minHeight="80px" />}
                    />
                    {errors.history?.socio_economic_history && (
                      <p className="text-sm text-destructive">{errors.history.socio_economic_history.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Any Other <span className="text-destructive">*</span></Label>
                    <Controller
                      name="history.any_other"
                      control={control}
                      render={({ field }: any) => <RichTextEditor placeholder="Any other notes..." value={field.value || ''} onChange={field.onChange} minHeight="80px" />}
                    />
                    {errors.history?.any_other && (
                      <p className="text-sm text-destructive">{errors.history.any_other.message}</p>
                    )}
                  </div>
                </div>
                <CustomFieldsSection sectionId="history" sectionTitle="History" />
              </CardContent>
            </Card>
          )}

          {/* Step 3: General Physical Examination */}
          {currentStep === 3 && (
            <Card>
              <CardHeader><CardTitle>3. General Physical Examination</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Consciousness / Orientation <span className="text-destructive">*</span></Label>
                    <Controller
                      name="general_physical_examination.consciousness_orientation"
                      control={control}
                      render={({ field }: any) => <Input placeholder="e.g. Conscious & Oriented x 3" {...field} value={field.value || ''} />}
                    />
                    {errors.general_physical_examination?.consciousness_orientation && (
                      <p className="text-sm text-destructive">{errors.general_physical_examination.consciousness_orientation.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Pulse <span className="text-destructive">*</span></Label>
                    <Controller
                      name="general_physical_examination.pulse"
                      control={control}
                      render={({ field }: any) => <Input placeholder="e.g. 72 bpm, regular" {...field} value={field.value || ''} />}
                    />
                    {errors.general_physical_examination?.pulse && (
                      <p className="text-sm text-destructive">{errors.general_physical_examination.pulse.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Blood Pressure (BP) <span className="text-destructive">*</span></Label>
                    <Controller
                      name="general_physical_examination.bp"
                      control={control}
                      render={({ field }: any) => <Input placeholder="e.g. 120/80 mmHg" {...field} value={field.value || ''} />}
                    />
                    {errors.general_physical_examination?.bp && (
                      <p className="text-sm text-destructive">{errors.general_physical_examination.bp.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Respiratory Rate <span className="text-destructive">*</span></Label>
                    <Controller
                      name="general_physical_examination.respiratory_rate"
                      control={control}
                      render={({ field }: any) => <Input placeholder="e.g. 16/min" {...field} value={field.value || ''} />}
                    />
                    {errors.general_physical_examination?.respiratory_rate && (
                      <p className="text-sm text-destructive">{errors.general_physical_examination.respiratory_rate.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Temperature <span className="text-destructive">*</span></Label>
                    <Controller
                      name="general_physical_examination.temperature"
                      control={control}
                      render={({ field }: any) => <Input placeholder="e.g. 98.6 °F" {...field} value={field.value || ''} />}
                    />
                    {errors.general_physical_examination?.temperature && (
                      <p className="text-sm text-destructive">{errors.general_physical_examination.temperature.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Jugular Venous Pressure (JVP) <span className="text-destructive">*</span></Label>
                    <Controller
                      name="general_physical_examination.jvp"
                      control={control}
                      render={({ field }: any) => <Input placeholder="e.g. Normal" {...field} value={field.value || ''} />}
                    />
                    {errors.general_physical_examination?.jvp && (
                      <p className="text-sm text-destructive">{errors.general_physical_examination.jvp.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Pallor <span className="text-destructive">*</span></Label>
                    <Controller
                      name="general_physical_examination.pallor"
                      control={control}
                      render={({ field }: any) => <Input placeholder="Absent / Present" {...field} value={field.value || ''} />}
                    />
                    {errors.general_physical_examination?.pallor && (
                      <p className="text-sm text-destructive">{errors.general_physical_examination.pallor.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Cyanosis <span className="text-destructive">*</span></Label>
                    <Controller
                      name="general_physical_examination.cyanosis"
                      control={control}
                      render={({ field }: any) => <Input placeholder="Absent / Present" {...field} value={field.value || ''} />}
                    />
                    {errors.general_physical_examination?.cyanosis && (
                      <p className="text-sm text-destructive">{errors.general_physical_examination.cyanosis.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Icterus <span className="text-destructive">*</span></Label>
                    <Controller
                      name="general_physical_examination.icterus"
                      control={control}
                      render={({ field }: any) => <Input placeholder="Absent / Present" {...field} value={field.value || ''} />}
                    />
                    {errors.general_physical_examination?.icterus && (
                      <p className="text-sm text-destructive">{errors.general_physical_examination.icterus.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Peripheral Oedema <span className="text-destructive">*</span></Label>
                    <Controller
                      name="general_physical_examination.peripheral_oedema"
                      control={control}
                      render={({ field }: any) => <Input placeholder="Absent / Present" {...field} value={field.value || ''} />}
                    />
                    {errors.general_physical_examination?.peripheral_oedema && (
                      <p className="text-sm text-destructive">{errors.general_physical_examination.peripheral_oedema.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Clubbing <span className="text-destructive">*</span></Label>
                    <Controller
                      name="general_physical_examination.clubbing"
                      control={control}
                      render={({ field }: any) => <Input placeholder="Absent / Present" {...field} value={field.value || ''} />}
                    />
                    {errors.general_physical_examination?.clubbing && (
                      <p className="text-sm text-destructive">{errors.general_physical_examination.clubbing.message}</p>
                    )}
                  </div>
                </div>

                {/* Lymph Nodes Sub-fields */}
                <div className="space-y-2 border p-3 rounded-md bg-muted/20">
                  <Label className="font-semibold text-sm">Lymph Nodes <span className="text-destructive">*</span></Label>
                  <div className="grid grid-cols-3 gap-3 pt-1">
                    <div className="space-y-1">
                      <Label className="text-xs">Cervical <span className="text-destructive">*</span></Label>
                      <Controller
                        name="general_physical_examination.lymph_nodes.cervical"
                        control={control}
                        render={({ field }: any) => <Input placeholder="Cervical nodes..." {...field} value={field.value || ''} />}
                      />
                      {errors.general_physical_examination?.lymph_nodes?.cervical && (
                        <p className="text-xs text-destructive">{errors.general_physical_examination.lymph_nodes.cervical.message}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Axillary <span className="text-destructive">*</span></Label>
                      <Controller
                        name="general_physical_examination.lymph_nodes.axillary"
                        control={control}
                        render={({ field }: any) => <Input placeholder="Axillary nodes..." {...field} value={field.value || ''} />}
                      />
                      {errors.general_physical_examination?.lymph_nodes?.axillary && (
                        <p className="text-xs text-destructive">{errors.general_physical_examination.lymph_nodes.axillary.message}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Inguinal <span className="text-destructive">*</span></Label>
                      <Controller
                        name="general_physical_examination.lymph_nodes.inguinal"
                        control={control}
                        render={({ field }: any) => <Input placeholder="Inguinal nodes..." {...field} value={field.value || ''} />}
                      />
                      {errors.general_physical_examination?.lymph_nodes?.inguinal && (
                        <p className="text-xs text-destructive">{errors.general_physical_examination.lymph_nodes.inguinal.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Other Significant Findings <span className="text-destructive">*</span></Label>
                  <Controller
                    name="general_physical_examination.other_significant_findings"
                    control={control}
                    render={({ field }: any) => <RichTextEditor placeholder="Other findings..." value={field.value || ''} onChange={field.onChange} minHeight="80px" />}
                  />
                  {errors.general_physical_examination?.other_significant_findings && (
                    <p className="text-sm text-destructive">{errors.general_physical_examination.other_significant_findings.message}</p>
                  )}
                </div>
                <CustomFieldsSection sectionId="general_physical_examination" sectionTitle="General Physical Examination" />
              </CardContent>
            </Card>
          )}

          {/* Step 4: Systemic Examination */}
          {currentStep === 4 && (
            <Card>
              <CardHeader><CardTitle>4. Systemic Examination</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: 'respiratory_system', label: 'Respiratory System' },
                  { key: 'cardiovascular_system', label: 'Cardiovascular System' },
                  { key: 'nervous_system', label: 'Nervous System' },
                  { key: 'genito_urinary_system', label: 'Genito-Urinary System' },
                  { key: 'gastrointestinal_system', label: 'Gastrointestinal System' },
                ].map((item) => (
                  <div key={item.key} className="space-y-2">
                    <Label>{item.label} <span className="text-destructive">*</span></Label>
                    <Controller
                      name={`systemic_examination.${item.key}` as any}
                      control={control}
                      render={({ field }: any) => <RichTextEditor placeholder={`${item.label}...`} value={field.value || ''} onChange={field.onChange} minHeight="90px" />}
                    />
                    {(errors.systemic_examination as any)?.[item.key] && (
                      <p className="text-sm text-destructive">{(errors.systemic_examination as any)[item.key].message}</p>
                    )}
                  </div>
                ))}
                <CustomFieldsSection sectionId="systemic_examination" sectionTitle="Systemic Examination" />
              </CardContent>
            </Card>
          )}

          {/* Step 5: Local Examination */}
          {currentStep === 5 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  5. Local Examination {localRegion?.trim() ? `(${localRegion.trim()})` : ''}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 max-w-sm">
                  <Label htmlFor="region">Body Region / Specialty Area</Label>
                  <Controller
                    name="local_examination.region"
                    control={control}
                    render={({ field }: any) => <Input id="region" placeholder="e.g. Breast, Neck, Thyroid, Abdomen" {...field} value={field.value || ''} />}
                  />
                  <p className="text-xs text-muted-foreground">Specifies the region header (e.g. &quot;Local Examination (Breast)&quot;)</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Inspection <span className="text-destructive">*</span></Label>
                    <Controller
                      name="local_examination.inspection"
                      control={control}
                      render={({ field }: any) => <RichTextEditor placeholder="Inspection findings..." value={field.value || ''} onChange={field.onChange} minHeight="90px" />}
                    />
                    {errors.local_examination?.inspection && (
                      <p className="text-sm text-destructive">{errors.local_examination.inspection.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Palpation <span className="text-destructive">*</span></Label>
                    <Controller
                      name="local_examination.palpation"
                      control={control}
                      render={({ field }: any) => <RichTextEditor placeholder="Palpation findings..." value={field.value || ''} onChange={field.onChange} minHeight="90px" />}
                    />
                    {errors.local_examination?.palpation && (
                      <p className="text-sm text-destructive">{errors.local_examination.palpation.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Percussion <span className="text-destructive">*</span></Label>
                    <Controller
                      name="local_examination.percussion"
                      control={control}
                      render={({ field }: any) => <RichTextEditor placeholder="Percussion findings..." value={field.value || ''} onChange={field.onChange} minHeight="90px" />}
                    />
                    {errors.local_examination?.percussion && (
                      <p className="text-sm text-destructive">{errors.local_examination.percussion.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Auscultation <span className="text-destructive">*</span></Label>
                    <Controller
                      name="local_examination.auscultation"
                      control={control}
                      render={({ field }: any) => <RichTextEditor placeholder="Auscultation findings..." value={field.value || ''} onChange={field.onChange} minHeight="90px" />}
                    />
                    {errors.local_examination?.auscultation && (
                      <p className="text-sm text-destructive">{errors.local_examination.auscultation.message}</p>
                    )}
                  </div>
                </div>
                <CustomFieldsSection sectionId="local_examination" sectionTitle="Local Examination" />
              </CardContent>
            </Card>
          )}

          {/* Step 6: Diagnosis */}
          {currentStep === 6 && (
            <Card>
              <CardHeader><CardTitle>6. Diagnosis</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="provisional_diagnosis">Provisional Diagnosis <span className="text-destructive">*</span></Label>
                  <Controller
                    name="diagnosis.provisional_diagnosis"
                    control={control}
                    render={({ field }: any) => <RichTextEditor placeholder="Provisional diagnosis..." value={field.value || ''} onChange={field.onChange} minHeight="90px" />}
                  />
                  {errors.diagnosis?.provisional_diagnosis && (
                    <p className="text-sm text-destructive">{errors.diagnosis.provisional_diagnosis.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Differential Diagnosis <span className="text-destructive">*</span></Label>
                  <Controller
                    name="diagnosis.differential_diagnosis"
                    control={control}
                    render={({ field }: any) => <RichTextEditor placeholder="Differential diagnosis..." value={field.value || ''} onChange={field.onChange} minHeight="100px" />}
                  />
                  {errors.diagnosis?.differential_diagnosis && (
                    <p className="text-sm text-destructive">{errors.diagnosis.differential_diagnosis.message}</p>
                  )}
                </div>
                <CustomFieldsSection sectionId="diagnosis" sectionTitle="Diagnosis" />
              </CardContent>
            </Card>
          )}

          {/* Step 7: Investigations */}
          {currentStep === 7 && (
            <div className="space-y-6">
              {/* Confirmation of Diagnosis Sub-section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-bold text-foreground flex items-center justify-between">
                    <span>7.1 Investigations for Confirmation of Diagnosis</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-semibold text-sm">
                      Investigation performed? <span className="text-destructive">*</span>
                    </Label>
                    <Controller
                      name="investigations_info.confirmation_performed"
                      control={control}
                      defaultValue="yes"
                      render={({ field }: any) => (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {[
                            { value: 'yes', label: 'Yes — Performed' },
                            { value: 'no', label: 'No — Not Performed' },
                            { value: 'not_required', label: 'Not Required' },
                          ].map((opt) => {
                            const isSelected = (field.value || 'yes') === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => field.onChange(opt.value)}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                                  isSelected
                                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                    : 'bg-background hover:bg-muted border-input text-muted-foreground'
                                }`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    />
                  </div>

                  {confirmationPerformed === 'yes' && (
                    <>
                      <div className="space-y-2">
                        <Label>Written Findings & Reports <span className="text-xs text-muted-foreground font-normal">(Required if no report/scan is uploaded)</span></Label>
                        <Controller
                          name="investigations_info.investigations_confirmation"
                          control={control}
                          render={({ field }: any) => (
                            <RichTextEditor placeholder="Lab values, imaging summaries, biopsy results..." value={field.value || ''} onChange={field.onChange} minHeight="100px" />
                          )}
                        />
                        {errors.investigations_info?.investigations_confirmation && (
                          <p className="text-sm text-destructive">{errors.investigations_info.investigations_confirmation.message}</p>
                        )}
                      </div>
                      <div className="space-y-3 pt-2">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5 flex-wrap">
                            <span>Confirmation Reports / Scans Upload</span>
                            <span className="text-xs text-muted-foreground font-normal normal-case">(Optional if written findings are provided)</span>
                          </Label>
                          <p className="text-xs text-muted-foreground">Original reports, laboratory printouts, or imaging scans can be uploaded here if available.</p>
                        </div>
                        <AttachmentUploader
                          caseId={caseId}
                          investigationGroup="confirmation"
                          onAttachmentUploaded={handleAttachmentUploaded}
                          label="Upload Confirmation Scans & PDF Reports"
                        />
                        <AttachmentGallery
                          attachments={attachments.filter((a) => a.investigation_group === 'confirmation')}
                          canDelete={true}
                          onAttachmentDeleted={handleAttachmentDeleted}
                        />
                      </div>
                    </>
                  )}

                  {confirmationPerformed === 'no' && (
                    <div className="space-y-2">
                      <Label>Explanation why confirmation was not performed <span className="text-destructive">*</span></Label>
                      <Controller
                        name="investigations_info.confirmation_explanation"
                        control={control}
                        render={({ field }: any) => (
                          <RichTextEditor placeholder="Provide clinical rationale or reasons why confirmation investigations were not performed..." value={field.value || ''} onChange={field.onChange} minHeight="90px" />
                        )}
                      />
                      {errors.investigations_info?.confirmation_explanation && (
                        <p className="text-sm text-destructive">{errors.investigations_info.confirmation_explanation.message}</p>
                      )}
                      <p className="text-xs text-muted-foreground">Document upload is not required when confirmation investigations were not performed.</p>
                    </div>
                  )}

                  {confirmationPerformed === 'not_required' && (
                    <div className="space-y-2">
                      <Label>Rationale why confirmation is not required (Optional)</Label>
                      <Controller
                        name="investigations_info.confirmation_explanation"
                        control={control}
                        render={({ field }: any) => (
                          <RichTextEditor placeholder="e.g., Clinical diagnosis established from classic signs, self-limiting condition, etc." value={field.value || ''} onChange={field.onChange} minHeight="80px" />
                        )}
                      />
                      <p className="text-xs text-muted-foreground">Document upload is not required for this case.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Extent of Disease (Staging) Sub-section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-bold text-foreground">
                    7.2 Investigations for Determining Extent of Disease (Staging)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-semibold text-sm">
                      Staging applicable? <span className="text-destructive">*</span>
                    </Label>
                    <Controller
                      name="investigations_info.staging_applicable"
                      control={control}
                      defaultValue="yes"
                      render={({ field }: any) => (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {[
                            { value: 'yes', label: 'Yes — Applicable' },
                            { value: 'no', label: 'No — Not Applicable' },
                          ].map((opt) => {
                            const isSelected = (field.value || 'yes') === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => field.onChange(opt.value)}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                                  isSelected
                                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                    : 'bg-background hover:bg-muted border-input text-muted-foreground'
                                }`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    />
                  </div>

                  {stagingApplicable === 'yes' && (
                    <>
                      <div className="space-y-2">
                        <Label>Written Findings & Staging Reports <span className="text-xs text-muted-foreground font-normal">(Required if no report/scan is uploaded)</span></Label>
                        <Controller
                          name="investigations_info.investigations_staging"
                          control={control}
                          render={({ field }: any) => (
                            <RichTextEditor placeholder="Staging CT/MRI, PET scans, metastasis workup..." value={field.value || ''} onChange={field.onChange} minHeight="100px" />
                          )}
                        />
                        {errors.investigations_info?.investigations_staging && (
                          <p className="text-sm text-destructive">{errors.investigations_info.investigations_staging.message}</p>
                        )}
                      </div>
                      <div className="space-y-3 pt-2">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5 flex-wrap">
                            <span>Staging Reports / Scans Upload</span>
                            <span className="text-xs text-muted-foreground font-normal normal-case">(Optional if written findings are provided)</span>
                          </Label>
                          <p className="text-xs text-muted-foreground">Original staging scans (CT/MRI/PET) or pathology reports can be uploaded here if available.</p>
                        </div>
                        <AttachmentUploader
                          caseId={caseId}
                          investigationGroup="staging"
                          onAttachmentUploaded={handleAttachmentUploaded}
                          label="Upload Staging Scans & Reports"
                        />
                        <AttachmentGallery
                          attachments={attachments.filter((a) => a.investigation_group === 'staging')}
                          canDelete={true}
                          onAttachmentDeleted={handleAttachmentDeleted}
                        />
                      </div>
                    </>
                  )}

                  {stagingApplicable === 'no' && (
                    <div className="space-y-2">
                      <Label>Staging Notes / Context (Optional)</Label>
                      <Controller
                        name="investigations_info.staging_explanation"
                        control={control}
                        render={({ field }: any) => (
                          <RichTextEditor placeholder="e.g. Non-malignant condition, localized pathology, staging not clinically indicated." value={field.value || ''} onChange={field.onChange} minHeight="80px" />
                        )}
                      />
                      <p className="text-xs text-muted-foreground">Staging upload is not required for non-staged conditions.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <CustomFieldsSection sectionId="investigations" sectionTitle="Investigations" />
            </div>
          )} {/* end step 7 */}
          </div> {/* end step-enter animated wrapper */}

          {/* Footer Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-4">
              {currentStep > 1 && (
                <Button type="button" variant="outline" onClick={handlePrevStep} disabled={isNavigatingNext || isSavingDraft || isSubmitting}>
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
              )}
              {lastSavedAt && (
                <span className="text-xs text-muted-foreground">
                  Last saved at {lastSavedAt.toLocaleTimeString()}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => saveDraft()} disabled={isSavingDraft || isSubmitting || isNavigatingNext}>
                {isSavingDraft ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Draft
              </Button>
              {currentStep < 7 ? (
                <Button type="button" onClick={handleNextStep} disabled={isNavigatingNext || isSavingDraft || isSubmitting}>
                  {isNavigatingNext ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button type="button" onClick={() => setIsPreviewMode(true)} variant="secondary">
                  Preview
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </FormProvider>
  );
}
