'use server';

// Server actions for verifying case writers (lib/writers/): a person's own details, and the admin's decisions.

import { revalidatePath } from 'next/cache';
import { getOrCreateCurrentUser } from './case-actions';
import { decideWriter, getWriterProfile, listWriters, proofLink, saveWriterDetails, writerStanding } from '@/lib/writers/server';
import type { WriterDetails, WriterForAdmin, WriterKind, WriterStanding } from '@/lib/writers/shared';

type Result = { ok: true } | { ok: false; error: string };

export async function fetchMyWriterStanding(): Promise<WriterStanding> {
  const user = await getOrCreateCurrentUser();
  return writerStanding(user);
}

/** The form at /welcome. The details travel as form fields so the ID photo can travel with them. */
export async function saveWriterDetailsAction(form: FormData): Promise<Result> {
  try {
    const user = await getOrCreateCurrentUser();
    const text = (key: string) => String(form.get(key) ?? '');
    const details: WriterDetails = {
      name: text('name'),
      kind: text('kind') as WriterKind,
      institution: text('institution'),
      year_or_designation: text('year_or_designation'),
      state: text('state'),
      phone: text('phone'),
      council: text('council'),
      registration_no: text('registration_no'),
      upi_id: text('upi_id'),
      declared_medico: text('declared_medico') === 'yes',
      declared_own_work: text('declared_own_work') === 'yes',
    };
    const proof = form.get('proof');
    const problem = await saveWriterDetails(user, details, proof instanceof File ? proof : null);
    if (problem) return { ok: false, error: problem };
    revalidatePath('/welcome');
    revalidatePath('/dashboard/author', 'layout');
    return { ok: true };
  } catch (error) {
    console.error('[writers] saving details failed:', error);
    return { ok: false, error: 'We could not save your details. Please try again.' };
  }
}

async function requireAdmin() {
  const user = await getOrCreateCurrentUser();
  if (user.role !== 'admin') throw new Error('Admins only');
  return user;
}

export async function fetchWritersAction(): Promise<WriterForAdmin[]> {
  await requireAdmin();
  return listWriters();
}

export async function openProofAction(userId: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    const url = await proofLink(userId);
    return url ? { ok: true, url } : { ok: false, error: 'There is no ID photo for this person.' };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not open the ID photo.' };
  }
}

export async function decideWriterAction(userId: string, verify: boolean, note: string): Promise<Result> {
  try {
    const admin = await requireAdmin();
    if (!verify && !note.trim()) {
      const { profile } = await getWriterProfile(userId);
      if (profile?.status === 'pending') return { ok: false, error: 'Say why, so they know what to correct.' };
    }
    await decideWriter(userId, verify, note, admin.id);
    revalidatePath('/dashboard/admin/users');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not save the decision.' };
  }
}
