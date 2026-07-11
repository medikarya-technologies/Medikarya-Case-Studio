import { createServerSupabaseClient, createServiceClient } from './server';
import type { Case, CaseReview, User } from '@/lib/types';
import type { SupabaseClient } from '@supabase/supabase-js';

// --- User Operations ---
export async function getOrCreateUser(
  clerkId: string,
  name: string,
  email: string,
  role: string = 'author'
): Promise<User> {
  const supabase = createServiceClient();

  let { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_id', clerkId)
    .single();

  if (!user) {
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{ clerk_id: clerkId, name, email, role }])
      .select('*')
      .single();

    if (error) throw error;
    return newUser as User;
  }

  return user as User;
}

export async function getUserByClerkId(clerkId: string): Promise<User | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_id', clerkId)
    .single();

  return data as User | null;
}

// Get all users in the system (for admin user management)
export async function getAllUsers(): Promise<User[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all users:', error);
    throw error;
  }

  return (data as User[]) || [];
}

// Update a user's role directly (admin-only action, enforced at the action/route level)
export async function updateUserRole(
  userId: string,
  newRole: 'author' | 'reviewer' | 'admin'
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from('users')
    .update({ role: newRole })
    .eq('id', userId);

  if (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}

// --- Case Operations ---
export async function getAuthorCases(
  userId: string,
  supabase?: SupabaseClient
): Promise<Case[]> {
  const client = supabase || createServiceClient();
  const { data } = await client
    .from('cases')
    .select('*')
    .eq('author_id', userId)
    .order('updated_at', { ascending: false });

  return data as Case[];
}

export async function getAllCases(
  supabase?: SupabaseClient
): Promise<Case[]> {
  const client = supabase || createServiceClient();
  const { data } = await client
    .from('cases')
    .select('*')
    .order('updated_at', { ascending: false });

  return data as Case[];
}

export async function getCaseById(
  caseId: string,
  supabase?: SupabaseClient
): Promise<Case & { reviews?: CaseReview[] } | null> {
  const client = supabase || createServiceClient();
  const { data: caseData } = await client
    .from('cases')
    .select('*')
    .eq('id', caseId)
    .single();

  if (!caseData) return null;

  const { data: reviews } = await client
    .from('case_reviews')
    .select('*, users(name)')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true });

  return {
    ...caseData,
    reviews: reviews || [],
  } as any;
}

export async function createCase(
  userId: string,
  caseData: Omit<Case, 'id' | 'author_id' | 'created_at' | 'updated_at' | 'approved_at' | 'author' | 'reviews'>
): Promise<Case> {
  const supabase = createServiceClient();

  console.log('createCase: inserting into cases:', { author_id: userId, ...caseData });

  const { data: newCase, error: caseError } = await supabase
    .from('cases')
    .insert([{ author_id: userId, ...caseData }])
    .select('*')
    .single();

  if (caseError) {
    console.error('Error creating case:', caseError);
    throw caseError;
  }

  return newCase as Case;
}

export async function updateCase(
  caseId: string,
  caseData: Partial<Omit<Case, 'id' | 'author_id' | 'created_at' | 'updated_at' | 'approved_at' | 'author' | 'reviews'>>
): Promise<void> {
  const supabase = createServiceClient();

  console.log('updateCase: updating case', caseId, 'with:', caseData);

  const { error } = await supabase
    .from('cases')
    .update({ ...caseData })
    .eq('id', caseId);

  if (error) {
    console.error('Error updating case:', error);
    throw error;
  }
}

export async function submitCase(caseId: string): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from('cases')
    .update({ status: 'submitted' })
    .eq('id', caseId);
}

export async function deleteCase(caseId: string): Promise<void> {
  const supabase = createServiceClient();
  await supabase.from('cases').delete().eq('id', caseId);
}

// --- Review Operations ---
export async function createReview(
  caseId: string,
  reviewerId: string,
  decision: 'approved' | 'changes_requested',
  comments: string
): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from('case_reviews')
    .insert([{ case_id: caseId, reviewer_id: reviewerId, decision, comments }]);

  if (error) throw error;

  const { error: caseError } = await supabase
    .from('cases')
    .update({
      status: decision,
      ...(decision === 'approved' && { approved_at: new Date().toISOString() }),
    })
    .eq('id', caseId);

  if (caseError) throw caseError;
}