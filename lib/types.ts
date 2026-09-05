export type UserRole = 'author' | 'reviewer' | 'admin';

export interface User {
  id: string;
  clerk_id: string;
  name: string;
  email: string;
  role: UserRole;
  portfolio_public?: boolean;
  name_edited_once?: boolean;
  created_at: string;
}

export type NameChangeRequestStatus = 'pending' | 'approved' | 'rejected';

export interface NameChangeRequest {
  id: string;
  user_id: string;
  requested_name: string;
  status: NameChangeRequestStatus;
  created_at: string;
  resolved_at?: string | null;
  resolved_by?: string | null;
  user?: User;
}

export type CaseStatus = 'draft' | 'submitted' | 'approved' | 'changes_requested';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type MedicalSpecialty =
  | 'cardiology'
  | 'pulmonology'
  | 'gastroenterology'
  | 'neurology'
  | 'orthopedics'
  | 'dermatology'
  | 'emergency_medicine'
  | 'family_medicine'
  | 'internal_medicine'
  | 'pediatrics'
  | 'other';

// --- Patient Details ---
export interface PatientDetails {
  case_no?: string;
  patient_name?: string;
  age?: number;
  sex?: 'male' | 'female' | 'other';
  religion?: string;
  occupation?: string;
  address?: string;
  date_of_admission?: string;
  // Backward compatibility fields
  patient_id?: string;
  gender?: 'male' | 'female' | 'other';
  location?: string;
  presenting_date?: string;
}

// --- 2. History ---
export interface CaseHistory {
  presenting_complaints?: string;
  history_of_present_illness?: string;
  past_history?: string;
  personal_history?: string;
  treatment_history?: string;
  family_history?: string;
  menstrual_history?: string;
  obstetric_history?: string;
  socio_economic_history?: string;
  any_other?: string;
}

// Legacy Chief Complaint & History for old cases
export interface ChiefComplaintHistory {
  chief_complaint: string;
  hpi_duration?: string;
  hpi_onset?: string;
  hpi_aggravating?: string;
  hpi_relieving?: string;
  hpi_additional?: string;
  associated_symptoms?: string;
}

// --- Medical & Personal History (Legacy support) ---
export interface MedicalPersonalHistory {
  past_medical_history: string[];
  custom_medical_history?: string;
  family_history?: string;
  social_history_smoking?: string;
  social_history_alcohol?: string;
  social_history_occupation?: string;
  allergies: string[];
}

export interface CurrentMedication {
  id?: string;
  name: string;
  dose: string;
  frequency: string;
}

export interface ReviewOfSystems {
  constitutional?: string;
  cardiovascular?: string;
  respiratory?: string;
  gastrointestinal?: string;
  neurological?: string;
  musculoskeletal?: string;
  dermatological?: string;
  psychiatric?: string;
  other?: string;
}

// --- 3. General Physical Examination ---
export interface LymphNodes {
  cervical?: string;
  axillary?: string;
  inguinal?: string;
}

export interface GeneralPhysicalExam {
  consciousness_orientation?: string;
  pallor?: string;
  cyanosis?: string;
  icterus?: string;
  peripheral_oedema?: string;
  clubbing?: string;
  jvp?: string;
  lymph_nodes?: LymphNodes;
  pulse?: string;
  bp?: string;
  respiratory_rate?: string;
  temperature?: string;
  other_significant_findings?: string;
}

export interface VitalSigns {
  bp_systolic?: number;
  bp_diastolic?: number;
  hr?: number;
  rr?: number;
  temp?: number;
  spo2?: number;
  weight?: number;
  height?: number;
  bmi?: number;
}

// --- 4. Systemic Examination ---
export interface SystemicExamination {
  respiratory_system?: string;
  cardiovascular_system?: string;
  nervous_system?: string;
  genito_urinary_system?: string;
  gastrointestinal_system?: string;

  // Legacy fields
  cardiovascular?: string;
  respiratory?: string;
  gastrointestinal?: string;
  neurological?: string;
  musculoskeletal?: string;
  dermatological?: string;
  thyroid?: string;
}

// --- 5. Local Examination ---
export interface LocalExamination {
  region?: string;
  inspection?: string;
  palpation?: string;
  percussion?: string;
  auscultation?: string;

  // Legacy fields
  location_extent?: string;
  surface_margins?: string;
  consistency?: string;
  tenderness?: string;
  mobility_fixity?: string;
  regional_lymph_nodes?: string;
  other_local_findings?: string;
}

export interface ExaminationFindings {
  general_appearance?: string;
  vital_signs: VitalSigns;
  local?: LocalExamination;
  systemic: SystemicExamination;
}

// --- 6. Diagnosis ---
export interface DiagnosisInfo {
  provisional_diagnosis?: string;
  differential_diagnosis?: string;

  // Legacy fields
  differential_diagnoses?: string[];
  final_diagnosis?: string;
}

