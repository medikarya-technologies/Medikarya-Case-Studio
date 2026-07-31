export type UserRole = 'author' | 'reviewer' | 'admin';

export interface User {
  id: string;
  clerk_id: string;
  name: string;
  email: string;
  role: UserRole;
  portfolio_public?: boolean;
  created_at: string;
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
  patient_id?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  occupation?: string;
  location?: string;
  presenting_date?: string;
}

// --- Chief Complaint & History ---
export interface ChiefComplaintHistory {
  chief_complaint: string;
  hpi_duration?: string;
  hpi_onset?: string;
  hpi_aggravating?: string;
  hpi_relieving?: string;
  hpi_additional?: string;
  associated_symptoms?: string;
}

// --- Medical & Personal History ---
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

// --- Examination Findings ---
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

export interface SystemicExamination {
  cardiovascular?: string;
  respiratory?: string;
  gastrointestinal?: string;
  neurological?: string;
  musculoskeletal?: string;
  dermatological?: string;
  thyroid?: string;
}

export interface ExaminationFindings {
  general_appearance?: string;
  vital_signs: VitalSigns;
  systemic: SystemicExamination;
}

// --- Investigations ---
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

// --- Diagnosis & Management ---
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
  difficulty: DifficultyLevel;
  tags: string[];
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  assigned_reviewer_id?: string | null;
  author?: User;

  // Nested data (stored as JSONB or joined table)
  patient_details?: PatientDetails;
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
