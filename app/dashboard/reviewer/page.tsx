'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Eye, CheckCircle, XCircle, Loader2, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/case/StatusBadge';
import { CaseListFilters, filterCases } from '@/components/case/CaseListFilters';
import { Case } from '@/lib/types';
import { fetchAllCases, approveCaseAction, requestChangesAction } from '@/app/actions/case-actions';
import { useAuth } from '@clerk/nextjs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toaster';

export default function ReviewerDashboard() {
  const { isLoaded, isSignedIn } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [processingCaseId, setProcessingCaseId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [specialty, setSpecialty] = useState('all');
  const [status, setStatus] = useState('all');

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

  const filteredCases = useMemo(
    () => filterCases(cases, search, specialty, status),
    [cases, search, specialty, status]
  );

  const hasActiveFilters = search.trim() !== '' || specialty !== 'all' || status !== 'all';

  const clearFilters = () => {
    setSearch('');
    setSpecialty('all');
    setStatus('all');
  };

  useEffect(() => {
    // Wait until Clerk has fully loaded the auth state on the client
    // before calling the server action, to avoid a race condition where
    // the session cookie isn't ready yet right after sign-in.
    if (!isLoaded) return;
    if (!isSignedIn) return;
    fetchCases();
  }, [isLoaded, isSignedIn, fetchCases]);

  const handleApprove = async (caseId: string) => {
    if (!confirm('Are you sure you want to approve this case?')) return;
    setProcessingCaseId(caseId);
    try {
      await approveCaseAction(caseId);
      toast.success('Case approved successfully');
      await fetchCases();
    } catch (e) {
      console.error('Error approving case:', e);
      toast.error('Failed to approve case');
    } finally {
      setProcessingCaseId(null);
    }
  };

  const handleRequestChanges = async (caseId: string) => {
    const comment = prompt('Enter your comment for the author (required):');
    if (!comment) return;
    setProcessingCaseId(caseId);
    try {
      await requestChangesAction(caseId, comment);
      toast.success('Changes requested successfully');
      await fetchCases();
    } catch (e) {
      console.error('Error requesting changes:', e);
      toast.error('Failed to request changes');
    } finally {
      setProcessingCaseId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="shadow-sm">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-40" />
                <div className="flex gap-2 flex-wrap">
                  <Skeleton className="h-9 w-20 rounded-md" />
                  <Skeleton className="h-9 w-24 rounded-md" />
                  <Skeleton className="h-9 w-36 rounded-md" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1>Cases to Review</h1>
        <p className="text-muted-foreground mt-2">Review and provide feedback on submitted cases</p>
      </div>

      {cases.length > 0 && (
        <CaseListFilters
          search={search}
          onSearchChange={setSearch}
          specialty={specialty}
          onSpecialtyChange={setSpecialty}
          status={status}
          onStatusChange={setStatus}
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

      {filteredCases.length === 0 && hasActiveFilters ? (
        <Card className="text-center py-12 shadow-sm">
          <CardContent>
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
            <p className="text-lg text-muted-foreground mb-4">No cases match your filters</p>
            <Button variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          </CardContent>
        </Card>
      ) : filteredCases.length === 0 ? (
        <Card className="text-center py-12 shadow-sm">
          <CardContent>
            <Eye className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
            <p className="text-lg text-muted-foreground">No cases to review at the moment</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCases.map((caseItem) => (
            <Card key={caseItem.id} className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg font-semibold line-clamp-1">{caseItem.title}</CardTitle>
                  <StatusBadge status={caseItem.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-500">
                  Submitted: {new Date(caseItem.created_at).toLocaleDateString()}
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Link href={`/cases/${caseItem.id}`}>
                    <Button variant="secondary" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </Link>
                  {caseItem.status === 'submitted' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[#16A34A] border-[#16A34A] hover:bg-green-50"
                        onClick={() => handleApprove(caseItem.id)}
                        disabled={processingCaseId === caseItem.id}
                      >
                        {processingCaseId === caseItem.id ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-1" />
                        )}
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[#D97706] border-[#D97706] hover:bg-amber-50"
                        onClick={() => handleRequestChanges(caseItem.id)}
                        disabled={processingCaseId === caseItem.id}
                      >
                        {processingCaseId === caseItem.id ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-1" />
                        )}
                        Request Changes
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}