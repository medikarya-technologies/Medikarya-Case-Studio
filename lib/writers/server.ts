import 'server-only';

import { createServiceClient } from '@/lib/supabase/server';
import { createNotification, updateUserName } from '@/lib/supabase/queries';
import { saveUpi } from '@/lib/rewards/server';
import type { User } from '@/lib/types';
import {
  PROOF_MAX_BYTES,
  PROOF_TYPES,
  WRITER_KIND_LABEL,
  writerDetailsProblem,
  type WriterDetails,
  type WriterForAdmin,
  type WriterProfile,
  type WriterStanding,
} from './shared';

// Verifying case writers (supabase/migrations/014_writer_verification.sql). A new person says who they are at
// /welcome and adds proof (a college ID photo, or a council registration number); an admin verifies them in
// Admin → Users; until then they can save drafts but not submit. Admins, faculty reviewers (a role an admin gives)
// and approved MediKarya reviewers (already checked against the medical register) count as verified.

export * from './shared';

const db = () => createServiceClient();
const PROOF_BUCKET = 'verification-proofs';

/** The table is not there until migration 014 has been run. Until then nobody is held back. */
const tableMissing = (error: { code?: string; message?: string } | null) =>
  !!error && (error.code === '42P01' || error.code === 'PGRST205' || /could not find the table|does not exist/i.test(error.message ?? ''));

export async function getWriterProfile(userId: string): Promise<{ profile: WriterProfile | null; available: boolean }> {
  const { data, error } = await db().from('writer_profiles').select('*').eq('user_id', userId).maybeSingle();
  if (tableMissing(error)) return { profile: null, available: false };
  if (error) throw error;
  return { profile: data as WriterProfile | null, available: true };
}

export async function writerStanding(user: Pick<User, 'id' | 'role'>): Promise<WriterStanding> {
  if (user.role === 'admin' || user.role === 'reviewer') return { state: 'verified', through: 'role' };
  const [{ profile, available }, { data: reviewer }] = await Promise.all([
    getWriterProfile(user.id),
    db().from('reviewer_profiles').select('status').eq('user_id', user.id).maybeSingle(),
  ]);
  if (!available) return { state: 'verified' };
  if (profile?.status === 'verified') return { state: 'verified' };
  if (reviewer?.status === 'approved') return { state: 'verified', through: 'reviewer' };
  if (!profile) return { state: 'none' };
  return { state: profile.status, note: profile.admin_note };
}

async function ensureProofBucket() {
  const client = db();
  const { data: buckets } = await client.storage.listBuckets();
  if (buckets?.some((b) => b.name === PROOF_BUCKET)) return;
  // Private: nothing in it has a public address. An admin opens a proof through a link that works for two minutes.
  const { error } = await client.storage.createBucket(PROOF_BUCKET, { public: false, fileSizeLimit: PROOF_MAX_BYTES, allowedMimeTypes: PROOF_TYPES });
  if (error && !/already exists/i.test(error.message)) throw error;
}

async function removeProof(path: string | null) {
  if (!path) return;
  const { error } = await db().storage.from(PROOF_BUCKET).remove([path]);
  if (error) console.error('[writers] could not remove a proof file:', error.message);
}

const clean = (s: string, max = 160) => s.trim().replace(/\s+/g, ' ').slice(0, max) || null;

