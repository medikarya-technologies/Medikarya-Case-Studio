'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useBeforeUnloadWarning, useNavigationGuard } from '@/hooks/use-unsaved-changes';
import { ArrowLeft, Save, Send, Check, ChevronRight, ChevronLeft, Plus, X, Loader2 } from 'lucide-react';
import { useForm, useFieldArray, Controller, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { fetchCaseAttachmentsAction } from '@/app/actions/attachment-actions';
import { AttachmentUploader } from '@/components/attachments/AttachmentUploader';
import { AttachmentGallery } from '@/components/attachments/AttachmentGallery';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { CustomFieldsSection } from '@/components/case/form/CustomFieldsSection';

// Checkbox group for common PMH
const COMMON_PMH = [
  'Diabetes',
  'Hypertension',
  'Asthma',
  'CAD',
  'TB',
  'COPD',
  'Hyperlipidemia',
  'Thyroid Disease',
];

const DEFAULT_FORM_DATA: CaseFormData = {
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
  custom_fields: [],
};

// Array fields helper component
function ArrayInputField({
  name,
  label,
  placeholder,
  control,
  useRichText = false,
}: {
  name: any;
  label: string;
  placeholder: string;
  control: any;
  useRichText?: boolean;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name,
  });

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-2">
        {fields.map((field: any, index: number) => (
          <div key={field.id} className="flex gap-2 items-start">
            <div className="flex-1">
              <Controller
                name={`${name}.${index}`}
                control={control}
                render={({ field: controllerField }: any) =>
                  useRichText ? (
                    <RichTextEditor
                      placeholder={placeholder}
                      value={controllerField.value || ''}
                      onChange={controllerField.onChange}
                      minHeight="70px"
                    />
                  ) : (
                    <Input
                      placeholder={placeholder}
                      {...controllerField}
                      value={controllerField.value || ''}
                    />
                  )
                }
              />
            </div>
            <Button type="button" variant="destructive" size="icon" className="shrink-0 mt-1" onClick={() => remove(index)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => append('')}
      >
        <Plus className="w-4 h-4 mr-2" />
        Add {label}
      </Button>
    </div>
  );
}

// Field array components
function CurrentMedicationsFieldArray({ control }: { control: any }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'current_medications',
  });
  return (
    <div className="space-y-4">
      {fields.map((field: any, index: number) => (
        <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-4 space-y-1">
            <Label>Medication</Label>
            <Controller
              name={`current_medications.${index}.name`}
              control={control}
              render={({ field: f }: any) => <Input placeholder="Name" {...f} value={f.value || ''} />}
            />
          </div>
          <div className="col-span-3 space-y-1">
            <Label>Dose</Label>
            <Controller
              name={`current_medications.${index}.dose`}
              control={control}
              render={({ field: f }: any) => <Input placeholder="Dose" {...f} value={f.value || ''} />}
            />
          </div>
          <div className="col-span-4 space-y-1">
            <Label>Frequency</Label>
            <Controller
              name={`current_medications.${index}.frequency`}
              control={control}
              render={({ field: f }: any) => <Input placeholder="Frequency" {...f} value={f.value || ''} />}
            />
          </div>
          <div className="col-span-1">
            <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="secondary" size="sm" onClick={() => append({ name: '', dose: '', frequency: '' })}>
        <Plus className="w-4 h-4 mr-2" />
        Add Medication
      </Button>
    </div>
  );
}

function PrescribedMedicationsFieldArray({ control }: { control: any }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'diagnosis_management.medications_prescribed',
  });
  return (
    <div className="space-y-4">
      {fields.map((field: any, index: number) => (
        <div key={field.id} className="grid grid-cols-16 gap-2 items-end">
          <div className="col-span-4 space-y-1">
            <Label>Drug</Label>
            <Controller
              name={`diagnosis_management.medications_prescribed.${index}.drug`}
              control={control}
              render={({ field: f }: any) => <Input placeholder="Drug" {...f} value={f.value || ''} />}
            />
          </div>
          <div className="col-span-3 space-y-1">
            <Label>Dose</Label>
            <Controller
              name={`diagnosis_management.medications_prescribed.${index}.dose`}
              control={control}
              render={({ field: f }: any) => <Input placeholder="Dose" {...f} value={f.value || ''} />}
            />
          </div>
          <div className="col-span-4 space-y-1">
            <Label>Frequency</Label>
            <Controller
              name={`diagnosis_management.medications_prescribed.${index}.frequency`}
              control={control}
              render={({ field: f }: any) => <Input placeholder="Frequency" {...f} value={f.value || ''} />}
            />
          </div>
          <div className="col-span-4 space-y-1">
            <Label>Duration</Label>
            <Controller
              name={`diagnosis_management.medications_prescribed.${index}.duration`}
              control={control}
              render={({ field: f }: any) => <Input placeholder="Duration" {...f} value={f.value || ''} />}
            />
          </div>
          <div className="col-span-1">
            <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => append({ drug: '', dose: '', frequency: '', duration: '' })}
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Prescribed Medication
      </Button>
    </div>
  );
}

function InvestigationsFieldArray({ control }: { control: any }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'investigations',
  });
  return (
    <div className="space-y-6">
      {fields.map((field: any, index: number) => (
        <Card key={field.id} className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium">Investigation {index + 1}</h4>
            <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-3 space-y-2">
              <Label>Type</Label>
              <Controller
                name={`investigations.${index}.type`}
                control={control}
                render={({ field: f }: any) => (
                  <select
                    {...f}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="lab">Lab</option>
                    <option value="imaging">Imaging</option>
                    <option value="biopsy">Biopsy</option>
                    <option value="other">Other</option>
                  </select>
                )}
              />
            </div>
            <div className="col-span-4 space-y-2">
              <Label>Test Name</Label>
              <Controller
                name={`investigations.${index}.test_name`}
                control={control}
                render={({ field: f }: any) => <Input placeholder="Test name" {...f} value={f.value || ''} />}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Date</Label>
              <Controller
                name={`investigations.${index}.date`}
                control={control}
                render={({ field: f }: any) => <Input type="date" {...f} value={f.value || ''} />}
              />
            </div>
            <div className="col-span-3 space-y-2">
              <Label>Result</Label>
              <Controller
                name={`investigations.${index}.result`}
                control={control}
                render={({ field: f }: any) => <Input placeholder="Result" {...f} value={f.value || ''} />}
              />
            </div>
            <div className="col-span-4 space-y-2">
              <Label>Normal Range</Label>
              <Controller
                name={`investigations.${index}.normal_range`}
                control={control}
                render={({ field: f }: any) => <Input placeholder="Normal range" {...f} value={f.value || ''} />}
              />
            </div>
            <div className="col-span-8 space-y-2">
              <Label>Interpretation</Label>
              <Controller
                name={`investigations.${index}.interpretation`}
                control={control}
                render={({ field: f }: any) => <RichTextEditor placeholder="Interpretation" value={f.value || ''} onChange={f.onChange} minHeight="80px" />}
              />
            </div>
            <div className="col-span-12 space-y-2">
              <Label>Image URL (X-Ray, scan, or chart URL)</Label>
              <Controller
                name={`investigations.${index}.image_url`}
                control={control}
                render={({ field: f }: any) => <Input placeholder="https://example.com/scan.jpg" {...f} value={f.value || ''} />}
              />
            </div>
          </div>
        </Card>
      ))}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => append({ type: 'lab', test_name: '', result: '', normal_range: '', date: '', interpretation: '', image_url: '' })}
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Investigation
      </Button>
    </div>
  );
}

