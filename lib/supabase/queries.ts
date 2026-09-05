import { cache } from 'react';
import { createServerSupabaseClient, createServiceClient } from './server';
import type { Case, CaseReview, User, CaseComment, Notification, AnalyticsSummary, NotificationType, CaseAttachment, NameChangeRequest } from '@/lib/types';
import type { SupabaseClient } from '@supabase/supabase-js';

// Helper to log full Supabase error
function logSupabaseError(operation: string, error: unknown) {
  console.error(`[Supabase Error] ${operation}:`, JSON.stringify(error, null, 2));
}

// --- User Operations ---
export const getUserByClerkId = cache(async (clerkId: string): Promise<User | null> => {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_id', clerkId)
    .single();

  if (error) {
    logSupabaseError('getUserByClerkId', error);
  }

  return data as User | null;
});

export const getOrCreateUser = cache(async (
  clerkId: string,
  name: string,
  email: string,
  role: string = 'author'
): Promise<User> => {
  const existingUser = await getUserByClerkId(clerkId);
  if (existingUser) {
    return existingUser;
  }

  const supabase = createServiceClient();
  const { data: newUser, error } = await supabase
    .from('users')
    .insert([{ clerk_id: clerkId, name, email, role }])
    .select('*')
    .single();

  if (error) {
    logSupabaseError('getOrCreateUser (insert user)', error);
    throw error;
  }
  return newUser as User;
});

// Get all users in the system (for admin user management)
export async function getAllUsers(): Promise<User[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    logSupabaseError('getAllUsers', error);
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
    logSupabaseError('updateUserRole', error);
    throw error;
  }
}

// --- Case Operations ---
export async function getAuthorCases(
  userId: string,
  supabase?: SupabaseClient
): Promise<Case[]> {
  const client = supabase || createServiceClient();
  const { data, error } = await client
    .from('cases')
    .select('*, author:users!author_id(id, name, email), reviews:case_reviews(*)')
    .eq('author_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    logSupabaseError('getAuthorCases', error);
  }

  return (
    ((data as any[]) || []).map((c) => ({
      ...c,
      custom_specialty: c.custom_specialty || c.patient_details?.custom_specialty || null,
    })) as Case[]
  );
}

// PostgREST join select for cases with author and reviews
export async function getAllCases(
  supabase?: SupabaseClient
): Promise<Case[]> {
  const client = supabase || createServiceClient();
  const { data, error } = await client
    .from('cases')
    .select('*, author:users!author_id(id, name, email), reviews:case_reviews(*)')
    .order('updated_at', { ascending: false });

  if (error) {
    logSupabaseError('getAllCases', error);
  }

  return (
    ((data as any[]) || []).map((c) => ({
      ...c,
      custom_specialty: c.custom_specialty || c.patient_details?.custom_specialty || null,
    })) as Case[]
  );
}

export async function getCaseById(
  caseId: string,
  supabase?: SupabaseClient
): Promise<(Case & { reviews?: CaseReview[] }) | null> {
  const client = supabase || createServiceClient();
  const { data: caseData, error: caseError } = await client
    .from('cases')
    .select('*')
    .eq('id', caseId)
    .single();

  if (caseError) {
    logSupabaseError('getCaseById (fetch case)', caseError);
  }

  if (!caseData) return null;

  const [{ data: reviews, error: reviewsError }, { data: attachments, error: attachmentsError }] =
    await Promise.all([
      client
        .from('case_reviews')
        .select('*, users(name)')
        .eq('case_id', caseId)
        .order('created_at', { ascending: true }),
      client
        .from('case_attachments')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: true }),
    ]);

  if (reviewsError) {
    logSupabaseError('getCaseById (fetch reviews)', reviewsError);
  }

  if (attachmentsError) {
    logSupabaseError('getCaseById (fetch attachments)', attachmentsError);
  }

  const rawCustomFields =
    caseData.custom_fields || (caseData.diagnosis_management as any)?._custom_fields || [];

  return {
    ...caseData,
    custom_specialty: caseData.custom_specialty || (caseData.patient_details as any)?.custom_specialty || null,
    custom_fields: Array.isArray(rawCustomFields) ? rawCustomFields : [],
    reviews: reviews || [],
    attachments: (attachments as CaseAttachment[]) || [],
  } as any;
}

