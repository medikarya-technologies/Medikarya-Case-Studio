'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import Link from 'next/link';
import { Eye, CheckCircle, XCircle, Loader2, FileText, ArrowUpDown, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/case/StatusBadge';
import { CaseListFilters, filterCases } from '@/components/case/CaseListFilters';
import { Case } from '@/lib/types';
import { fetchAllCases, approveCaseAction, requestChangesAction } from '@/app/actions/case-actions';
import { useAuth } from '@clerk/nextjs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getCaseCompleteness } from '@/lib/case-completeness';
import { ApproveConfirmModal, RequestChangesModal } from '@/components/case/ReviewerActionDialogs';

type SortOption = 'oldest_first' | 'newest_first' | 'title_asc' | 'completeness_desc';

interface ReviewerCaseCardProps {
  caseItem: Case;
  isProcessing: boolean;
  onApproveClick: (caseItem: Case) => void;
  onRequestChangesClick: (caseItem: Case) => void;
}

const ReviewerCaseCard = memo(function ReviewerCaseCard({
  caseItem,
  isProcessing,
  onApproveClick,
  onRequestChangesClick,
}: ReviewerCaseCardProps) {
  const completeness = useMemo(() => getCaseCompleteness(caseItem), [caseItem]);
  const resubmitCount = useMemo(
    () => caseItem.reviews?.filter((r) => r.decision === 'changes_requested').length || 0,
    [caseItem.reviews]
  );
  const isSubmitted = caseItem.status === 'submitted';

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg font-semibold line-clamp-2 leading-snug">{caseItem.title}</CardTitle>
          <StatusBadge status={caseItem.status} />
        </div>
        <div className="flex flex-wrap gap-1.5 pt-2">
          <Badge variant="secondary" className="text-xs bg-secondary/15 text-secondary border-secondary/30 dark:bg-secondary/30 dark:text-secondary-foreground font-medium">
            {completeness.score}% Complete
          </Badge>
          {resubmitCount > 0 && (
            <Badge variant="outline" className="text-xs bg-amber-100 text-amber-950 border-amber-400 dark:bg-amber-950/80 dark:text-amber-100 dark:border-amber-700 font-medium">
              Resubmitted {resubmitCount}x
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1 text-xs text-muted-foreground">
          <p className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Submitted: {new Date(caseItem.created_at).toLocaleDateString()}
          </p>
          {caseItem.author?.name && (
            <p>Author: <span className="font-semibold text-foreground">{caseItem.author.name}</span></p>
          )}
        </div>

        <div className="flex gap-2 flex-wrap pt-2 border-t">
          <Link href={`/cases/${caseItem.id}`}>
            <Button variant="secondary" size="sm">
              <Eye className="h-4 w-4 mr-1" />
              View & Review
            </Button>
          </Link>
          {isSubmitted && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="text-emerald-700 border-emerald-500 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-600 dark:hover:bg-emerald-950/40"
                onClick={() => onApproveClick(caseItem)}
                disabled={isProcessing}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-amber-800 border-amber-500 hover:bg-amber-50 dark:text-amber-300 dark:border-amber-600 dark:hover:bg-amber-950/40"
                onClick={() => onRequestChangesClick(caseItem)}
                disabled={isProcessing}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Request Changes
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

export default function ReviewerDashboard() {
  const { isLoaded, isSignedIn } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [processingCaseId, setProcessingCaseId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [specialty, setSpecialty] = useState('all');
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('oldest_first');

  const [activeModal, setActiveModal] = useState<{
    type: 'approve' | 'request_changes';
    caseItem: Case;
  } | null>(null);

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

  const sortedAndFilteredCases = useMemo(() => {
    let list = filterCases(cases, search, specialty, status);

    return list.sort((a, b) => {
      if (sortBy === 'oldest_first') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === 'newest_first') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'title_asc') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'completeness_desc') {
        return getCaseCompleteness(b).score - getCaseCompleteness(a).score;
      }
      return 0;
    });
  }, [cases, search, specialty, status, sortBy]);

  const hasActiveFilters = search.trim() !== '' || specialty !== 'all' || status !== 'all';

  const clearFilters = useCallback(() => {
    setSearch('');
    setSpecialty('all');
    setStatus('all');
    setSortBy('oldest_first');
  }, []);

  const handleApproveClick = useCallback((caseItem: Case) => {
    setActiveModal({ type: 'approve', caseItem });
  }, []);

  const handleRequestChangesClick = useCallback((caseItem: Case) => {
    setActiveModal({ type: 'request_changes', caseItem });
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) return;
    fetchCases();
  }, [isLoaded, isSignedIn, fetchCases]);

  const handleApproveConfirm = async () => {
    if (!activeModal) return;
    const caseId = activeModal.caseItem.id;
    setProcessingCaseId(caseId);
    try {
      await approveCaseAction(caseId);
      toast.success('Case approved successfully');
      setActiveModal(null);
      await fetchCases();
    } catch (e) {
      console.error('Error approving case:', e);
      toast.error('Failed to approve case');
    } finally {
      setProcessingCaseId(null);
    }
  };

  const handleRequestChangesConfirm = async (commentsJsonString: string) => {
    if (!activeModal) return;
    const caseId = activeModal.caseItem.id;
    setProcessingCaseId(caseId);
    try {
      await requestChangesAction(caseId, commentsJsonString);
      toast.success('Changes requested successfully');
      setActiveModal(null);
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
        <div className="space-y-4">
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

          {/* Reviewer Priority & Sort Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-xl bg-card border shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <ArrowUpDown className="w-4 h-4 text-primary" />
              <span>Prioritize Queue:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-2xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring font-medium"
              >
                <option value="oldest_first">Oldest Waiting First (Priority)</option>
                <option value="newest_first">Newest First</option>
                <option value="completeness_desc">Most Complete First</option>
                <option value="title_asc">Title A-Z</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {fetchError && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{fetchError}</span>
          <Button variant="outline" size="sm" onClick={() => fetchCases()}>
            Retry
          </Button>
        </div>
      )}

      {sortedAndFilteredCases.length === 0 && hasActiveFilters ? (
        <Card className="text-center py-12 shadow-sm">
          <CardContent>
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
            <p className="text-lg text-muted-foreground mb-4">No cases match your filters</p>
            <Button variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          </CardContent>
        </Card>
      ) : sortedAndFilteredCases.length === 0 ? (
        <Card className="text-center py-12 shadow-sm">
          <CardContent>
            <Eye className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
            <p className="text-lg text-muted-foreground">No cases to review at the moment</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedAndFilteredCases.map((caseItem) => (
            <ReviewerCaseCard
              key={caseItem.id}
              caseItem={caseItem}
              isProcessing={processingCaseId === caseItem.id}
              onApproveClick={handleApproveClick}
              onRequestChangesClick={handleRequestChangesClick}
            />
          ))}
        </div>
      )}

      {/* In-App Action Modals */}
      {activeModal?.type === 'approve' && (
        <ApproveConfirmModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          onConfirm={handleApproveConfirm}
          caseTitle={activeModal.caseItem.title}
          isSubmitting={processingCaseId === activeModal.caseItem.id}
        />
      )}

      {activeModal?.type === 'request_changes' && (
        <RequestChangesModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          onConfirm={handleRequestChangesConfirm}
          caseTitle={activeModal.caseItem.title}
          isSubmitting={processingCaseId === activeModal.caseItem.id}
        />
      )}
    </div>
  );
}