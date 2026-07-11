'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Eye, Edit, Trash2, Send, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/case/StatusBadge';
import { Case } from '@/lib/types';
import { fetchAuthorCases, deleteCaseAction, submitCaseAction } from '@/app/actions/case-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toaster';

export default function AllCasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

  const fetchCases = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchAuthorCases();
      setCases(data || []);
    } catch (e) {
      console.error('Error fetching cases:', e);
      toast.error('Failed to load cases');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const handleDelete = async (caseId: string) => {
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
  };

  const handleSubmit = async (caseId: string) => {
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
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1>All Cases</h1>
          <p className="text-muted-foreground mt-2">Manage all of your case reports</p>
        </div>
        <Link href="/dashboard/author/new">
          <Button className="w-full sm:w-auto">New Case</Button>
        </Link>
      </div>

      {isLoading ? (
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
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2 flex-wrap">
                  <Skeleton className="h-9 w-20 rounded-md" />
                  <Skeleton className="h-9 w-20 rounded-md" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : cases.length === 0 ? (
        <Card className="text-center py-12 shadow-sm">
          <CardContent className="space-y-4">
            <p className="text-lg text-muted-foreground">You haven&apos;t created any cases yet</p>
            <Link href="/dashboard/author/new">
              <Button>Create your first case</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cases.map((caseItem) => (
            <Card key={caseItem.id} className="shadow-sm hover:shadow-md hover:border-primary/20 transition-all">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg line-clamp-1">{caseItem.title}</CardTitle>
                  <StatusBadge status={caseItem.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Created: {new Date(caseItem.created_at).toLocaleDateString()}
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Link href={`/cases/${caseItem.id}`}>
                    <Button variant="secondary" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </Link>
                  {(caseItem.status === 'draft' || caseItem.status === 'changes_requested') && (
                    <Link href={`/cases/${caseItem.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </Link>
                  )}
                  {(caseItem.status === 'draft' || caseItem.status === 'changes_requested') && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleSubmit(caseItem.id)}
                      disabled={isSubmitting === caseItem.id}
                    >
                      {isSubmitting === caseItem.id ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-1" />
                      )}
                      {isSubmitting === caseItem.id ? 'Submitting...' : 'Submit'}
                    </Button>
                  )}
                  {caseItem.status === 'draft' && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(caseItem.id)}
                      disabled={isDeleting === caseItem.id}
                    >
                      {isDeleting === caseItem.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
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
