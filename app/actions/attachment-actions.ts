'use server';

import { getOrCreateCurrentUser } from '@/app/actions/case-actions';
import {
  getCaseById,
  getCaseAttachments,
  getAttachmentById,
  createCaseAttachment,
  deleteCaseAttachment as removeAttachmentFromDb,
} from '@/lib/supabase/queries';
import { createServiceClient } from '@/lib/supabase/server';
import type { CaseAttachment } from '@/lib/types';

const BUCKET_NAME = 'case-attachments';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];

// Ensures the Supabase Storage bucket exists and is configured
async function ensureBucketExists() {
  const supabase = createServiceClient();
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error('[Supabase Storage] Error listing buckets:', listError);
  }

  const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME);

  if (!bucketExists) {
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: MAX_FILE_SIZE,
      allowedMimeTypes: ALLOWED_MIME_TYPES,
    });

    if (createError) {
      console.error('[Supabase Storage] Error creating bucket:', createError);
    } else {
      console.log(`[Supabase Storage] Created bucket: ${BUCKET_NAME}`);
    }
  }
}

// Upload Attachment Action
export async function uploadAttachmentAction(formData: FormData): Promise<CaseAttachment> {
  const user = await getOrCreateCurrentUser();

  const caseId = formData.get('caseId') as string;
  const investigationId = (formData.get('investigationId') as string) || null;
  const investigationGroup = (formData.get('investigationGroup') as string) || null;
  const file = formData.get('file') as File | null;

  if (!caseId) {
    throw new Error('Case ID is required');
  }

  if (!file) {
    throw new Error('No file provided');
  }

  // 1. Check Case Existence & Authorizations
  const caseData = await getCaseById(caseId);
  if (!caseData) {
    throw new Error('Case not found');
  }

  const isAuthor = caseData.author_id === user.id;
  const isAdmin = user.role === 'admin';
  const canEdit = (caseData.status === 'draft' || caseData.status === 'changes_requested');

  if (!isAdmin && (!isAuthor || !canEdit)) {
    throw new Error('You are not authorized to upload attachments for this case');
  }

  // 2. Validate File Size & Extension
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File "${file.name}" exceeds the maximum allowed size of 10MB.`);
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(
      `File type ".${ext}" is not supported. Only images (JPG, PNG, WEBP) and PDF files are allowed.`
    );
  }

  const fileType: 'image' | 'pdf' = ext === 'pdf' || file.type === 'application/pdf' ? 'pdf' : 'image';

  // 3. Ensure Bucket Exists & Prepare Storage Path
  await ensureBucketExists();

  const supabase = createServiceClient();
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const storagePath = `cases/${caseId}/${timestamp}_${randomStr}_${sanitizedFileName}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 4. Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, buffer, {
      contentType: file.type || (fileType === 'pdf' ? 'application/pdf' : 'image/jpeg'),
      upsert: true,
    });

  if (uploadError) {
    console.error('[Supabase Storage] Upload error:', uploadError);
    throw new Error(`Failed to upload file: ${uploadError.message}`);
  }

  // 5. Get Public URL
  const { data: publicUrlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  const publicUrl = publicUrlData.publicUrl;

  // 6. Save Attachment Metadata in DB
  const attachment = await createCaseAttachment({
    case_id: caseId,
    investigation_id: investigationId,
    investigation_group: (investigationGroup as 'confirmation' | 'staging') || null,
    file_name: file.name,
    file_type: fileType,
    file_size: file.size,
    storage_path: storagePath,
    public_url: publicUrl,
    uploaded_by: user.id,
  });

  return attachment;
}

// Delete Attachment Action
export async function deleteAttachmentAction(attachmentId: string): Promise<void> {
  const user = await getOrCreateCurrentUser();

  const attachment = await getAttachmentById(attachmentId);
  if (!attachment) {
    throw new Error('Attachment not found');
  }

  const caseData = await getCaseById(attachment.case_id);
  if (!caseData) {
    throw new Error('Case not found');
  }

  const isAuthor = caseData.author_id === user.id;
  const isAdmin = user.role === 'admin';
  const canEdit = (caseData.status === 'draft' || caseData.status === 'changes_requested');

  if (!isAdmin && (!isAuthor || !canEdit)) {
    throw new Error('You are not authorized to delete attachments for this case');
  }

  // 1. Remove from Storage
  const supabase = createServiceClient();
  const { error: storageError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([attachment.storage_path]);

  if (storageError) {
    console.error('[Supabase Storage] Delete error:', storageError);
  }

  // 2. Remove from DB
  await removeAttachmentFromDb(attachmentId);
}

// Fetch Case Attachments Action
export async function fetchCaseAttachmentsAction(caseId: string): Promise<CaseAttachment[]> {
  const user = await getOrCreateCurrentUser();

  const caseData = await getCaseById(caseId);
  if (!caseData) {
    throw new Error('Case not found');
  }

  const isAuthor = caseData.author_id === user.id;
  const isReviewerOrAdmin = user.role === 'reviewer' || user.role === 'admin';

  if (!isAuthor && !isReviewerOrAdmin) {
    throw new Error('You are not authorized to view attachments for this case');
  }

  return getCaseAttachments(caseId);
}

export type ResolvedImageMap = Record<
  string,
  { success: boolean; dataUri?: string; error?: string }
>;

export async function resolvePdfImagesAction(
  urls: string[]
): Promise<ResolvedImageMap> {
  const result: ResolvedImageMap = {};

  const uniqueUrls = [...new Set(urls.filter((u) => u && typeof u === 'string' && u.trim().length > 0))];

  await Promise.all(
    uniqueUrls.map(async (url) => {
      const trimmedUrl = url.trim();

      if (trimmedUrl.startsWith('data:image/')) {
        result[trimmedUrl] = { success: true, dataUri: trimmedUrl };
        return;
      }

      try {
        const response = await fetch(trimmedUrl, {
          headers: {
            'User-Agent': 'MediKaryaPDFGenerator/1.0',
          },
          signal: AbortSignal.timeout(6000),
        });

        if (!response.ok) {
          result[trimmedUrl] = {
            success: false,
            error: `HTTP ${response.status}`,
          };
          return;
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const dataUri = `data:${contentType.split(';')[0]};base64,${base64}`;

        result[trimmedUrl] = { success: true, dataUri };
      } catch (err) {
        console.warn(`[PDF Image Fetch Failed] ${trimmedUrl}:`, err);
        result[trimmedUrl] = {
          success: false,
          error: err instanceof Error ? err.message : 'Fetch failed',
        };
      }
    })
  );

  return result;
}