/** Saves what the person told us at /welcome, and their proof. Returns what is wrong, or null when it is saved. */
export async function saveWriterDetails(user: User, d: WriterDetails, proof: File | null): Promise<string | null> {
  const { profile, available } = await getWriterProfile(user.id);
  if (!available) return 'This is not switched on yet. Please try again later.';

  // What an admin verified cannot be changed afterwards: only how to reach and pay them.
  if (profile?.status === 'verified') {
    const { error } = await db().from('writer_profiles').update({ phone: clean(d.phone, 20), updated_at: new Date().toISOString() }).eq('user_id', user.id);
    if (error) throw error;
    if (d.upi_id.trim()) await saveUpi(user.id, d.upi_id);
    return null;
  }

  const name = user.name_edited_once ? user.name : d.name;
  const problem = writerDetailsProblem({ ...d, name }, { given: !!proof && proof.size > 0, alreadyOnFile: !!profile?.proof_path });
  if (problem) return problem;

  let proofPath = profile?.proof_path ?? null;
  if (proof && proof.size > 0) {
    if (proof.size > PROOF_MAX_BYTES) return 'That file is too large. Please use a photo or a PDF under 4 MB.';
    if (!PROOF_TYPES.includes(proof.type)) return 'Please add a photo (JPG, PNG or WEBP) or a PDF.';
    await ensureProofBucket();
    const ext = proof.type === 'application/pdf' ? 'pdf' : proof.type === 'image/png' ? 'png' : proof.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await db().storage.from(PROOF_BUCKET).upload(path, Buffer.from(await proof.arrayBuffer()), { contentType: proof.type, upsert: false });
    if (error) {
      console.error('[writers] proof upload failed:', error.message);
      return 'We could not save your ID photo. Please try again.';
    }
    await removeProof(proofPath);
    proofPath = path;
  }

  // The name they give (or confirm) here is the one printed on cases and certificates, and the one the admin checks
  // against their ID: from now on it changes only through a request an admin approves.
  if (!user.name_edited_once && name.trim()) await updateUserName(user.id, name.trim(), true);

  const now = new Date().toISOString();
  const { error } = await db()
    .from('writer_profiles')
    .upsert(
      {
        user_id: user.id,
        kind: d.kind,
        institution: clean(d.institution),
        year_or_designation: clean(d.year_or_designation),
        state: clean(d.state, 60),
        phone: clean(d.phone, 20),
        council: clean(d.council),
        registration_no: clean(d.registration_no, 40),
        proof_path: proofPath,
        declared_at: now,
        status: 'pending', // new, or asking again after being turned down
        admin_note: null,
        updated_at: now,
      },
      { onConflict: 'user_id' }
    );
  if (error) throw error;

  if (d.upi_id.trim()) await saveUpi(user.id, d.upi_id).catch(() => undefined); // already checked by the form's rules

  // Tell the admins, once per request (not again when someone only corrects a field while waiting).
  if (profile?.status !== 'pending') {
    const { data: admins } = await db().from('users').select('id').eq('role', 'admin');
    const who = [WRITER_KIND_LABEL[d.kind], clean(d.institution)].filter(Boolean).join(', ');
    await Promise.all((admins ?? []).map((a) => createNotification(a.id, 'verification_requested', `${name.trim()} (${who}) asked to be verified as a case writer. Open Manage Users.`)));
  }
  return null;
}

/** Everyone who has a writer profile, newest request first. Admin only (checked by the action). */
export async function listWriters(): Promise<WriterForAdmin[]> {
  const { data, error } = await db()
    .from('writer_profiles')
    .select('*, users!writer_profiles_user_id_fkey(name, email, role)')
    .order('updated_at', { ascending: false });
  if (tableMissing(error)) return [];
  if (error) throw error;
  return (data ?? []).map(({ proof_path, users, ...rest }: any) => ({
    ...rest,
    name: users?.name ?? '',
    email: users?.email ?? '',
    role: users?.role ?? '',
    has_proof: !!proof_path,
  }));
}

/** A link to someone's proof that works for two minutes. */
export async function proofLink(userId: string): Promise<string | null> {
  const { profile } = await getWriterProfile(userId);
  if (!profile?.proof_path) return null;
  const { data, error } = await db().storage.from(PROOF_BUCKET).createSignedUrl(profile.proof_path, 120);
  if (error) throw error;
  return data.signedUrl;
}

/**
 * Verifies someone, or turns them down with a reason. It also works for a person who never filled in the form (an
 * admin who knows them verifies them by hand). The ID photo is removed as soon as there is a decision: it was only
 * needed to make it.
 */
export async function decideWriter(userId: string, verify: boolean, note: string, adminId: string): Promise<void> {
  const { profile, available } = await getWriterProfile(userId);
  if (!available) throw new Error('Run migration 014 first.');
  const now = new Date().toISOString();
  const { error } = await db()
    .from('writer_profiles')
    .upsert(
      {
        user_id: userId,
        status: verify ? 'verified' : 'rejected',
        admin_note: note.trim().slice(0, 400) || null,
        verified_by: adminId,
        verified_at: now,
        proof_path: null,
        updated_at: now,
      },
      { onConflict: 'user_id' }
    );
  if (error) throw error;
  await removeProof(profile?.proof_path ?? null);
  await createNotification(
    userId,
    'verification_decided',
    verify
      ? 'You are verified. You can now submit cases for review.'
      : `We could not verify you yet${note.trim() ? `: ${note.trim()}` : '.'} You can correct your details and ask again.`
  );
}

/**
 * Who may write a LIVE COURSE for a case (lib/live-plan.ts): residents and above. A live course says how a patient
 * deteriorates and what each treatment does, which takes having managed such patients: admins and faculty reviewers
 * (by role), verified writers who are PG residents, practising doctors or faculty, and approved MediKarya reviewers of
 * those kinds. Not students or interns.
 */
export async function canWriteLiveCourse(user: Pick<User, 'id' | 'role'>): Promise<boolean> {
  if (user.role === 'admin' || user.role === 'reviewer') return true;
  const senior = ['pg_resident', 'doctor', 'faculty'];
  const [{ profile }, { data: reviewer }] = await Promise.all([
    getWriterProfile(user.id),
    db().from('reviewer_profiles').select('status, kind').eq('user_id', user.id).maybeSingle(),
  ]);
  if (profile?.status === 'verified' && profile.kind && senior.includes(profile.kind)) return true;
  return reviewer?.status === 'approved' && senior.includes(reviewer.kind);
}
