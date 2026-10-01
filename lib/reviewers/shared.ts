// Types and labels for the reviewer programme, safe to use in the browser (lib/reviewers/server.ts is server-only).

export type ReviewerKind = 'pg_resident' | 'faculty' | 'intern' | 'doctor';

export const KIND_LABEL: Record<ReviewerKind, string> = {
  pg_resident: 'PG resident',
  faculty: 'Faculty',
  intern: 'Intern',
  doctor: 'Doctor',
};

export interface ReviewerProfile {
  user_id: string;
  kind: ReviewerKind;
  designation: string | null;
  department: string | null;
  institution: string;
  specialties: string[];
  approved_specialties: string[];
  council: string | null;
  registration_no: string | null;
  linkedin_url: string | null;
  upi_id: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
  verified_at: string | null;
  created_at: string;
}

export interface ConversionReview {
  id: string;
  case_id: string;
  version: number;
  reviewer_id: string;
  claimed_at: string;
  claim_expires_at: string;
  decision: 'approved' | 'changes_requested' | null;
  comments: string | null;
  show_name: boolean;
  decided_at: string | null;
}

export interface QueueItem {
  caseId: string;
  title: string;
  specialty: string;
  customSpecialty: string | null;
  difficulty: string;
  version: number;
  convertedAt: string;
  author: string | null;
}

export interface Application {
  kind: ReviewerKind;
  designation: string;
  department: string;
  institution: string;
  specialties: string[];
  council: string;
  registration_no: string;
  linkedin_url: string;
  upi_id: string;
}

export interface ApplicationWithUser extends ReviewerProfile {
  name: string;
  email: string;
  role: string;
}
