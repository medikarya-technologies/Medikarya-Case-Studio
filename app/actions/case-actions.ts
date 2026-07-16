'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
import {
  getOrCreateUser,
  getAuthorCases,
  createCase,
  updateCase,
  getCaseById,
  deleteCase,
  getAllCases,
  createReview,
  getAllUsers,
  updateUserRole,
  assignReviewer,
  getReviewers,
  getCaseComments,
  createCaseComment,
  getCommentCountsByCaseIds,
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  createNotification,
  notifyReviewersAndAdminsOfSubmission,
  getAnalyticsSummary,
  getApprovedCasesByAuthor,
  setPortfolioPublic,
  getPublicPortfolio,
} from '@/lib/supabase/queries';
import type { CaseFormData } from '@/lib/case-schema';
import type {
  Case,
  User,
  CaseComment,
  Notification,
  AnalyticsSummary,
} from '@/lib/types';
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

export async function fetchCurrentUser(): Promise<User> {
  return getOrCreateCurrentUser();
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

export async function fetchCaseCommentCounts(
  caseIds: string[]
): Promise<Record<string, number>> {
  return getCommentCountsByCaseIds(caseIds);
}

export async function saveDraftCase(data: CaseFormData, caseId?: string): Promise<{ caseId: string }> {
  const user = await getOrCreateCurrentUser();

  if (caseId) {
    await updateCase(caseId, { ...data, status: 'draft' });
    return { caseId };
  }

  const newCase = await createCase(user.id, { ...data, status: 'draft' } as Omit<
    Case,
    'id' | 'author_id' | 'created_at' | 'updated_at' | 'approved_at' | 'author' | 'reviews'
  >);
  return { caseId: newCase.id };
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
    throw new Error(validationErrors.map((e) => e.message).join('. '));
  }

  const supabase = (await import('@/lib/supabase/server')).createServiceClient();
  const { error } = await supabase
    .from('cases')
    .update({ status: 'submitted' })
    .eq('id', caseId);

  if (error) throw error;

  await notifyReviewersAndAdminsOfSubmission(
    caseId,
    caseData.title,
    caseData.assigned_reviewer_id
  );
}

export async function deleteCaseAction(caseId: string): Promise<void> {
  await deleteCase(caseId);
}

async function assertReviewerCanActOnCase(caseId: string, user: User): Promise<Case> {
  if (user.role === 'admin') {
    const caseData = await getCaseById(caseId);
    if (!caseData) throw new Error('Case not found');
    return caseData;
  }

  if (user.role !== 'reviewer') {
    throw new Error('Only reviewers and admins can perform this action');
  }

  const caseData = await getCaseById(caseId);
  if (!caseData) throw new Error('Case not found');

  if (
    caseData.assigned_reviewer_id &&
    caseData.assigned_reviewer_id !== user.id
  ) {
    throw new Error('This case is assigned to another reviewer');
  }

  return caseData;
}

export async function approveCaseAction(caseId: string, comments?: string): Promise<void> {
  const user = await getOrCreateCurrentUser();
  const caseData = await assertReviewerCanActOnCase(caseId, user);
  await createReview(caseId, user.id, 'approved', comments || '');

  await createNotification(
    caseData.author_id,
    'case_approved',
    `Your case "${caseData.title}" was approved.`,
    caseId
  );
}

export async function requestChangesAction(caseId: string, comments: string): Promise<void> {
  const user = await getOrCreateCurrentUser();
  const caseData = await assertReviewerCanActOnCase(caseId, user);
  await createReview(caseId, user.id, 'changes_requested', comments);

  await createNotification(
    caseData.author_id,
    'changes_requested',
    `Changes requested on "${caseData.title}": ${comments}`,
    caseId
  );
}

export async function useTemplateAction(templateId: string): Promise<string> {
  const user = await getOrCreateCurrentUser();
  const template = caseTemplates.find((t) => t.id === templateId);

  if (!template) {
    throw new Error('Template not found');
  }

  const newCase = await createCase(user.id, {
    ...template.content,
    status: 'draft',
  } as Omit<
    Case,
    'id' | 'author_id' | 'created_at' | 'updated_at' | 'approved_at' | 'author' | 'reviews'
  >);

  return newCase.id;
}

