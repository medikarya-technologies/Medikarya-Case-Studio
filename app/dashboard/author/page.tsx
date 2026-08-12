'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  FileText,
  CheckCircle,
  Eye,
  Clock,
  BookOpen,
  Book
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/case/StatusBadge';
import { Case } from '@/lib/types';
import { fetchAuthorCases, deleteCaseAction, submitCaseAction } from '@/app/actions/case-actions';
import { useUser, useAuth } from '@clerk/nextjs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toaster';

const tips = [
  "Always include a detailed history of present illness with timeline.",
  "Use specific numbers for vitals and lab results instead of vague terms.",
  "Include at least 2-3 differential diagnoses to show critical thinking.",
  "Don't forget to document patient demographics and social history.",
  "Always proofread your case for clarity and completeness before submitting.",
  "Include a brief summary of the case at the beginning for quick reference.",
  "Make sure your learning points are actionable and evidence-based."
];

function getDayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const day = Math.floor(diff / oneDay);
  return day;
}

interface RecentCaseCardProps {
  caseItem: Case;
  isSubmitting: boolean;
  isDeleting: boolean;
  onSubmit: (id: string) => void;
  onDelete: (id: string) => void;
}

const RecentCaseCard = memo(function RecentCaseCard({
  caseItem,
  isSubmitting,
  isDeleting,
  onSubmit,
  onDelete,
}: RecentCaseCardProps) {
  const canEdit = caseItem.status === 'draft' || caseItem.status === 'changes_requested';
  const isDraft = caseItem.status === 'draft';

  return (
    <div className="border border-border rounded-lg p-4 flex items-center justify-between hover:bg-muted/30 hover:shadow-sm transition-all">
      <Link href={`/cases/${caseItem.id}`} className="flex-1">
        <div>
          <p className="font-semibold text-foreground">{caseItem.title}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-sm text-muted-foreground">
              {caseItem.specialty?.replace(/_/g, ' ') || 'Unknown Specialty'}
            </span>
            <span className="text-xs text-muted-foreground/60">•</span>
            <span className="text-sm text-muted-foreground">
              {new Date(caseItem.updated_at).toLocaleDateString()}
            </span>
            <div className="flex gap-2 ml-2">
              <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full capitalize">
                {caseItem.difficulty}
              </span>
              <StatusBadge status={caseItem.status} />
            </div>
          </div>
        </div>
      </Link>
      <div className="flex gap-2 ml-4">
        {canEdit && (
          <>
            <Link href={`/cases/${caseItem.id}/edit`}>
              <Button variant="outline" size="sm">Edit</Button>
            </Link>
            <Button
              variant="default"
              size="sm"
              onClick={() => onSubmit(caseItem.id)}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
            {isDraft && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => onDelete(caseItem.id)}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            )}
          </>
        )}
        <Link href={`/cases/${caseItem.id}`}>
          <Button variant="secondary" size="sm">View</Button>
        </Link>
      </div>
    </div>
  );
});

