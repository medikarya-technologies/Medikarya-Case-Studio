import { z } from 'zod';
import { caseSchema, type CaseFormData } from './case-schema';

/*
================================================================================
MEDIKARYA DYNAMIC FORM ARCHITECTURE & SCHEMA CONFIGURATION
================================================================================

HOW TO EXTEND OR MODIFY THE CASE FORM:

1. TO ADD A NEW FIELD TO AN EXISTING SECTION:
   - Locate the target section in `CASE_FORM_SECTIONS` below (e.g. 'chief-complaint-hpi').
   - Add a new `FieldConfig` object to the section's `fields` array.
   - Example:
     {
       name: 'chief_complaint_history.hpi_location',
       label: 'Location of Symptoms',
       type: 'text',
       placeholder: 'e.g. Substernal, left arm radiation',
       gridSpan: 6,
     }

2. TO ADD A BRAND NEW SECTION:
   - Add a new `SectionConfig` object to the `CASE_FORM_SECTIONS` array.
   - Specify `id`, `stepNumber`, `title`, `description`, and `fields`.
   - The wizard step navigation and step indicators will automatically reflect the new section!

3. TO REORDER SECTIONS:
   - Change the array position of section objects in `CASE_FORM_SECTIONS` or adjust `stepNumber`.
================================================================================
*/

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'checkbox-list'
  | 'chip-input'
  | 'repeatable-group'
  | 'date'
  | 'custom';

export interface FieldOption {
  label: string;
  value: string;
}

export interface RepeatableFieldConfig {
  name: string;
  label: string;
  type: Exclude<FieldType, 'repeatable-group' | 'custom'>;
  placeholder?: string;
  options?: FieldOption[] | string[];
  gridSpan?: number;
}

export interface FieldConfig {
  name: string; // Maps to path in form state (e.g. 'title', 'patient_details.age')
  label: string;
  type: FieldType;
  required?: boolean;
  options?: FieldOption[] | string[]; // for select/checkbox-list
  placeholder?: string;
  description?: string;
  gridSpan?: number; // 1 to 12 col-span in grid (default: 12)
  itemFields?: RepeatableFieldConfig[]; // For repeatable-group fields
  addButtonText?: string; // For repeatable-group fields
  defaultItemValue?: Record<string, any>; // Default item template for repeatable-group
  customComponentId?: string; // For custom field renderers
}

export interface SectionConfig {
  id: string; // Unique section identifier
  stepNumber: number; // 1-indexed step number
  title: string;
  description?: string;
  fields: FieldConfig[];
  customComponentId?: string; // Optional custom section override
}

// Option Lists
export const SPECIALTY_OPTIONS: FieldOption[] = [
  { label: 'Cardiology', value: 'cardiology' },
  { label: 'Pulmonology', value: 'pulmonology' },
  { label: 'Gastroenterology', value: 'gastroenterology' },
  { label: 'Neurology', value: 'neurology' },
  { label: 'Orthopedics', value: 'orthopedics' },
  { label: 'Dermatology', value: 'dermatology' },
  { label: 'Emergency Medicine', value: 'emergency_medicine' },
  { label: 'Family Medicine', value: 'family_medicine' },
  { label: 'Internal Medicine', value: 'internal_medicine' },
  { label: 'Pediatrics', value: 'pediatrics' },
  { label: 'Other', value: 'other' },
];

export const DIFFICULTY_OPTIONS: FieldOption[] = [
  { label: 'Beginner', value: 'beginner' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Advanced', value: 'advanced' },
];

export const GENDER_OPTIONS: FieldOption[] = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
];

export const COMMON_PMH_OPTIONS: string[] = [
  'Diabetes',
  'Hypertension',
  'Asthma',
  'CAD',
  'TB',
  'COPD',
  'Hyperlipidemia',
  'Thyroid Disease',
];

