import { z } from 'zod';

// Zod Schema for form validation
export const caseSchema = z.object({
  // Step 1: Patient & Metadata
  title: z.string().min(5, 'Title must be at least 5 characters'),
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
    'other'
  ]),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  tags: z.array(z.string()),
  patient_details: z.object({
    patient_id: z.string().optional(),
    age: z.number().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    occupation: z.string().optional(),
    location: z.string().optional(),
    presenting_date: z.string().optional(),
  }),

  // Step 2: Chief Complaint & HPI
  chief_complaint_history: z.object({
    chief_complaint: z.string().min(3, 'Chief complaint is required'),
    hpi_duration: z.string().optional(),
    hpi_onset: z.string().optional(),
    hpi_aggravating: z.string().optional(),
    hpi_relieving: z.string().optional(),
    hpi_additional: z.string().optional(),
    associated_symptoms: z.string().optional(),
  }),

  // Step3: Medical & Personal History
  medical_history: z.object({
    past_medical_history: z.array(z.string()),
    custom_medical_history: z.string().optional(),
    family_history: z.string().optional(),
    social_history_smoking: z.string().optional(),
    social_history_alcohol: z.string().optional(),
    social_history_occupation: z.string().optional(),
    allergies: z.array(z.string()),
  }),
  current_medications: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1, 'Medication name is required'),
      dose: z.string().min(1, 'Dose is required'),
      frequency: z.string().min(1, 'Frequency is required'),
    })
  ),
  review_of_systems: z.object({
    constitutional: z.string().optional(),
    cardiovascular: z.string().optional(),
    respiratory: z.string().optional(),
    gastrointestinal: z.string().optional(),
    neurological: z.string().optional(),
    musculoskeletal: z.string().optional(),
    dermatological: z.string().optional(),
    psychiatric: z.string().optional(),
    other: z.string().optional(),
  }),

  // Step4: Examination
  examination_findings: z.object({
    general_appearance: z.string().optional(),
    vital_signs: z.object({
      bp_systolic: z.number().optional(),
      bp_diastolic: z.number().optional(),
      hr: z.number().optional(),
      rr: z.number().optional(),
      temp: z.number().optional(),
      spo2: z.number().optional(),
      weight: z.number().optional(),
      height: z.number().optional(),
      bmi: z.number().optional(),
    }),
    systemic: z.object({
      cardiovascular: z.string().optional(),
      respiratory: z.string().optional(),
      gastrointestinal: z.string().optional(),
      neurological: z.string().optional(),
      musculoskeletal: z.string().optional(),
      dermatological: z.string().optional(),
      thyroid: z.string().optional(),
    }),
  }),

  // Step5: Investigations
  investigations: z.array(
    z.object({
      id: z.string().optional(),
      type: z.enum(['lab', 'imaging', 'biopsy', 'other']),
      test_name: z.string().min(1, 'Test name is required'),
      result: z.string().optional(),
      normal_range: z.string().optional(),
      date: z.string().optional(),
      interpretation: z.string().optional(),
    })
  ),

  // Step6: Diagnosis & Management
  diagnosis_management: z.object({
    provisional_diagnosis: z.string().optional(),
    differential_diagnoses: z.array(z.string()),
    final_diagnosis: z.string().optional(),
    treatment_plan: z.string().optional(),
    medications_prescribed: z.array(
      z.object({
        id: z.string().optional(),
        drug: z.string().min(1, 'Drug name is required'),
        dose: z.string().min(1, 'Dose is required'),
        frequency: z.string().min(1, 'Frequency is required'),
        duration: z.string().min(1, 'Duration is required'),
      })
    ),
    follow_up_plan: z.string().optional(),
    prognosis: z.string().optional(),
    outcome: z.string().optional(),
  }),
  learning_points: z.array(z.string()),
});

export type CaseFormData = z.infer<typeof caseSchema>;
