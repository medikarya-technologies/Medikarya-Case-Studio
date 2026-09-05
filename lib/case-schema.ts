import { z } from 'zod';

// Zod Schema for form validation matching the 7 consolidated sections
export const caseSchema = z
  .object({
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
    custom_specialty: z.string().optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    tags: z.array(z.string()),

    // Section 1: Patient Details (All required)
    patient_details: z.object({
      case_no: z.string().min(1, 'Case No. is required'),
      patient_name: z.string().min(1, 'Patient Name is required'),
      age: z.union([z.number({ required_error: 'Age is required' }), z.nan()]).refine(
        (val) => !isNaN(val as number),
        { message: 'Age is required' }
      ),
      sex: z.enum(['male', 'female', 'other'], { required_error: 'Sex is required' }),
      religion: z.string().min(1, 'Religion is required'),
      occupation: z.string().min(1, 'Occupation is required'),
      address: z.string().min(1, 'Address is required'),
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
      past_history: z.string().min(1, 'Past History is required'),
      personal_history: z.string().min(1, 'Personal History is required'),
      treatment_history: z.string().min(1, 'Treatment History is required'),
      family_history: z.string().min(1, 'Family History is required'),
      menstrual_history: z.string().optional(),
      obstetric_history: z.string().optional(),
      socio_economic_history: z.string().min(1, 'Socio-economic History is required'),
      any_other: z.string().min(1, 'Any Other is required'),
    }),

    // Section 3: General Physical Examination
    general_physical_examination: z.object({
      consciousness_orientation: z.string().min(1, 'Consciousness / Orientation is required'),
      pallor: z.string().min(1, 'Pallor is required'),
      cyanosis: z.string().min(1, 'Cyanosis is required'),
      icterus: z.string().min(1, 'Icterus is required'),
      peripheral_oedema: z.string().min(1, 'Peripheral Oedema is required'),
      clubbing: z.string().min(1, 'Clubbing is required'),
      jvp: z.string().min(1, 'JVP is required'),
      lymph_nodes: z.object({
        cervical: z.string().min(1, 'Cervical Lymph Nodes finding is required'),
        axillary: z.string().min(1, 'Axillary Lymph Nodes finding is required'),
        inguinal: z.string().min(1, 'Inguinal Lymph Nodes finding is required'),
      }),
      pulse: z.string().min(1, 'Pulse is required'),
      bp: z.string().min(1, 'Blood Pressure is required'),
      respiratory_rate: z.string().min(1, 'Respiratory Rate is required'),
      temperature: z.string().min(1, 'Temperature is required'),
      other_significant_findings: z.string().min(1, 'Other Significant Findings is required'),
    }),

    // Section 4: Systemic Examination
    systemic_examination: z.object({
      respiratory_system: z.string().min(1, 'Respiratory System is required'),
      cardiovascular_system: z.string().min(1, 'Cardiovascular System is required'),
      nervous_system: z.string().min(1, 'Nervous System is required'),
      genito_urinary_system: z.string().min(1, 'Genito-Urinary System is required'),
      gastrointestinal_system: z.string().min(1, 'Gastrointestinal System is required'),
    }),

    // Section 5: Local Examination
    local_examination: z.object({
      region: z.string().optional(),
      inspection: z.string().min(1, 'Inspection is required'),
      palpation: z.string().min(1, 'Palpation is required'),
      percussion: z.string().min(1, 'Percussion is required'),
      auscultation: z.string().min(1, 'Auscultation is required'),
    }),

    // Section 6: Diagnosis
    diagnosis: z.object({
      provisional_diagnosis: z.string().min(1, 'Provisional Diagnosis is required'),
      differential_diagnosis: z.string().min(1, 'Differential Diagnosis is required'),
    }),

    // Section 7: Investigations
    investigations_info: z
      .object({
        confirmation_performed: z.enum(['yes', 'no', 'not_required']).optional(),
        investigations_confirmation: z.string().optional(),
        confirmation_explanation: z.string().optional(),

        staging_applicable: z.enum(['yes', 'no']).optional(),
        investigations_staging: z.string().optional(),
        staging_explanation: z.string().optional(),
      })
      .optional(),

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
  })
  .superRefine((data, ctx) => {
    // Validate custom specialty when 'other' is selected
    if (data.specialty === 'other') {
      const custom = data.custom_specialty?.trim();
      if (!custom) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please specify the custom specialty (e.g. General Surgery)',
          path: ['custom_specialty'],
        });
      }
    }

    // Validate Menstrual and Obstetric History for non-male patients
    if (data.patient_details?.sex && data.patient_details.sex !== 'male') {
      if (!data.history?.menstrual_history || !data.history.menstrual_history.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Menstrual History is required for female/other patients',
          path: ['history', 'menstrual_history'],
        });
      }
      if (!data.history?.obstetric_history || !data.history.obstetric_history.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Obstetric History is required for female/other patients',
          path: ['history', 'obstetric_history'],
        });
      }
    }

    // Validate Step 7 Investigation conditionals
    const inv = data.investigations_info;
    const confPerformed = inv?.confirmation_performed || 'yes';
    if (confPerformed === 'yes') {
      const confText = inv?.investigations_confirmation?.replace(/<[^>]*>/g, '').trim();
      if (!confText) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Written findings for Confirmation of Diagnosis is required',
          path: ['investigations_info', 'investigations_confirmation'],
        });
      }
    } else if (confPerformed === 'no') {
      const expl = (inv?.confirmation_explanation || inv?.investigations_confirmation)?.replace(/<[^>]*>/g, '').trim();
      if (!expl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please provide an explanation why confirmation investigations were not performed',
          path: ['investigations_info', 'confirmation_explanation'],
        });
      }
    }

    const stagingApp = inv?.staging_applicable || 'yes';
    if (stagingApp === 'yes') {
      const stagingText = inv?.investigations_staging?.replace(/<[^>]*>/g, '').trim();
      if (!stagingText) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Written findings for Extent of Disease (Staging) is required',
          path: ['investigations_info', 'investigations_staging'],
        });
      }
    }
  });

export type CaseFormData = z.infer<typeof caseSchema>;