export const CASE_FORM_SECTIONS: SectionConfig[] = [
  {
    id: 'patient-metadata',
    stepNumber: 1,
    title: 'Patient & Metadata',
    description: 'Basic case classification and anonymized patient demographics.',
    fields: [
      {
        name: 'title',
        label: 'Title',
        type: 'text',
        required: true,
        placeholder: 'Case title...',
        gridSpan: 12,
      },
      {
        name: 'specialty',
        label: 'Specialty',
        type: 'select',
        required: true,
        options: SPECIALTY_OPTIONS,
        gridSpan: 6,
      },
      {
        name: 'difficulty',
        label: 'Difficulty Level',
        type: 'select',
        required: true,
        options: DIFFICULTY_OPTIONS,
        gridSpan: 6,
      },
      {
        name: 'tags',
        label: 'Tags',
        type: 'chip-input',
        placeholder: 'Add a tag and press Enter',
        gridSpan: 12,
      },
      {
        name: 'patient_details.patient_id',
        label: 'Patient ID (Optional)',
        type: 'text',
        placeholder: 'e.g., P-12345',
        gridSpan: 6,
      },
      {
        name: 'patient_details.age',
        label: 'Age',
        type: 'number',
        placeholder: 'Patient age',
        gridSpan: 6,
      },
      {
        name: 'patient_details.gender',
        label: 'Gender',
        type: 'select',
        options: GENDER_OPTIONS,
        gridSpan: 6,
      },
      {
        name: 'patient_details.occupation',
        label: 'Occupation',
        type: 'text',
        placeholder: 'Occupation',
        gridSpan: 6,
      },
      {
        name: 'patient_details.location',
        label: 'Location',
        type: 'text',
        placeholder: 'City, Region',
        gridSpan: 6,
      },
      {
        name: 'patient_details.presenting_date',
        label: 'Presenting Date',
        type: 'date',
        gridSpan: 6,
      },
    ],
  },
  {
    id: 'chief-complaint-hpi',
    stepNumber: 2,
    title: 'Chief Complaint',
    description: 'Main presenting complaint and history of present illness narrative.',
    fields: [
      {
        name: 'chief_complaint_history.chief_complaint',
        label: 'Chief Complaint',
        type: 'textarea',
        required: true,
        placeholder: 'Primary complaint...',
        gridSpan: 12,
      },
      {
        name: 'chief_complaint_history.hpi_duration',
        label: 'Duration',
        type: 'text',
        placeholder: 'e.g., 3 days',
        gridSpan: 6,
      },
      {
        name: 'chief_complaint_history.hpi_onset',
        label: 'Onset',
        type: 'text',
        placeholder: 'e.g., Sudden, Gradual',
        gridSpan: 6,
      },
      {
        name: 'chief_complaint_history.hpi_aggravating',
        label: 'Aggravating Factors',
        type: 'text',
        placeholder: 'What makes it worse?',
        gridSpan: 6,
      },
      {
        name: 'chief_complaint_history.hpi_relieving',
        label: 'Relieving Factors',
        type: 'text',
        placeholder: 'What makes it better?',
        gridSpan: 6,
      },
      {
        name: 'chief_complaint_history.hpi_additional',
        label: 'History of Present Illness (HPI)',
        type: 'textarea',
        placeholder: 'Detailed narrative of symptoms...',
        gridSpan: 12,
      },
      {
        name: 'chief_complaint_history.associated_symptoms',
        label: 'Associated Symptoms',
        type: 'text',
        placeholder: 'e.g., Nausea, Fever',
        gridSpan: 12,
      },
    ],
  },
  {
    id: 'medical-history',
    stepNumber: 3,
    title: 'Medical History',
    description: 'Past medical history, medications, allergies, and review of systems.',
    fields: [
      {
        name: 'medical_history.past_medical_history',
        label: 'Common Past Medical History',
        type: 'checkbox-list',
        options: COMMON_PMH_OPTIONS,
        gridSpan: 12,
      },
      {
        name: 'medical_history.custom_medical_history',
        label: 'Additional Past Medical History',
        type: 'textarea',
        placeholder: 'Other conditions or surgical history...',
        gridSpan: 12,
      },
      {
        name: 'medical_history.family_history',
        label: 'Family History',
        type: 'textarea',
        placeholder: 'Relevant family medical conditions...',
        gridSpan: 12,
      },
      {
        name: 'medical_history.social_history_smoking',
        label: 'Smoking History',
        type: 'text',
        placeholder: 'e.g., Non-smoker, 10 pack-years',
        gridSpan: 4,
      },
      {
        name: 'medical_history.social_history_alcohol',
        label: 'Alcohol History',
        type: 'text',
        placeholder: 'e.g., None, Socially',
        gridSpan: 4,
      },
      {
        name: 'medical_history.social_history_occupation',
        label: 'Occupational Hazards',
        type: 'text',
        placeholder: 'Occupational exposures',
        gridSpan: 4,
      },
      {
        name: 'medical_history.allergies',
        label: 'Allergies',
        type: 'chip-input',
        placeholder: 'Add allergy and press Enter',
        gridSpan: 12,
      },
      {
        name: 'current_medications',
        label: 'Current Medications',
        type: 'repeatable-group',
        addButtonText: 'Add Medication',
        defaultItemValue: { name: '', dose: '', frequency: '' },
        itemFields: [
          { name: 'name', label: 'Medication', type: 'text', placeholder: 'Name', gridSpan: 4 },
          { name: 'dose', label: 'Dose', type: 'text', placeholder: 'Dose', gridSpan: 3 },
          { name: 'frequency', label: 'Frequency', type: 'text', placeholder: 'Frequency', gridSpan: 4 },
        ],
        gridSpan: 12,
      },
      // Review of systems
      { name: 'review_of_systems.constitutional', label: 'ROS - Constitutional', type: 'textarea', placeholder: 'Fever, weight loss...', gridSpan: 6 },
      { name: 'review_of_systems.cardiovascular', label: 'ROS - Cardiovascular', type: 'textarea', placeholder: 'Chest pain, palpitations...', gridSpan: 6 },
      { name: 'review_of_systems.respiratory', label: 'ROS - Respiratory', type: 'textarea', placeholder: 'Shortness of breath, cough...', gridSpan: 6 },
      { name: 'review_of_systems.gastrointestinal', label: 'ROS - Gastrointestinal', type: 'textarea', placeholder: 'Nausea, abdominal pain...', gridSpan: 6 },
      { name: 'review_of_systems.neurological', label: 'ROS - Neurological', type: 'textarea', placeholder: 'Headache, dizziness...', gridSpan: 6 },
      { name: 'review_of_systems.musculoskeletal', label: 'ROS - Musculoskeletal', type: 'textarea', placeholder: 'Joint pain...', gridSpan: 6 },
      { name: 'review_of_systems.dermatological', label: 'ROS - Dermatological', type: 'textarea', placeholder: 'Rash, lesions...', gridSpan: 6 },
      { name: 'review_of_systems.psychiatric', label: 'ROS - Psychiatric', type: 'textarea', placeholder: 'Mood, sleep...', gridSpan: 6 },
      { name: 'review_of_systems.other', label: 'ROS - Other Systems', type: 'textarea', placeholder: 'Other findings...', gridSpan: 12 },
    ],
  },
  {
    id: 'examination',
    stepNumber: 4,
    title: 'Examination',
    description: 'Physical examination findings and vital signs.',
    fields: [
      {
        name: 'examination_findings.general_appearance',
        label: 'General Appearance',
        type: 'textarea',
        placeholder: 'Patient appearance, distress level...',
        gridSpan: 12,
      },
      {
        name: 'examination_findings.vital_signs',
        label: 'Vital Signs',
        type: 'custom',
        customComponentId: 'vital_signs_grid',
        gridSpan: 12,
      },
      { name: 'examination_findings.systemic.cardiovascular', label: 'Cardiovascular Exam', type: 'textarea', placeholder: 'Heart sounds, murmurs...', gridSpan: 6 },
      { name: 'examination_findings.systemic.respiratory', label: 'Respiratory Exam', type: 'textarea', placeholder: 'Breath sounds, rales...', gridSpan: 6 },
      { name: 'examination_findings.systemic.gastrointestinal', label: 'Gastrointestinal Exam', type: 'textarea', placeholder: 'Abdomen tenderness, bowel sounds...', gridSpan: 6 },
      { name: 'examination_findings.systemic.neurological', label: 'Neurological Exam', type: 'textarea', placeholder: 'Cranial nerves, motor/sensory...', gridSpan: 6 },
      { name: 'examination_findings.systemic.musculoskeletal', label: 'Musculoskeletal Exam', type: 'textarea', placeholder: 'Deformities, range of motion...', gridSpan: 6 },
      { name: 'examination_findings.systemic.dermatological', label: 'Dermatological Exam', type: 'textarea', placeholder: 'Skin signs...', gridSpan: 6 },
      { name: 'examination_findings.systemic.thyroid', label: 'Thyroid / Neck Exam', type: 'textarea', placeholder: 'JVP, thyroid enlargement...', gridSpan: 12 },
    ],
  },
  {
    id: 'investigations',
    stepNumber: 5,
    title: 'Investigations',
    description: 'Laboratory tests, imaging, procedures, and attachments.',
    fields: [],
    customComponentId: 'investigations_section',
  },
  {
    id: 'diagnosis-management',
    stepNumber: 6,
    title: 'Diagnosis',
    description: 'Diagnoses, management plan, prescribed drugs, and outcome.',
    fields: [
      {
        name: 'diagnosis_management.provisional_diagnosis',
        label: 'Provisional Diagnosis',
        type: 'text',
        placeholder: 'Provisional diagnosis',
        gridSpan: 6,
      },
      {
        name: 'diagnosis_management.differential_diagnoses',
        label: 'Differential Diagnoses',
        type: 'chip-input',
        placeholder: 'Add differential diagnosis and press Enter',
        gridSpan: 6,
      },
      {
        name: 'diagnosis_management.final_diagnosis',
        label: 'Final Diagnosis',
        type: 'text',
        placeholder: 'Final diagnosis',
        gridSpan: 12,
      },
      {
        name: 'diagnosis_management.treatment_plan',
        label: 'Treatment Plan',
        type: 'textarea',
        placeholder: 'Detail treatment and management plan...',
        gridSpan: 12,
      },
      {
        name: 'diagnosis_management.medications_prescribed',
        label: 'Prescribed Medications',
        type: 'repeatable-group',
        addButtonText: 'Add Prescribed Medication',
        defaultItemValue: { drug: '', dose: '', frequency: '', duration: '' },
        itemFields: [
          { name: 'drug', label: 'Drug', type: 'text', placeholder: 'Drug', gridSpan: 4 },
          { name: 'dose', label: 'Dose', type: 'text', placeholder: 'Dose', gridSpan: 3 },
          { name: 'frequency', label: 'Frequency', type: 'text', placeholder: 'Frequency', gridSpan: 4 },
          { name: 'duration', label: 'Duration', type: 'text', placeholder: 'Duration', gridSpan: 4 },
        ],
        gridSpan: 12,
      },
      {
        name: 'diagnosis_management.follow_up_plan',
        label: 'Follow-up Plan',
        type: 'textarea',
        placeholder: 'Follow-up instructions...',
        gridSpan: 6,
      },
      {
        name: 'diagnosis_management.prognosis',
        label: 'Prognosis',
        type: 'textarea',
        placeholder: 'Prognosis details...',
        gridSpan: 6,
      },
      {
        name: 'diagnosis_management.outcome',
        label: 'Outcome',
        type: 'textarea',
        placeholder: 'Case outcome...',
        gridSpan: 12,
      },
      {
        name: 'diagnosis_management.reference_pdfs',
        label: 'Reference PDFs',
        type: 'repeatable-group',
        addButtonText: 'Add Reference PDF URL',
        defaultItemValue: { filename: '', url: '' },
        itemFields: [
          { name: 'filename', label: 'Document Name', type: 'text', placeholder: 'e.g. Scanned Lab Report.pdf', gridSpan: 5 },
          { name: 'url', label: 'PDF File URL', type: 'text', placeholder: 'https://example.com/doc.pdf', gridSpan: 6 },
        ],
        gridSpan: 12,
      },
      {
        name: 'learning_points',
        label: 'Learning Points',
        type: 'chip-input',
        placeholder: 'Add learning point and press Enter',
        gridSpan: 12,
      },
    ],
  },
];

/** Utility to get section config by step number */
export function getSectionByStep(stepNumber: number): SectionConfig | undefined {
  return CASE_FORM_SECTIONS.find((s) => s.stepNumber === stepNumber);
}

/** Returns fields to trigger RHF validation for a given step */
export function getStepFieldsToValidate(stepNumber: number): string[] {
  if (stepNumber === 1) return ['title', 'specialty', 'difficulty', 'tags', 'patient_details'];
  if (stepNumber === 2) return ['chief_complaint_history'];
  if (stepNumber === 3) return ['medical_history', 'current_medications', 'review_of_systems'];
  if (stepNumber === 4) return ['examination_findings'];
  if (stepNumber === 5) return ['investigations'];
  if (stepNumber === 6) return ['diagnosis_management', 'learning_points'];
  return [];
}