// --- Case Attachments ---
export async function getCaseAttachments(caseId: string): Promise<CaseAttachment[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('case_attachments')
    .select('*')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true });

  if (error) {
    logSupabaseError('getCaseAttachments', error);
    return [];
  }
  return (data as CaseAttachment[]) || [];
}

export async function getAttachmentById(attachmentId: string): Promise<CaseAttachment | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('case_attachments')
    .select('*')
    .eq('id', attachmentId)
    .single();

  if (error) {
    logSupabaseError('getAttachmentById', error);
    return null;
  }
  return data as CaseAttachment;
}

export async function createCaseAttachment(
  attachmentData: Omit<CaseAttachment, 'id' | 'created_at'>
): Promise<CaseAttachment> {
  const supabase = createServiceClient();
  let { data, error } = await supabase
    .from('case_attachments')
    .insert([attachmentData])
    .select('*')
    .single();

  if (error && (error.message?.includes('investigation_group') || error.details?.includes('investigation_group'))) {
    console.warn('investigation_group column missing on case_attachments table, falling back without column');
    const { investigation_group, ...rest } = attachmentData;
    const res = await supabase.from('case_attachments').insert([rest]).select('*').single();
    data = res.data;
    error = res.error;
  }

  if (error) {
    logSupabaseError('createCaseAttachment', error);
    throw error;
  }
  return {
    ...data,
    investigation_group: data?.investigation_group ?? attachmentData.investigation_group ?? null,
  } as CaseAttachment;
}

export async function deleteCaseAttachment(attachmentId: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from('case_attachments')
    .delete()
    .eq('id', attachmentId);

  if (error) {
    logSupabaseError('deleteCaseAttachment', error);
    throw error;
  }
}

export async function createCase(
  userId: string,
  caseData: Omit<Case, 'id' | 'author_id' | 'created_at' | 'updated_at' | 'approved_at' | 'author' | 'reviews'>
): Promise<Case> {
  const supabase = createServiceClient();

  const customSpecialty = caseData.custom_specialty;
  const enrichedPatientDetails = {
    ...(caseData.patient_details || {}),
    ...(customSpecialty ? { custom_specialty: customSpecialty } : {}),
  };

  console.log('createCase: inserting into cases:', { author_id: userId, ...caseData });

  let insertPayload: any = {
    author_id: userId,
    ...caseData,
    patient_details: enrichedPatientDetails,
  };

  let { data: newCase, error: caseError } = await supabase
    .from('cases')
    .insert([insertPayload])
    .select('*')
    .single();

  if (
    caseError &&
    (caseError.message?.includes('custom_fields') ||
      caseError.details?.includes('custom_fields') ||
      caseError.message?.includes('custom_specialty') ||
      caseError.details?.includes('custom_specialty'))
  ) {
    console.warn('Column missing on cases table, falling back to embedded fields in JSONB');
    const { custom_fields, custom_specialty, diagnosis_management, ...rest } = caseData as any;
    insertPayload = {
      author_id: userId,
      ...rest,
      patient_details: enrichedPatientDetails,
      diagnosis_management: {
        ...(diagnosis_management || {}),
        _custom_fields: custom_fields || [],
      },
    };
    const res = await supabase.from('cases').insert([insertPayload]).select('*').single();
    newCase = res.data;
    caseError = res.error;
  }

  if (caseError) {
    logSupabaseError('createCase', caseError);
    throw caseError;
  }

  return {
    ...newCase,
    custom_specialty:
      newCase.custom_specialty ||
      (newCase.patient_details as any)?.custom_specialty ||
      caseData.custom_specialty ||
      null,
    custom_fields:
      newCase.custom_fields ||
      (newCase.diagnosis_management as any)?._custom_fields ||
      caseData.custom_fields ||
      [],
  } as Case;
}