// --- 7. Investigations ---
export interface InvestigationsInfo {
  confirmation_performed?: 'yes' | 'no' | 'not_required';
  investigations_confirmation?: string;
  confirmation_explanation?: string;

  staging_applicable?: 'yes' | 'no';
  investigations_staging?: string;
  staging_explanation?: string;
}

export interface Investigation {
  id?: string;
  type: 'lab' | 'imaging' | 'biopsy' | 'other';
  test_name: string;
  result?: string;
  normal_range?: string;
  date?: string;
  interpretation?: string;
  image_url?: string;
}

// --- Diagnosis & Management (Legacy) ---
export interface PrescribedMedication {
  id?: string;
  drug: string;
  dose: string;
  frequency: string;
  duration: string;
}

export interface DiagnosisManagement {
  provisional_diagnosis?: string;
  differential_diagnoses: string[];
  final_diagnosis?: string;
  treatment_plan?: string;
  medications_prescribed: PrescribedMedication[];
  follow_up_plan?: string;
  prognosis?: string;
  outcome?: string;
  reference_pdfs?: { filename: string; url: string }[];
}

export interface CaseAttachment {
  id: string;
  case_id: string;
  investigation_id?: string | null;
  investigation_group?: 'confirmation' | 'staging' | null;
  file_name: string;
  file_type: 'image' | 'pdf';
  file_size: number;
  storage_path: string;
  public_url: string;
  uploaded_by?: string | null;
  created_at: string;
}

// --- Per-Case Custom Field ---
export interface CustomField {
  id: string;
  sectionId: string;
  label: string;
  type: 'text' | 'textarea';
  value: string;
}

// --- Main Case Interface ---
export interface Case {
  id: string;
  author_id: string;
  title: string;
  status: CaseStatus;
  specialty: MedicalSpecialty;
  custom_specialty?: string | null;
  difficulty: DifficultyLevel;
  tags: string[];
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  assigned_reviewer_id?: string | null;
  added_to_platform?: boolean;
  original_author_name?: string | null;
  author?: User;
  reviews?: CaseReview[];

  // 7 New Consolidated Sections
  patient_details?: PatientDetails;
  history?: CaseHistory;
  general_physical_examination?: GeneralPhysicalExam;
  systemic_examination?: SystemicExamination;
  local_examination?: LocalExamination;
  diagnosis?: DiagnosisInfo;
  investigations_info?: InvestigationsInfo;

  // Legacy data fields (retained so old cases won't break)
  chief_complaint_history?: ChiefComplaintHistory;
  medical_history?: MedicalPersonalHistory;
  current_medications?: CurrentMedication[];
  review_of_systems?: ReviewOfSystems;
  examination_findings?: ExaminationFindings;
  investigations?: Investigation[];
  diagnosis_management?: DiagnosisManagement;
  learning_points?: string[];

  attachments?: CaseAttachment[];
  custom_fields?: CustomField[];
}

export interface SectionComment {
  id?: string;
  sectionId: string;
  sectionLabel: string;
  text: string;
}

export function parseReviewComments(rawComments: string): SectionComment[] {
  if (!rawComments || !rawComments.trim()) return [];
  try {
    const parsed = JSON.parse(rawComments);
    if (Array.isArray(parsed)) {
      return parsed.map((item, idx) => ({
        id: item.id || `sc_${idx}`,
        sectionId: item.sectionId || 'general',
        sectionLabel: item.sectionLabel || 'General Feedback',
        text: item.text || '',
      }));
    }
  } catch (e) {
    // Legacy plain text fallback
  }
  return [
    {
      id: 'sc_legacy',
      sectionId: 'general',
      sectionLabel: 'General Feedback',
      text: rawComments,
    },
  ];
}

export interface CaseReview {
  id: string;
  case_id: string;
  reviewer_id: string;
  decision: 'approved' | 'changes_requested';
  comments: string;
  created_at: string;
  reviewer?: User;
}

export type NotificationType =
  | 'case_submitted'
  | 'case_approved'
  | 'changes_requested'
  | 'new_comment'
  | 'reviewer_assigned';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  message: string;
  related_case_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface CaseComment {
  id: string;
  case_id: string;
  user_id: string;
  message: string;
  created_at: string;
  user?: User;
}

export interface AnalyticsSummary {
  bySpecialty: { specialty: string; count: number }[];
  byStatus: { status: string; count: number }[];
  avgDaysToApproval: number | null;
  topAuthors: { author_id: string; name: string; count: number }[];
}

// --- Keep original types for backward compatibility ---
export type SectionType =
  | 'chief_complaint'
  | 'history'
  | 'examination'
  | 'diagnosis'
  | 'treatment'
  | 'outcome';

export interface CaseSection {
  id: string;
  case_id: string;
  section_type: SectionType;
  content: string;
  order: number;
  created_at: string;
  updated_at: string;
}