export async function fetchAllUsers(): Promise<User[]> {
  const currentUserRecord = await getOrCreateCurrentUser();
  if (currentUserRecord.role !== 'admin') {
    throw new Error('Only admins can view the full user list');
  }
  return getAllUsers();
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

export async function fetchReviewersAction(): Promise<User[]> {
  const user = await getOrCreateCurrentUser();
  if (user.role !== 'admin') {
    throw new Error('Only admins can list reviewers');
  }
  return getReviewers();
}

export async function assignReviewerAction(
  caseId: string,
  reviewerId: string | null
): Promise<void> {
  const user = await getOrCreateCurrentUser();
  if (user.role !== 'admin') {
    throw new Error('Only admins can assign reviewers');
  }

  const caseData = await getCaseById(caseId);
  if (!caseData) throw new Error('Case not found');

  await assignReviewer(caseId, reviewerId);

  if (reviewerId) {
    const { data: reviewer } = await (await import('@/lib/supabase/server'))
      .createServiceClient()
      .from('users')
      .select('name')
      .eq('id', reviewerId)
      .single();

    await createNotification(
      reviewerId,
      'reviewer_assigned',
      `You have been assigned to review "${caseData.title}".`,
      caseId
    );
  }
}

export async function fetchCaseCommentsAction(caseId: string): Promise<CaseComment[]> {
  await getOrCreateCurrentUser();
  return getCaseComments(caseId);
}

export async function addCaseCommentAction(caseId: string, message: string): Promise<CaseComment | null> {
  const user = await getOrCreateCurrentUser();
  const caseData = await getCaseById(caseId);
  if (!caseData) throw new Error('Case not found');

  const trimmed = message.trim();
  if (!trimmed) throw new Error('Comment cannot be empty');

  const comment = await createCaseComment(caseId, user.id, trimmed);

  if (!comment) {
    return null;
  }

  const notifyUserId =
    user.id === caseData.author_id
      ? caseData.assigned_reviewer_id
      : caseData.author_id;

  if (notifyUserId && notifyUserId !== user.id) {
    await createNotification(
      notifyUserId,
      'new_comment',
      `New comment on "${caseData.title}" from ${user.name}.`,
      caseId
    );
  } else if (user.id === caseData.author_id) {
    const reviewers = await getReviewers();
    for (const reviewer of reviewers) {
      if (reviewer.id !== user.id) {
        await createNotification(
          reviewer.id,
          'new_comment',
          `New comment on "${caseData.title}" from ${user.name}.`,
          caseId
        );
      }
    }
  }

  return comment;
}

export async function fetchNotificationsAction(): Promise<Notification[]> {
  const user = await getOrCreateCurrentUser();
  return getUserNotifications(user.id);
}

export async function fetchUnreadNotificationCountAction(): Promise<number> {
  const user = await getOrCreateCurrentUser();
  return getUnreadNotificationCount(user.id);
}

export async function markNotificationReadAction(notificationId: string): Promise<void> {
  const user = await getOrCreateCurrentUser();
  await markNotificationRead(notificationId, user.id);
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const user = await getOrCreateCurrentUser();
  await markAllNotificationsRead(user.id);
}

export async function fetchAnalyticsAction(): Promise<AnalyticsSummary> {
  const user = await getOrCreateCurrentUser();
  if (user.role !== 'admin') {
    throw new Error('Only admins can view analytics');
  }
  return getAnalyticsSummary();
}

export async function fetchMyPortfolioAction(): Promise<Case[]> {
  const user = await getOrCreateCurrentUser();
  return getApprovedCasesByAuthor(user.id);
}

export async function setPortfolioPublicAction(isPublic: boolean): Promise<void> {
  const user = await getOrCreateCurrentUser();
  await setPortfolioPublic(user.id, isPublic);
}

export async function fetchPublicPortfolioAction(userId: string) {
  return getPublicPortfolio(userId);
}