export async function updateCase(
  caseId: string,
  caseData: Partial<Omit<Case, 'id' | 'author_id' | 'created_at' | 'updated_at' | 'approved_at' | 'author' | 'reviews'>>
): Promise<void> {
  const supabase = createServiceClient();

  const customSpecialty = caseData.custom_specialty;
  const enrichedPatientDetails = caseData.patient_details !== undefined
    ? {
        ...(caseData.patient_details || {}),
        ...(customSpecialty ? { custom_specialty: customSpecialty } : {}),
      }
    : undefined;

  console.log('updateCase: updating case', caseId, 'with:', caseData);

  const updatePayload: any = {
    ...caseData,
    ...(enrichedPatientDetails !== undefined && { patient_details: enrichedPatientDetails }),
  };

  let { error } = await supabase
    .from('cases')
    .update(updatePayload)
    .eq('id', caseId);

  if (
    error &&
    (error.message?.includes('custom_fields') ||
      error.details?.includes('custom_fields') ||
      error.message?.includes('custom_specialty') ||
      error.details?.includes('custom_specialty'))
  ) {
    console.warn('Column missing on cases table, falling back to embedded fields in JSONB');
    const { custom_fields, custom_specialty, diagnosis_management, ...rest } = caseData as any;
    const fallbackPayload = {
      ...rest,
      ...(enrichedPatientDetails !== undefined && { patient_details: enrichedPatientDetails }),
      ...(diagnosis_management !== undefined && {
        diagnosis_management: {
          ...(diagnosis_management || {}),
          _custom_fields: custom_fields || [],
        },
      }),
    };
    const res = await supabase.from('cases').update(fallbackPayload).eq('id', caseId);
    error = res.error;
  }

  if (error) {
    logSupabaseError('updateCase', error);
    throw error;
  }
}

export async function submitCase(caseId: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from('cases')
    .update({ status: 'submitted' })
    .eq('id', caseId);

  if (error) {
    logSupabaseError('submitCase', error);
    throw error;
  }
}

export async function deleteCase(caseId: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from('cases').delete().eq('id', caseId);
  if (error) {
    logSupabaseError('deleteCase', error);
    throw error;
  }
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

  if (error) {
    logSupabaseError('createReview (insert review)', error);
    throw error;
  }

  const { error: caseError } = await supabase
    .from('cases')
    .update({
      status: decision,
      ...(decision === 'approved' && { approved_at: new Date().toISOString() }),
    })
    .eq('id', caseId);

  if (caseError) {
    logSupabaseError('createReview (update case)', caseError);
    throw caseError;
  }
}

export async function assignReviewer(caseId: string, reviewerId: string | null): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from('cases')
    .update({ assigned_reviewer_id: reviewerId })
    .eq('id', caseId);
  if (error) {
    logSupabaseError('assignReviewer', error);
    throw error;
  }
}

export async function getReviewers(): Promise<User[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'reviewer')
    .order('name');
  if (error) {
    logSupabaseError('getReviewers', error);
    throw error;
  }
  return (data as User[]) || [];
}

// --- Comments ---
export async function getCaseComments(caseId: string): Promise<CaseComment[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('case_comments')
    .select('*, users(id, name, role, email, clerk_id, created_at)')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true });
  if (error) {
    logSupabaseError('getCaseComments', error);
    return []; // Return safe default
  }
  return (data || []).map((row: Record<string, unknown>) => ({
    ...row,
    user: row.users,
  })) as CaseComment[];
}

export async function createCaseComment(
  caseId: string,
  userId: string,
  message: string
): Promise<CaseComment | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('case_comments')
    .insert([{ case_id: caseId, user_id: userId, message }])
    .select('*, users(id, name, role, email, clerk_id, created_at)')
    .single();
  if (error) {
    logSupabaseError('createCaseComment', error);
    return null; // Return safe default
  }
  return { ...data, user: data.users } as CaseComment;
}

