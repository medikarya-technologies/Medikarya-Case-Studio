import { z } from 'zod';

// Zod Schema for form validation matching the 7 consolidated sections
export const caseSchema = z.object({
  // Metadata
  title: z.string().min(5, 'Title must be at least 5 characters'),
  original_author_name: z.string().optional(),
  specialty: z.enum([
    'cardiology',
    'pulmonology',
    'gastroenterology',
    'neurology',
    'orthopedics',
    'dermatology',
    'emergency_medicine',
    'family_medicine',
    'internal_medicine',
    'pediatrics',
    'other',
  ]),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  tags: z.array(z.string()),

  // Section 1: Patient Details
  patient_details: z.object({
    case_no: z.string().optional(),
    patient_name: z.string().min(1, 'Patient Name is required'),
    age: z.union([z.number({ required_error: 'Age is required' }), z.nan()]).refine((val) => !isNaN(val as number), {
      message: 'Age is required',
    }),
    sex: z.enum(['male', 'female', 'other'], { required_error: 'Sex is required' }),
    religion: z.string().optional(),
    occupation: z.string().optional(),
    address: z.string().optional(),
    date_of_admission: z.string().optional(),

    // Backward compatibility fields
    patient_id: z.string().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    location: z.string().optional(),
    presenting_date: z.string().optional(),
  }),

  // Section 2: History
  history: z.object({
    presenting_complaints: z.string().min(1, 'Presenting Complaints is required'),
    history_of_present_illness: z.string().min(1, 'History of Present Illness is required'),
    past_history: z.string().optional(),
    personal_history: z.string().optional(),
    treatment_history: z.string().optional(),
    family_history: z.string().optional(),
    menstrual_history: z.string().optional(),
    obstetric_history: z.string().optional(),
    socio_economic_history: z.string().optional(),
    any_other: z.string().optional(),
  }),

  // Section 3: General Physical Examination
  general_physical_examination: z.object({
    consciousness_orientation: z.string().optional(),
    pallor: z.string().optional(),
    cyanosis: z.string().optional(),
    icterus: z.string().optional(),
    peripheral_oedema: z.string().optional(),
    clubbing: z.string().optional(),
    jvp: z.string().optional(),
    lymph_nodes: z
      .object({
        cervical: z.string().optional(),
        axillary: z.string().optional(),
        inguinal: z.string().optional(),
      })
      .optional(),
    pulse: z.string().optional(),
    bp: z.string().optional(),
    respiratory_rate: z.string().optional(),
    temperature: z.string().optional(),
    other_significant_findings: z.string().optional(),
  }).optional(),

  // Section 4: Systemic Examination
  systemic_examination: z.object({
    respiratory_system: z.string().optional(),
    cardiovascular_system: z.string().optional(),
    nervous_system: z.string().optional(),
    genito_urinary_system: z.string().optional(),
    gastrointestinal_system: z.string().optional(),
  }).optional(),

  // Section 5: Local Examination
  local_examination: z.object({
    region: z.string().optional(),
    inspection: z.string().optional(),
    palpation: z.string().optional(),
    percussion: z.string().optional(),
    auscultation: z.string().optional(),
  }).optional(),

  // Section 6: Diagnosis
  diagnosis: z.object({
    provisional_diagnosis: z.string().min(1, 'Provisional Diagnosis is required'),
    differential_diagnosis: z.string().optional(),
  }),

  // Section 7: Investigations
  investigations_info: z.object({
    investigations_confirmation: z.string().optional(),
    investigations_staging: z.string().optional(),
  }).optional(),

  // Per-case custom fields
  custom_fields: z
    .array(
      z.object({
        id: z.string(),
        sectionId: z.string(),
        label: z.string().min(1, 'Field name is required'),
        type: z.enum(['text', 'textarea']),
        value: z.string(),
      })
    )
    .optional(),

  // Retain legacy fields as optional for backward compatibility
  chief_complaint_history: z.any().optional(),
  medical_history: z.any().optional(),
  current_medications: z.any().optional(),
  review_of_systems: z.any().optional(),
  examination_findings: z.any().optional(),
  investigations: z.any().optional(),
  diagnosis_management: z.any().optional(),
  learning_points: z.any().optional(),
});

export type CaseFormData = z.infer<typeof caseSchema>;

