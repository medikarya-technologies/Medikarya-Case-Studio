'use client';

import { useUser } from '@clerk/nextjs';
import { Skeleton } from '@/components/ui/skeleton';
import { CaseFormWizard } from '@/components/case/form/CaseFormWizard';

export default function NewCasePage() {
  const { isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-6 w-40" />
        <div className="flex justify-between">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-10 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
        <div className="flex justify-between">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>
    );
  }

  return <CaseFormWizard mode="create" backHref="/dashboard/author" />;
}