export async function getCommentCountsByCaseIds(
  caseIds: string[]
): Promise<Record<string, number>> {
  if (caseIds.length === 0) return {};
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('case_comments')
    .select('case_id')
    .in('case_id', caseIds);
  if (error) {
    logSupabaseError('getCommentCountsByCaseIds', error);
    return {}; // Return safe default
  }
  const counts: Record<string, number> = {};
  for (const row of data || []) {
    counts[row.case_id] = (counts[row.case_id] || 0) + 1;
  }
  return counts;
}

// --- Notifications ---
export async function createNotification(
  userId: string,
  type: NotificationType,
  message: string,
  relatedCaseId?: string
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from('notifications').insert([
    {
      user_id: userId,
      type,
      message,
      related_case_id: relatedCaseId ?? null,
    },
  ]);
  if (error) {
    logSupabaseError('createNotification', error);
    // Don't throw, just log
  }
}

export async function getUserNotifications(userId: string, limit = 20): Promise<Notification[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    logSupabaseError('getUserNotifications', error);
    return []; // Return safe default
  }
  return (data as Notification[]) || [];
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const supabase = createServiceClient();
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) {
    logSupabaseError('getUnreadNotificationCount', error);
    return 0; // Return safe default
  }
  return count ?? 0;
}

export async function markNotificationRead(notificationId: string, userId: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', userId);
  if (error) {
    logSupabaseError('markNotificationRead', error);
    // Don't throw, just log
  }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) {
    logSupabaseError('markAllNotificationsRead', error);
    // Don't throw, just log
  }
}

export async function notifyReviewersAndAdminsOfSubmission(
  caseId: string,
  caseTitle: string,
  assignedReviewerId?: string | null
): Promise<void> {
  const supabase = createServiceClient();
  const message = `New case submitted for review: "${caseTitle}"`;

  if (assignedReviewerId) {
    await createNotification(assignedReviewerId, 'case_submitted', message, caseId);
    return;
  }

  const { data: recipients, error: recipientsError } = await supabase
    .from('users')
    .select('id')
    .in('role', ['reviewer', 'admin']);

  if (recipientsError) {
    logSupabaseError('notifyReviewersAndAdminsOfSubmission (fetch recipients)', recipientsError);
  }

  for (const user of recipients || []) {
    await createNotification(user.id, 'case_submitted', message, caseId);
  }
}