export default function AuthorDashboard() {
  const router = useRouter();
  const { user } = useUser();
  const { isLoaded, isSignedIn } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const dayOfYear = getDayOfYear();
  const tip = tips[dayOfYear % tips.length];

  const fetchCases = useCallback(async (retryCount = 0) => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const data = await fetchAuthorCases();
      setCases(data || []);
    } catch (e) {
      console.error('Error fetching cases:', e);
      if (retryCount < 5) {
        const delay = 500 * (retryCount + 1);
        setTimeout(() => fetchCases(retryCount + 1), delay);
        return;
      }
      setFetchError('Could not load your cases. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) return;
    fetchCases();
  }, [isLoaded, isSignedIn, fetchCases]);

  const handleDelete = useCallback(async (caseId: string) => {
    if (!confirm('Are you sure you want to delete this case?')) return;
    setIsDeleting(caseId);
    try {
      await deleteCaseAction(caseId);
      await fetchCases();
      toast.success('Case deleted successfully');
    } catch (e) {
      console.error('Error deleting case:', e);
      toast.error('Failed to delete case');
    } finally {
      setIsDeleting(null);
    }
  }, [fetchCases]);

  const handleSubmit = useCallback(async (caseId: string) => {
    if (!confirm('Are you sure you want to submit this case for review?')) return;
    setIsSubmitting(caseId);
    try {
      await submitCaseAction(caseId);
      await fetchCases();
      toast.success('Case submitted successfully');
    } catch (e) {
      console.error('Error submitting case:', e);
      const message = e instanceof Error ? e.message : 'Failed to submit case';
      toast.error(message);
    } finally {
      setIsSubmitting(null);
    }
  }, [fetchCases]);

  const stats = useMemo(() => ({
    total: cases.length,
    published: cases.filter(c => c.status === 'approved').length,
    inReview: cases.filter(c => c.status === 'submitted').length,
    drafts: cases.filter(c => c.status === 'draft' || c.status === 'changes_requested').length
  }), [cases]);

  const recentCases = useMemo(() => 
    [...cases].sort((a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    ).slice(0, 5),
    [cases]
  );

  return (
    <div className="space-y-8">
      <div>
        <h1>Welcome back, {user?.fullName || 'User'}!</h1>
        <p className="text-muted-foreground mt-2">Here&apos;s what&apos;s happening with your cases.</p>
      </div>

      {fetchError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{fetchError}</span>
          <Button variant="outline" size="sm" onClick={() => fetchCases()}>
            Retry
          </Button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="shadow-sm">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20" />
                </div>
                <Skeleton className="w-12 h-12 rounded-full" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Cases</p>
                  <p className="text-3xl font-bold text-foreground mt-2">{stats.total}</p>
                </div>
                <div className="bg-brand-muted p-3 rounded-full">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Published</p>
                  <p className="text-3xl font-bold text-success mt-2">{stats.published}</p>
                </div>
                <div className="bg-success/10 p-3 rounded-full">
                  <CheckCircle className="w-6 h-6 text-success" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">In Review</p>
                  <p className="text-3xl font-bold text-warning mt-2">{stats.inReview}</p>
                </div>
                <div className="bg-warning/10 p-3 rounded-full">
                  <Eye className="w-6 h-6 text-warning" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Drafts</p>
                  <p className="text-3xl font-bold text-muted-foreground mt-2">{stats.drafts}</p>
                </div>
                <div className="bg-muted p-3 rounded-full">
                  <Clock className="w-6 h-6 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link href="/dashboard/author/new">
                  <Button className="w-full h-20 text-lg">
                    <Plus className="w-5 h-5 mr-2" /> New Case
                  </Button>
                </Link>
                <Link href="/dashboard/author/templates">
                  <Button variant="outline" className="w-full h-20 text-lg hover:border-primary hover:text-primary">
                    <BookOpen className="w-5 h-5 mr-2" /> Browse Templates
                  </Button>
                </Link>
                <Link href="/dashboard/author/cases">
                  <Button variant="outline" className="w-full h-20 text-lg hover:border-primary hover:text-primary">
                    <FileText className="w-5 h-5 mr-2" /> My Cases
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Recent Cases */}
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Recent Cases</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="border border-border rounded-lg p-4 flex items-center justify-between">
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Skeleton className="h-9 w-16 rounded-md" />
                        <Skeleton className="h-9 w-16 rounded-md" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentCases.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>You haven&apos;t created any cases yet</p>
                  <Link href="/dashboard/author/new">
                    <Button className="mt-4">
                      Create Your First Case
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentCases.map((caseItem) => (
                    <RecentCaseCard
                      key={caseItem.id}
                      caseItem={caseItem}
                      isSubmitting={isSubmitting === caseItem.id}
                      isDeleting={isDeleting === caseItem.id}
                      onSubmit={handleSubmit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tip of the Day */}
        <div className="lg:col-span-1">
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <Book className="w-5 h-5 text-secondary" /> Tip of the Day
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">{tip}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}