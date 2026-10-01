import type { MedicalSpecialty } from '@/lib/types';
import { formatSpecialtyLabel } from '@/lib/specialtyIcons';

// The specialties a reviewer can apply for and be approved for: the same list as a case's specialty, so a case
// matches its reviewers exactly. "Other" covers cases filed under a custom specialty.
export const REVIEW_SPECIALTIES: MedicalSpecialty[] = [
  'internal_medicine',
  'general_surgery',
  'obstetrics_gynaecology',
  'pediatrics',
  'cardiology',
  'pulmonology',
  'gastroenterology',
  'neurology',
  'orthopedics',
  'dermatology',
  'psychiatry',
  'ent',
  'ophthalmology',
  'emergency_medicine',
  'family_medicine',
  'other',
];

export function specialtyLabel(s: string): string {
  const label = formatSpecialtyLabel(s);
  return label.charAt(0).toUpperCase() + label.slice(1);
}