// --- Analytics ---
export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const supabase = createServiceClient();
  const { data: cases, error } = await supabase.from('cases').select('*');
  if (error) {
    logSupabaseError('getAnalyticsSummary (fetch cases)', error);
    throw error;
  }
  const allCases = (cases as Case[]) || [];

  const specialtyMap: Record<string, number> = {};
  const statusMap: Record<string, number> = {};
  const authorMap: Record<string, { name: string; count: number }> = {};
  const approvalDeltas: number[] = [];

  for (const c of allCases) {
    specialtyMap[c.specialty] = (specialtyMap[c.specialty] || 0) + 1;
    statusMap[c.status] = (statusMap[c.status] || 0) + 1;
    if (c.status === 'approved' && c.approved_at) {
      const approvedAt = new Date(c.approved_at).getTime();
      const createdAt = new Date(c.created_at).getTime();
      approvalDeltas.push((approvedAt - createdAt) / (1000 * 60 * 60 * 24));
    }
  }

  const authorIds = [...new Set(allCases.map((c) => c.author_id))];
  if (authorIds.length > 0) {
    const { data: authors, error: authorsError } = await supabase.from('users').select('id, name').in('id', authorIds);
    if (authorsError) {
      logSupabaseError('getAnalyticsSummary (fetch authors)', authorsError);
    }
    for (const c of allCases) {
      const author = authors?.find((a) => a.id === c.author_id);
      if (!authorMap[c.author_id]) {
        authorMap[c.author_id] = { name: author?.name || 'Unknown', count: 0 };
      }
      authorMap[c.author_id].count += 1;
    }
  }

  return {
    bySpecialty: Object.entries(specialtyMap).map(([specialty, count]) => ({ specialty, count })),
    byStatus: Object.entries(statusMap).map(([status, count]) => ({ status, count })),
    avgDaysToApproval:
      approvalDeltas.length > 0
        ? Math.round((approvalDeltas.reduce((a, b) => a + b, 0) / approvalDeltas.length) * 10) / 10
        : null,
    topAuthors: Object.entries(authorMap)
      .map(([author_id, { name, count }]) => ({ author_id, name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
  };
}

export async function getApprovedCasesByAuthor(authorId: string): Promise<Case[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('cases')
    .select('*')
    .eq('author_id', authorId)
    .eq('status', 'approved')
    .order('approved_at', { ascending: false });
  if (error) {
    logSupabaseError('getApprovedCasesByAuthor', error);
    throw error;
  }
  return (data as Case[]) || [];
}

export async function setPortfolioPublic(userId: string, isPublic: boolean): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from('users')
    .update({ portfolio_public: isPublic })
    .eq('id', userId);
  if (error) {
    logSupabaseError('setPortfolioPublic', error);
    throw error;
  }
}

export async function getPublicPortfolio(userId: string): Promise<{ user: User; cases: Case[] } | null> {
  const supabase = createServiceClient();
  const { data: user, error: userError } = await supabase.from('users').select('*').eq('id', userId).single();
  if (userError) {
    logSupabaseError('getPublicPortfolio (fetch user)', userError);
  }
  if (!user || !user.portfolio_public) return null;
  const cases = await getApprovedCasesByAuthor(userId);
  return { user: user as User, cases };
}

export async function updateCaseAddedToPlatform(
  caseId: string,
  addedToPlatform: boolean
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from('cases')
    .update({ added_to_platform: addedToPlatform })
    .eq('id', caseId);

  if (error) {
    logSupabaseError('updateCaseAddedToPlatform', error);
    throw error;
  }
}

export async function updateUserName(
  userId: string,
  name: string,
  setEditedOnce: boolean = false
): Promise<void> {
  const supabase = createServiceClient();
  const updateData: Record<string, any> = { name };
  if (setEditedOnce) {
    updateData.name_edited_once = true;
  }
  const { error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId);

  if (error) {
    logSupabaseError('updateUserName', error);
    throw error;
  }
}

export async function createNameChangeRequest(
  userId: string,
  requestedName: string
): Promise<NameChangeRequest> {
  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from('name_change_requests')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .maybeSingle();

  if (existing) {
    throw new Error('You already have a pending name change request.');
  }

  const { data, error } = await supabase
    .from('name_change_requests')
    .insert([{ user_id: userId, requested_name: requestedName, status: 'pending' }])
    .select('*')
    .single();

  if (error) {
    logSupabaseError('createNameChangeRequest', error);
    throw error;
  }

  return data as NameChangeRequest;
}

export async function getPendingNameChangeRequests(): Promise<NameChangeRequest[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('name_change_requests')
    .select('*, user:users!user_id(*)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    logSupabaseError('getPendingNameChangeRequests', error);
    throw error;
  }

  return (data as NameChangeRequest[]) || [];
}

export async function getUserLatestNameChangeRequest(userId: string): Promise<NameChangeRequest | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('name_change_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logSupabaseError('getUserLatestNameChangeRequest', error);
    return null;
  }

  return data as NameChangeRequest | null;
}

export async function resolveNameChangeRequest(
  requestId: string,
  status: 'approved' | 'rejected',
  adminUserId: string
): Promise<void> {
  const supabase = createServiceClient();

  const { data: request, error: reqError } = await supabase
    .from('name_change_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (reqError || !request) {
    throw new Error('Name change request not found');
  }

  if (request.status !== 'pending') {
    throw new Error('This name change request has already been resolved.');
  }

  if (status === 'approved') {
    await updateUserName(request.user_id, request.requested_name, true);
  }

  const { error: updateError } = await supabase
    .from('name_change_requests')
    .update({
      status,
      resolved_at: new Date().toISOString(),
      resolved_by: adminUserId,
    })
    .eq('id', requestId);

  if (updateError) {
    logSupabaseError('resolveNameChangeRequest', updateError);
    throw updateError;
  }
}