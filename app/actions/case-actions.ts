'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
import { getOrCreateUser, getAuthorCases, createCase, updateCase, getCaseById, deleteCase, getAllCases, createReview, getAllUsers, updateUserRole } from '@/lib/supabase/queries';
import type { CaseFormData } from '@/lib/case-schema';
import type { Case, User } from '@/lib/types';
import { validateCaseForSubmit } from '@/lib/case-submit-validation';
import { caseTemplates } from '@/lib/caseTemplates';

export async function getOrCreateCurrentUser() {
  const authResult = await auth();
  const clerkUser = await currentUser();
  const { userId } = authResult;

  if (!userId || !clerkUser) {
    throw new Error('User not authenticated');
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  const name = clerkUser.fullName || clerkUser.username || 'Unknown User';

  const user = await getOrCreateUser(userId, name, email);
  return user;
}

export async function fetchAuthorCases(): Promise<Case[]> {
  const user = await getOrCreateCurrentUser();
  const cases = await getAuthorCases(user.id);
  return cases;
}

export async function fetchAllCases(): Promise<Case[]> {
  const cases = await getAllCases();
  return cases;
}

export async function fetchCaseById(caseId: string): Promise<Case | null> {
  const caseData = await getCaseById(caseId);
  return caseData;
}

export async function saveDraftCase(data: CaseFormData, caseId?: string): Promise<{ caseId: string }> {
  const user = await getOrCreateCurrentUser();

  if (caseId) {
    console.log('Updating case:', caseId, data);
    try {
      await updateCase(caseId, { ...data, status: 'draft' });
    } catch (err) {
      console.error('Error updating case:', err);
      throw err;
    }
    return { caseId };
  } else {
    console.log('Creating case for user:', user.id, 'data:', data);
    try {
      const newCase = await createCase(user.id, { ...data, status: 'draft' });
      console.log('Created case:', newCase);
      return { caseId: newCase.id };
    } catch (err) {
      console.error('Error creating case:', err);
      throw err;
    }
  }
}

export async function submitCaseAction(caseId: string): Promise<void> {
  const user = await getOrCreateCurrentUser();
  const caseData = await getCaseById(caseId);

  if (!caseData) {
    throw new Error('Case not found');
  }

  if (caseData.author_id !== user.id && user.role !== 'admin') {
    throw new Error('Not authorized to submit this case');
  }

  const validationErrors = validateCaseForSubmit(caseData as CaseFormData);
  if (validationErrors.length > 0) {
    throw new Error(
      validationErrors.map((e) => e.message).join('. ')
    );
  }

  const supabase = (await import('@/lib/supabase/server')).createServiceClient();
  const { error } = await supabase
    .from('cases')
    .update({ status: 'submitted' })
    .eq('id', caseId);

  if (error) {
    throw error;
  }
}

export async function deleteCaseAction(caseId: string): Promise<void> {
  await deleteCase(caseId);
}

export async function approveCaseAction(caseId: string, comments?: string): Promise<void> {
  const user = await getOrCreateCurrentUser();
  await createReview(caseId, user.id, 'approved', comments || '');
}

export async function requestChangesAction(caseId: string, comments: string): Promise<void> {
  const user = await getOrCreateCurrentUser();
  await createReview(caseId, user.id, 'changes_requested', comments);
}

export async function useTemplateAction(templateId: string): Promise<string> {
  const user = await getOrCreateCurrentUser();
  const template = caseTemplates.find(t => t.id === templateId);
  
  if (!template) {
    throw new Error('Template not found');
  }
  
  const newCase = await createCase(user.id, { 
    ...template.content, 
    status: 'draft' 
  } as any);
  
  return newCase.id;
}

// --- Admin: User Management Actions ---

export async function fetchAllUsers(): Promise<User[]> {
  const currentUserRecord = await getOrCreateCurrentUser();
  if (currentUserRecord.role !== 'admin') {
    throw new Error('Only admins can view the full user list');
  }
  const users = await getAllUsers();
  return users;
}

export async function updateUserRoleAction(
  targetUserId: string,
  newRole: 'author' | 'reviewer' | 'admin'
): Promise<void> {
  const currentUserRecord = await getOrCreateCurrentUser();
  if (currentUserRecord.role !== 'admin') {
    throw new Error('Only admins can change user roles');
  }
  await updateUserRole(targetUserId, newRole);
}