'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import Link from 'next/link';
import { Eye, Edit, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/case/StatusBadge';
import { CaseListFilters, filterCases } from '@/components/case/CaseListFilters';
import { Case, CaseStatus } from '@/lib/types';
import { fetchAllCases, toggleCaseAddedToPlatformAction } from '@/app/actions/case-actions';
import { useAuth } from '@clerk/nextjs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

interface AdminCaseRowProps {
  caseItem: Case;
  onToggleAdded: (caseId: string, currentAdded: boolean) => Promise<void>;
}

const AdminCaseRow = memo(function AdminCaseRow({ caseItem, onToggleAdded }: AdminCaseRowProps) {
  const canEdit = caseItem.status === 'draft' || caseItem.status === 'changes_requested';
  const isAdded = !!caseItem.added_to_platform;
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await onToggleAdded(caseItem.id, isAdded);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="border border-border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 hover:shadow-sm transition-all">
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold truncate text-foreground">{caseItem.title}</h3>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap text-sm">
          <StatusBadge status={caseItem.status as CaseStatus} />
          
          {/* Platform Added Badge */}
          {isAdded ? (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700 font-medium">
              Added
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 font-medium">
              Not Added
            </Badge>
          )}

          <span className="text-xs text-muted-foreground">
            Created {new Date(caseItem.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
        {/* Toggle Switch */}
        <div className="flex items-center gap-2 bg-muted/40 border border-border/60 px-3 py-1.5 rounded-lg">
          <span className="text-xs font-medium text-muted-foreground">Platform:</span>
          <button
            type="button"
            role="switch"
            aria-checked={isAdded}
            onClick={handleToggle}
            disabled={isUpdating}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50",
              isAdded ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"
            )}
            title={isAdded ? "Mark as Not Added" : "Mark as Added to Platform"}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out",
                isAdded ? "translate-x-4" : "translate-x-0"
              )}
            />
          </button>
          <span className={cn("text-xs font-semibold min-w-[58px]", isAdded ? "text-emerald-700 dark:text-emerald-400" : "text-slate-600 dark:text-slate-400")}>
            {isAdded ? "Added" : "Not Added"}
          </span>
        </div>

        <div className="flex gap-2">
          <Link href={`/cases/${caseItem.id}`}>
            <Button variant="secondary" size="sm" className="min-h-[36px]">
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
          </Link>
          {canEdit && (
            <Link href={`/cases/${caseItem.id}/edit`}>
              <Button variant="outline" size="sm" className="min-h-[36px]">
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
});

export default function AdminCasesPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [specialty, setSpecialty] = useState('all');
  const [status, setStatus] = useState('all');
  const [addedFilter, setAddedFilter] = useState('all');

  const fetchCases = useCallback(async (retryCount = 0) => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const allCases = await fetchAllCases();
      setCases(allCases);
    } catch (e) {
      console.error('Error fetching cases:', e);
      if (retryCount < 2) {
        setTimeout(() => fetchCases(retryCount + 1), 700);
        return;
      }
      setFetchError('Could not load cases. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetchCases();
  }, [isLoaded, isSignedIn, fetchCases]);

  const handleToggleAdded = useCallback(async (caseId: string, currentAdded: boolean) => {
    const nextValue = !currentAdded;
    // Optimistic update
    setCases((prev) =>
      prev.map((c) => (c.id === caseId ? { ...c, added_to_platform: nextValue } : c))
    );

    try {
      await toggleCaseAddedToPlatformAction(caseId, nextValue);
      toast.success(
        nextValue ? 'Case marked as Added to Platform' : 'Case marked as Not Added'
      );
    } catch (error) {
      // Revert on error
      setCases((prev) =>
        prev.map((c) => (c.id === caseId ? { ...c, added_to_platform: currentAdded } : c))
      );
      toast.error('Failed to update platform status');
    }
  }, []);

  const filteredCases = useMemo(
    () => filterCases(cases, search, specialty, status, addedFilter),
    [cases, search, specialty, status, addedFilter]
  );

  const hasActiveFilters =
    search.trim() !== '' || specialty !== 'all' || status !== 'all' || addedFilter !== 'all';

  const clearFilters = useCallback(() => {
    setSearch('');
    setSpecialty('all');
    setStatus('all');
    setAddedFilter('all');
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-9 w-40 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-10 w-full max-w-md" />
        <Card>
          <CardContent className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1>All Cases</h1>
        <p className="text-muted-foreground mt-2">
          View and manage every case across the platform and track real case additions
        </p>
      </div>

      {cases.length > 0 && (
        <CaseListFilters
          search={search}
          onSearchChange={setSearch}
          specialty={specialty}
          onSpecialtyChange={setSpecialty}
          status={status}
          onStatusChange={setStatus}
          addedFilter={addedFilter}
          onAddedFilterChange={setAddedFilter}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />
      )}

      {fetchError && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{fetchError}</span>
          <Button variant="outline" size="sm" onClick={() => fetchCases()}>
            Retry
          </Button>
        </div>
      )}

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Cases ({filteredCases.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCases.length === 0 && hasActiveFilters ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="mb-4">No cases match your filters</p>
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No cases found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCases.map((caseItem) => (
                <AdminCaseRow
                  key={caseItem.id}
                  caseItem={caseItem}
                  onToggleAdded={handleToggleAdded}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
