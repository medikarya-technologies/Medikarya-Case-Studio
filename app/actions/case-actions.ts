'use server';

import { cache } from 'react';
import { auth, currentUser } from '@clerk/nextjs/server';
import {
  getUserByClerkId,
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

export const getOrCreateCurrentUser = cache(async () => {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('User not authenticated');
  }

  const existingUser = await getUserByClerkId(userId);
  if (existingUser) {
    return existingUser;
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    throw new Error('User not authenticated');
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress || '';
  const name = clerkUser.fullName || clerkUser.username || 'Unknown User';

  const user = await getOrCreateUser(userId, name, email);
  return user;
});

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

export interface AuthorCaseSummary {
  authorId: string;
  name: string;
  email: string;
  totalCases: number;
  completedCases: number;
  incompleteCases: number;
  submittedCases: number;
  approvedCases: number;
  changesRequestedCases: number;
  cases: Case[];
}

export interface AuthorCaseSummaryOverview {
  authors: AuthorCaseSummary[];
  totalAuthors: number;
  totalCases: number;
  totalSubmitted: number;
  totalApproved: number;
  totalChangesRequested: number;
}

export async function fetchAuthorCaseSummary(): Promise<AuthorCaseSummaryOverview> {
  const user = await getOrCreateCurrentUser();
  if (user.role !== 'reviewer' && user.role !== 'admin') {
    throw new Error('Only reviewers can access author case tracking summaries');
  }

  const { getCaseCompleteness } = await import('@/lib/case-completeness');
  const supabase = (await import('@/lib/supabase/server')).createServiceClient();

  // Fetch all users with role = 'author'
  const { data: authorsData, error: authorsError } = await supabase
    .from('users')
    .select('id, name, email, role')
    .eq('role', 'author')
    .order('name', { ascending: true });

  if (authorsError) {
    console.error('Error fetching author users:', authorsError);
    throw authorsError;
  }

  // Fetch all cases with author and reviews join
  const { data: casesData, error: casesError } = await supabase
    .from('cases')
    .select('*, author:users!author_id(id, name, email), reviews:case_reviews(*)')
    .order('updated_at', { ascending: false });

  if (casesError) {
    console.error('Error fetching cases for author summary:', casesError);
    throw casesError;
  }

  const allCases = (casesData as Case[]) || [];
  const authorUsers = (authorsData as { id: string; name: string; email: string }[]) || [];

  // Group cases by author_id
  const casesByAuthorMap = new Map<string, Case[]>();
  for (const c of allCases) {
    if (!casesByAuthorMap.has(c.author_id)) {
      casesByAuthorMap.set(c.author_id, []);
    }
    casesByAuthorMap.get(c.author_id)!.push(c);
  }

  // Construct summaries per author (only authors who have created cases, or role = author)
  const summaries: AuthorCaseSummary[] = [];

  for (const author of authorUsers) {
    const authorCases = casesByAuthorMap.get(author.id) || [];
    
    // Only include authors with at least 1 case created
    if (authorCases.length === 0) continue;

    let completedCount = 0;
    let incompleteCount = 0;
    let submittedCount = 0;
    let approvedCount = 0;
    let changesRequestedCount = 0;

    for (const c of authorCases) {
      const completeness = getCaseCompleteness(c);
      if (completeness.incompleteItems.length === 0) {
        completedCount += 1;
      } else {
        incompleteCount += 1;
      }

      if (c.status === 'submitted') submittedCount += 1;
      else if (c.status === 'approved') approvedCount += 1;
      else if (c.status === 'changes_requested') changesRequestedCount += 1;
    }

    summaries.push({
      authorId: author.id,
      name: author.name,
      email: author.email,
      totalCases: authorCases.length,
      completedCases: completedCount,
      incompleteCases: incompleteCount,
      submittedCases: submittedCount,
      approvedCases: approvedCount,
      changesRequestedCases: changesRequestedCount,
      cases: authorCases,
    });
  }

  // Also check if there are cases belonging to authors not in authorUsers (edge case fallback)
  // (In case a user role changed or wasn't marked as author)
  for (const [authorId, authorCases] of casesByAuthorMap.entries()) {
    if (!authorUsers.some((u) => u.id === authorId) && authorCases.length > 0) {
      const firstCase = authorCases[0];
      const authorInfo = firstCase.author;
      
      // Verify user's role if possible
      const { data: userRoleData } = await supabase
        .from('users')
        .select('role')
        .eq('id', authorId)
        .single();

      if (userRoleData?.role === 'author') {
        let completedCount = 0;
        let incompleteCount = 0;
        let submittedCount = 0;
        let approvedCount = 0;
        let changesRequestedCount = 0;

        for (const c of authorCases) {
          const completeness = getCaseCompleteness(c);
          if (completeness.incompleteItems.length === 0) {
            completedCount += 1;
          } else {
            incompleteCount += 1;
          }

          if (c.status === 'submitted') submittedCount += 1;
          else if (c.status === 'approved') approvedCount += 1;
          else if (c.status === 'changes_requested') changesRequestedCount += 1;
        }

        summaries.push({
          authorId,
          name: authorInfo?.name || 'Unknown Author',
          email: authorInfo?.email || '',
          totalCases: authorCases.length,
          completedCases: completedCount,
          incompleteCases: incompleteCount,
          submittedCases: submittedCount,
          approvedCases: approvedCount,
          changesRequestedCases: changesRequestedCount,
          cases: authorCases,
        });
      }
    }
  }

  // Default sort: authors with most pending/submitted cases first, then totalCases desc
  summaries.sort((a, b) => {
    if (b.submittedCases !== a.submittedCases) {
      return b.submittedCases - a.submittedCases;
    }
    if (b.changesRequestedCases !== a.changesRequestedCases) {
      return b.changesRequestedCases - a.changesRequestedCases;
    }
    return b.totalCases - a.totalCases;
  });

  const totalAuthors = summaries.length;
  const totalCases = summaries.reduce((acc, s) => acc + s.totalCases, 0);
  const totalSubmitted = summaries.reduce((acc, s) => acc + s.submittedCases, 0);
  const totalApproved = summaries.reduce((acc, s) => acc + s.approvedCases, 0);
  const totalChangesRequested = summaries.reduce((acc, s) => acc + s.changesRequestedCases, 0);

  return {
    authors: summaries,
    totalAuthors,
    totalCases,
    totalSubmitted,
    totalApproved,
    totalChangesRequested,
  };
}

