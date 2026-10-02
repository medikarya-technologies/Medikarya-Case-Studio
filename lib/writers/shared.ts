// Who a case writer is, and whether an admin has verified them (supabase/migrations/014_writer_verification.sql).
// Types, labels and the form's rules, safe to use in the browser (lib/writers/server.ts is server-only).

export type WriterKind = 'mbbs_student' | 'intern' | 'pg_resident' | 'doctor' | 'faculty';

export const WRITER_KINDS: ReadonlyArray<{ value: WriterKind; label: string; hint: string }> = [
  { value: 'mbbs_student', label: 'MBBS student', hint: 'Any year, any medical college' },
  { value: 'intern', label: 'Intern', hint: 'Compulsory rotating internship' },
  { value: 'pg_resident', label: 'PG resident', hint: 'MD / MS / DNB, any year' },
  { value: 'doctor', label: 'Practising doctor', hint: 'MBBS or above, not in a PG programme' },
  { value: 'faculty', label: 'Faculty', hint: 'Assistant professor and above' },
];

export const WRITER_KIND_LABEL = Object.fromEntries(WRITER_KINDS.map((k) => [k.value, k.label])) as Record<WriterKind, string>;

export const STUDENT_YEARS = ['1st year', '2nd year', '3rd year (Part 1)', 'Final year (Part 2)'] as const;

/** Students and interns have no registration number yet: their college ID is the proof. */
export const needsIdPhoto = (kind: WriterKind) => kind === 'mbbs_student' || kind === 'intern';

/**
 * Where someone stands as a case writer.
 *   none      has not told us who they are yet (the form at /welcome)
 *   pending   has, and an admin has not decided
 *   rejected  an admin could not verify them (the note says why); they can correct their details and ask again
 *   verified  may submit cases
 */
export type WriterState = 'none' | 'pending' | 'rejected' | 'verified';

export interface WriterStanding {
  state: WriterState;
  /** Why they count as verified without a profile of their own, when that is the case. */
  through?: 'role' | 'reviewer';
  note?: string | null;
}

export interface WriterProfile {
  user_id: string;
  kind: WriterKind | null;
  institution: string | null;
  year_or_designation: string | null;
  state: string | null;
  phone: string | null;
  council: string | null;
  registration_no: string | null;
  proof_path: string | null;
  declared_at: string | null;
  status: 'pending' | 'verified' | 'rejected';
  admin_note: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

/** A profile as an admin sees it. The proof itself is opened with a short-lived link, never sent with the list. */
export interface WriterForAdmin extends Omit<WriterProfile, 'proof_path'> {
  name: string;
  email: string;
  role: string;
  has_proof: boolean;
}

/** What the form at /welcome sends (the ID photo travels beside it). */
export interface WriterDetails {
  name: string;
  kind: WriterKind;
  institution: string;
  year_or_designation: string;
  state: string;
  phone: string;
  council: string;
  registration_no: string;
  upi_id: string;
  declared_medico: boolean;
  declared_own_work: boolean;
}

export const PROOF_MAX_BYTES = 4 * 1024 * 1024; // what one request to the server may carry, with room to spare
export const PROOF_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const isKind = (v: string): v is WriterKind => WRITER_KINDS.some((k) => k.value === v);

/** The first thing wrong with the form, in words for the person filling it in; null when it can be sent. */
export function writerDetailsProblem(d: WriterDetails, proof: { given: boolean; alreadyOnFile: boolean }): string | null {
  if (d.name.trim().length < 3) return 'Please enter your full name, as it should appear on your certificates.';
  if (!isKind(d.kind)) return 'Please choose what you are: student, intern, resident, doctor or faculty.';
  if (d.institution.trim().length < 3) return 'Please enter your college or hospital.';
  if (d.kind !== 'intern' && !d.year_or_designation.trim()) {
    return d.kind === 'mbbs_student' ? 'Please choose your year of study.' : 'Please enter your designation or department.';
  }
  const phone = d.phone.replace(/[\s-]/g, '');
  if (phone && !/^(\+91)?[6-9]\d{9}$/.test(phone)) return 'That does not look like an Indian mobile number. Leave it empty if you prefer.';
  if (d.upi_id.trim() && !/^[\w.-]{2,}@[a-zA-Z][\w.-]{1,}$/.test(d.upi_id.trim())) return 'That does not look like a UPI id (for example name@okhdfcbank). Leave it empty if you prefer.';
  const hasProof = proof.given || proof.alreadyOnFile;
  if (needsIdPhoto(d.kind) && !hasProof) return 'Please add a photo of your college ID card.';
  if (!needsIdPhoto(d.kind) && !hasProof && d.registration_no.trim().length < 3) {
    return 'Please give your medical council registration number, or add a photo of your registration certificate or hospital ID.';
  }
  if (!d.declared_medico || !d.declared_own_work) return 'Please tick both boxes at the end.';
  return null;
}