function ReferencePdfsFieldArray({ control }: { control: any }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'diagnosis_management.reference_pdfs',
  });
  return (
    <div className="space-y-4">
      {fields.map((field: any, index: number) => (
        <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-5 space-y-1">
            <Label>Document Name</Label>
            <Controller
              name={`diagnosis_management.reference_pdfs.${index}.filename`}
              control={control}
              render={({ field: f }: any) => <Input placeholder="e.g. Scanned Lab Report.pdf" {...f} value={f.value || ''} />}
            />
          </div>
          <div className="col-span-6 space-y-1">
            <Label>PDF File URL</Label>
            <Controller
              name={`diagnosis_management.reference_pdfs.${index}.url`}
              control={control}
              render={({ field: f }: any) => <Input placeholder="https://example.com/doc.pdf" {...f} value={f.value || ''} />}
            />
          </div>
          <div className="col-span-1">
            <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => append({ filename: '', url: '' })}
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Reference PDF URL
      </Button>
    </div>
  );
}

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
  const { control, handleSubmit, setValue, watch, getValues, reset, setError, formState: { errors, isDirty } } = methods;

  useBeforeUnloadWarning(isDirty);
  const { confirmNavigation } = useNavigationGuard(isDirty);

  // Watch height and weight to auto-calculate BMI
  const height = watch('examination_findings.vital_signs.height');
  const weight = watch('examination_findings.vital_signs.weight');

  useEffect(() => {
    if (height && weight && height > 0) {
      const heightInM = height / 100;
      const bmi = weight / (heightInM * heightInM);
      setValue('examination_findings.vital_signs.bmi', Math.round(bmi * 100) / 100);
    }
  }, [height, weight, setValue]);

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
          reset({
            title: data.title || '',
            specialty: data.specialty || 'internal_medicine',
            difficulty: data.difficulty || 'intermediate',
            tags: data.tags || [],
            patient_details: data.patient_details || DEFAULT_FORM_DATA.patient_details,
            chief_complaint_history: data.chief_complaint_history || DEFAULT_FORM_DATA.chief_complaint_history,
            medical_history: data.medical_history || DEFAULT_FORM_DATA.medical_history,
            current_medications: data.current_medications || [],
            review_of_systems: data.review_of_systems || DEFAULT_FORM_DATA.review_of_systems,
            examination_findings: data.examination_findings || DEFAULT_FORM_DATA.examination_findings,
            investigations: data.investigations || [],
            diagnosis_management: {
              ...DEFAULT_FORM_DATA.diagnosis_management,
              ...data.diagnosis_management,
              outcome:
                data.diagnosis_management?.outcome ||
                data.diagnosis_management?.prognosis ||
                '',
            },
            learning_points: data.learning_points || [],
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
        toast.success('Case submitted successfully');
        router.push('/dashboard/author');
      } else {
        toast.success('Draft saved successfully');
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
      return;
    }

    await saveDraft('submitted');
  };

  // Step validation
  const handleNextStep = async () => {
    const isValid = await validateStepAndNotify(currentStep, methods);
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
      const isValid = await validateStepAndNotify(s, methods);
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
          {Array.from({ length: 6 }).map((_, i) => (
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

  // Render steps
  const steps = [
    { number: 1, title: 'Patient & Metadata' },
    { number: 2, title: 'Chief Complaint' },
    { number: 3, title: 'Medical History' },
    { number: 4, title: 'Examination' },
    { number: 5, title: 'Investigations' },
    { number: 6, title: 'Diagnosis' },
  ];

  if (isPreviewMode) {
    const data = getValues();
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <BackButton href="/dashboard/author" onBeforeNavigate={confirmNavigation} />
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
              {data.tags.map((tag: any, i: number) => (
                <Badge key={i} variant="outline">{tag}</Badge>
              ))}
            </div>
          )}

          {/* Patient details section */}
          <Card>
            <CardHeader><CardTitle>Patient Details</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Age</Label><p>{data.patient_details.age}</p></div>
                <div><Label>Gender</Label><p>{data.patient_details.gender}</p></div>
                <div><Label>Occupation</Label><p>{data.patient_details.occupation}</p></div>
                <div><Label>Location</Label><p>{data.patient_details.location}</p></div>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsPreviewMode(false)} disabled={isSubmitting}>
            Back to Edit
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
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
        <BackButton href={`/cases/${caseId}`} onBeforeNavigate={confirmNavigation} />

        {/* Step Indicator — compact on mobile */}
        <div className="flex items-center justify-between overflow-x-auto pb-2">
          {steps.map((step, i) => (
            <div key={step.number} className="flex items-center min-w-0">
              <button
                type="button"
                onClick={() => handleStepClick(step.number)}
                className="flex flex-col items-center focus:outline-none group cursor-pointer"
              >
                <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 text-xs sm:text-sm font-semibold shrink-0 transition-colors ${
                  step.number < currentStep
                    ? 'bg-primary border-primary text-primary-foreground group-hover:bg-primary/90'
                    : step.number === currentStep
                    ? 'border-primary text-primary'
                    : 'border-muted-foreground text-muted-foreground group-hover:border-primary/50'
                }`}>
                  {step.number < currentStep ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : step.number}
                </div>
                <span className="mt-2 text-xs font-medium text-center w-16 sm:w-20 hidden sm:block">{step.title}</span>
              </button>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-1 sm:mx-2 min-w-[12px] ${
                  step.number < currentStep ? 'bg-primary' : 'bg-muted-foreground/30'
                }`} />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Step 1: Patient & Metadata */}
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
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
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
                            <option value="other">Other</option>
                          </select>
                        )}
                      />
                      {errors.specialty && <p className="text-sm text-destructive">{errors.specialty.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Difficulty</Label>
                      <Controller
                        name="difficulty"
                        control={control}
                        render={({ field }: any) => (
                          <select
                            {...field}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                          >
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                          </select>
                        )}
                      />
                    </div>
                  </div>
                  <ArrayInputField
                    name="tags"
                    label="Tags"
                    placeholder="Add a tag..."
                    control={control}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Patient Details</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Patient ID</Label>
                    <Controller
                      name="patient_details.patient_id"
                      control={control}
                      render={({ field }: any) => <Input placeholder="Patient ID" {...field} value={field.value || ''} />}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Age</Label>
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
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Controller
                      name="patient_details.gender"
                      control={control}
                      render={({ field }: any) => (
                        <select
                          {...field}
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                        >
                          <option value="">Select gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Presenting Date</Label>
                    <Controller
                      name="patient_details.presenting_date"
                      control={control}
                      render={({ field }: any) => <Input type="date" {...field} value={field.value || ''} />}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Occupation</Label>
                    <Controller
                      name="patient_details.occupation"
                      control={control}
                      render={({ field }: any) => <Input placeholder="Occupation" {...field} value={field.value || ''} />}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Location</Label>
                    <Controller
                      name="patient_details.location"
                      control={control}
                      render={({ field }: any) => <Input placeholder="Location" {...field} value={field.value || ''} />}
                    />
                  </div>
                </CardContent>
              </Card>
              <CustomFieldsSection sectionId="patient_details" sectionTitle="Patient Details" />
            </div>
          )}

          {/* Step2: Chief Complaint & HPI */}
          {currentStep === 2 && (
            <Card>
              <CardHeader><CardTitle>Chief Complaint & History of Present Illness</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="chief_complaint">Chief Complaint <span className="text-destructive">*</span></Label>
                  <Controller
                    name="chief_complaint_history.chief_complaint"
                    control={control}
                    render={({ field }: any) => <RichTextEditor placeholder="Chief complaint..." value={field.value || ''} onChange={field.onChange} minHeight="80px" />}
                  />
                  {errors.chief_complaint_history?.chief_complaint && (
                    <p className="text-sm text-destructive">{errors.chief_complaint_history.chief_complaint.message}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <Controller
                      name="chief_complaint_history.hpi_duration"
                      control={control}
                      render={({ field }: any) => <Input placeholder="e.g. 3 days" {...field} value={field.value || ''} />}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Onset</Label>
                    <Controller
                      name="chief_complaint_history.hpi_onset"
                      control={control}
                      render={({ field }: any) => <Input placeholder="e.g. sudden" {...field} value={field.value || ''} />}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Aggravating Factors</Label>
                    <Controller
                      name="chief_complaint_history.hpi_aggravating"
                      control={control}
                      render={({ field }: any) => <RichTextEditor placeholder="Aggravating factors..." value={field.value || ''} onChange={field.onChange} minHeight="80px" />}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Relieving Factors</Label>
                    <Controller
                      name="chief_complaint_history.hpi_relieving"
                      control={control}
                      render={({ field }: any) => <RichTextEditor placeholder="Relieving factors..." value={field.value || ''} onChange={field.onChange} minHeight="80px" />}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hpi_additional">History of Present Illness <span className="text-destructive">*</span></Label>
                  <p className="text-xs text-muted-foreground">Required for submission — describe the history of present illness</p>
                  <Controller
                    name="chief_complaint_history.hpi_additional"
                    control={control}
                    render={({ field }: any) => <RichTextEditor placeholder="Additional history..." value={field.value || ''} onChange={field.onChange} minHeight="120px" />}
                  />
                  {errors.chief_complaint_history?.hpi_additional && (
                    <p className="text-sm text-destructive">{errors.chief_complaint_history.hpi_additional.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Associated Symptoms</Label>
                  <Controller
                    name="chief_complaint_history.associated_symptoms"
                    control={control}
                    render={({ field }: any) => <RichTextEditor placeholder="Associated symptoms..." value={field.value || ''} onChange={field.onChange} minHeight="90px" />}
                  />
                </div>
                <CustomFieldsSection sectionId="chief_complaint" sectionTitle="Chief Complaint" />
              </CardContent>
            </Card>
          )}

          {/* Step3: Medical History */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle>Past Medical History</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {COMMON_PMH.map((pmh) => (
                      <Controller
                        key={pmh}
                        name="medical_history.past_medical_history"
                        control={control}
                        render={({ field }: any) => {
                          const isChecked = (field.value || []).includes(pmh);
                          return (
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const newValue = e.target.checked
                                    ? [...(field.value || []), pmh]
                                    : (field.value || []).filter((x: string) => x !== pmh);
                                  field.onChange(newValue);
                                }}
                              />
                              <span className="text-sm">{pmh}</span>
                            </label>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <div className="space-y-2">
                    <Label>Custom Medical History</Label>
                    <Controller
                      name="medical_history.custom_medical_history"
                      control={control}
                      render={({ field }: any) => <RichTextEditor placeholder="Clinical history details..." value={field.value || ''} onChange={field.onChange} minHeight="90px" />}
                    />
                  </div>
                </CardContent>
              </Card>
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle>Family History</CardTitle></CardHeader>
                  <CardContent>
                    <Controller
                      name="medical_history.family_history"
                      control={control}
                      render={({ field }: any) => <RichTextEditor placeholder="Family history..." value={field.value || ''} onChange={field.onChange} minHeight="90px" />}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Social History</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Smoking</Label>
                      <Controller
                        name="medical_history.social_history_smoking"
                        control={control}
                        render={({ field }: any) => <Input placeholder="Smoking history..." {...field} value={field.value || ''} />}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Alcohol</Label>
                      <Controller
                        name="medical_history.social_history_alcohol"
                        control={control}
                        render={({ field }: any) => <Input placeholder="Alcohol use..." {...field} value={field.value || ''} />}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Occupation Risk</Label>
                      <Controller
                        name="medical_history.social_history_occupation"
                        control={control}
                        render={({ field }: any) => <Input placeholder="Occupational risks..." {...field} value={field.value || ''} />}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader><CardTitle>Allergies</CardTitle></CardHeader>
                <CardContent>
                  <ArrayInputField
                    name="medical_history.allergies"
                    label="Allergies"
                    placeholder="Add an allergy..."
                    control={control}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Current Medications</CardTitle></CardHeader>
                <CardContent>
                  <CurrentMedicationsFieldArray control={control} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Review of Systems</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  {[
                    { key: 'constitutional', label: 'Constitutional' },
                    { key: 'cardiovascular', label: 'Cardiovascular' },
                    { key: 'respiratory', label: 'Respiratory' },
                    { key: 'gastrointestinal', label: 'GI' },
                    { key: 'neurological', label: 'Neurological' },
                    { key: 'musculoskeletal', label: 'MSK' },
                    { key: 'dermatological', label: 'Dermatological' },
                    { key: 'psychiatric', label: 'Psychiatric' },
                  ].map((item) => (
                    <div key={item.key} className="space-y-2">
                      <Label>{item.label}</Label>
                      <Controller
                        name={`review_of_systems.${item.key}` as any}
                        control={control}
                        render={({ field }: any) => <RichTextEditor placeholder={`${item.label}...`} value={field.value || ''} onChange={field.onChange} minHeight="80px" />}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
              <CustomFieldsSection sectionId="medical_history" sectionTitle="Medical History" />
            </div>
          )}

          {/* Step4: Examination */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle>General Appearance <span className="text-destructive">*</span></CardTitle></CardHeader>
                <CardContent>
                  <Controller
                    name="examination_findings.general_appearance"
                    control={control}
                    render={({ field }: any) => <RichTextEditor placeholder="General appearance..." value={field.value || ''} onChange={field.onChange} minHeight="90px" />}
                  />
                  {errors.examination_findings?.general_appearance && (
                    <p className="text-sm text-destructive mt-2">{errors.examination_findings.general_appearance.message}</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Vital Signs</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-4 gap-4">
                  {[
                    { key: 'bp_systolic', label: 'BP Systolic', placeholder: '120' },
                    { key: 'bp_diastolic', label: 'BP Diastolic', placeholder: '80' },
                    { key: 'hr', label: 'HR', placeholder: '72' },
                    { key: 'rr', label: 'RR', placeholder: '16' },
                    { key: 'temp', label: 'Temp (°C)', placeholder: '37' },
                    { key: 'spo2', label: 'SpO2 (%)', placeholder: '98' },
                    { key: 'weight', label: 'Weight (kg)', placeholder: '70' },
                    { key: 'height', label: 'Height (cm)', placeholder: '170' },
                    { key: 'bmi', label: 'BMI', placeholder: '', disabled: true },
                  ].map((item) => (
                    <div key={item.key} className="space-y-2">
                      <Label>{item.label}</Label>
                      <Controller
                        name={`examination_findings.vital_signs.${item.key}` as any}
                        control={control}
                        render={({ field }: any) => (
                          <Input
                            type="number"
                            placeholder={item.placeholder}
                            disabled={item.disabled}
                            value={field.value ?? ''}
                            onChange={(e) => {
                              if (item.disabled) return;
                              const val = e.target.value;
                              field.onChange(val === '' ? undefined : Number(val));
                            }}
                          />
                        )}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Systemic Examination</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  {[
                    { key: 'cardiovascular', label: 'Cardiovascular' },
                    { key: 'respiratory', label: 'Respiratory' },
                    { key: 'gastrointestinal', label: 'GI' },
                    { key: 'neurological', label: 'Neurological' },
                    { key: 'musculoskeletal', label: 'MSK' },
                    { key: 'dermatological', label: 'Dermatological' },
                    { key: 'thyroid', label: 'Thyroid' },
                  ].map((item) => (
                    <div key={item.key} className="space-y-2">
                      <Label>{item.label}</Label>
                      <Controller
                        name={`examination_findings.systemic.${item.key}` as any}
                        control={control}
                        render={({ field }: any) => <RichTextEditor placeholder={`${item.label}...`} value={field.value || ''} onChange={field.onChange} minHeight="80px" />}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
              <CustomFieldsSection sectionId="examination" sectionTitle="Examination" />
            </div>
          )}

          {/* Step5: Investigations & Attachments */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Investigations Data</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <InvestigationsFieldArray control={control} />
                  <CustomFieldsSection sectionId="investigations" sectionTitle="Investigations" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Investigation Attachments & Scans</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <AttachmentUploader
                    caseId={caseId}
                    onAttachmentUploaded={handleAttachmentUploaded}
                  />
                  <div className="pt-2">
                    <h4 className="text-sm font-medium mb-3">Uploaded Case Attachments</h4>
                    <AttachmentGallery
                      attachments={attachments}
                      canDelete={true}
                      onAttachmentDeleted={handleAttachmentDeleted}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step6: Diagnosis & Management */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle>Diagnosis</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Provisional Diagnosis</Label>
                    <Controller
                      name="diagnosis_management.provisional_diagnosis"
                      control={control}
                      render={({ field }: any) => <RichTextEditor placeholder="Provisional diagnosis..." value={field.value || ''} onChange={field.onChange} minHeight="80px" />}
                    />
                  </div>
                  <div className="space-y-2">
                    <ArrayInputField
                      name="diagnosis_management.differential_diagnoses"
                      label="Differential Diagnoses"
                      placeholder="Add a differential..."
                      control={control}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="final_diagnosis">Final Diagnosis <span className="text-destructive">*</span></Label>
                    <Controller
                      name="diagnosis_management.final_diagnosis"
                      control={control}
                      render={({ field }: any) => <RichTextEditor placeholder="Final diagnosis..." value={field.value || ''} onChange={field.onChange} minHeight="80px" />}
                    />
                    {errors.diagnosis_management?.final_diagnosis && (
                      <p className="text-sm text-destructive">{errors.diagnosis_management.final_diagnosis.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Management</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="treatment_plan">Treatment Plan <span className="text-destructive">*</span></Label>
                    <Controller
                      name="diagnosis_management.treatment_plan"
                      control={control}
                      render={({ field }: any) => <RichTextEditor placeholder="Treatment plan..." value={field.value || ''} onChange={field.onChange} minHeight="120px" />}
                    />
                    {errors.diagnosis_management?.treatment_plan && (
                      <p className="text-sm text-destructive">{errors.diagnosis_management.treatment_plan.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Medications Prescribed</Label>
                    <PrescribedMedicationsFieldArray control={control} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Follow-up Plan <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                      <Controller
                        name="diagnosis_management.follow_up_plan"
                        control={control}
                        render={({ field }: any) => <RichTextEditor placeholder="Follow-up..." value={field.value || ''} onChange={field.onChange} minHeight="90px" />}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Prognosis <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                      <Controller
                        name="diagnosis_management.prognosis"
                        control={control}
                        render={({ field }: any) => <RichTextEditor placeholder="Prognosis..." value={field.value || ''} onChange={field.onChange} minHeight="90px" />}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="outcome">Outcome <span className="text-destructive">*</span></Label>
                    <p className="text-xs text-muted-foreground">Document the patient outcome (e.g. &quot;Recovered and discharged&quot;, &quot;Ongoing follow-up&quot;)</p>
                    <Controller
                      name="diagnosis_management.outcome"
                      control={control}
                      render={({ field }: any) => <RichTextEditor placeholder="Patient outcome..." value={field.value || ''} onChange={field.onChange} minHeight="90px" />}
                    />
                    {errors.diagnosis_management?.outcome && (
                      <p className="text-sm text-destructive">{errors.diagnosis_management.outcome.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Reference Documents</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground">Attach external reference documents or prior summary files (URLs to PDFs).</p>
                  <ReferencePdfsFieldArray control={control} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Learning Points</CardTitle></CardHeader>
                <CardContent>
                  <ArrayInputField
                    name="learning_points"
                    label="Learning Points"
                    placeholder="Add a learning point..."
                    control={control}
                  />
                </CardContent>
              </Card>
              <CustomFieldsSection sectionId="diagnosis" sectionTitle="Diagnosis & Management" />
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-4">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevStep}
                  disabled={isNavigatingNext || isSavingDraft || isSubmitting}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
              )}
              {lastSavedAt && (
                <span className="text-sm text-muted-foreground">
                  Last saved at {lastSavedAt.toLocaleTimeString()}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => saveDraft()}
                disabled={isSavingDraft || isSubmitting || isNavigatingNext}
              >
                {isSavingDraft ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Draft
              </Button>
              {currentStep < 6 ? (
                <Button
                  type="button"
                  onClick={handleNextStep}
                  disabled={isNavigatingNext || isSavingDraft || isSubmitting}
                >
                  {isNavigatingNext ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
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
