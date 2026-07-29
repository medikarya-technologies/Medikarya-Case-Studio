'use client';

import { use, useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { fetchCaseById } from '@/app/actions/case-actions';
import { fetchCaseAttachmentsAction } from '@/app/actions/attachment-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { CaseFormWizard } from '@/components/case/form/CaseFormWizard';
import type { CaseFormData } from '@/lib/case-schema';
import type { CaseAttachment } from '@/lib/types';

export default function EditCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isLoaded } = useUser();
  const [caseData, setCaseData] = useState<CaseFormData | null>(null);
  const [attachments, setAttachments] = useState<CaseAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCase = async () => {
      try {
        const [cData, atts] = await Promise.all([
          fetchCaseById(id),
          fetchCaseAttachmentsAction(id),
        ]);
        if (cData) {
          setCaseData(cData as unknown as CaseFormData);
        }
        if (atts) {
          setAttachments(atts);
        }
      } catch (e) {
        console.error('Error fetching case for edit:', e);
      } finally {
        setIsLoading(false);
      }
    };

    if (isLoaded) {
      loadCase();
    }
  }, [id, isLoaded]);

  if (!isLoaded || isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-6 w-40" />
        <div className="flex justify-between">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-10 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!caseData) {
    return <div className="max-w-4xl mx-auto p-4 text-center">Case not found</div>;
  }

  return (
    <CaseFormWizard
      mode="edit"
      initialCaseId={id}
      initialData={caseData}
      initialAttachments={attachments}
      backHref="/dashboard/author/cases"
    />
  );
}
