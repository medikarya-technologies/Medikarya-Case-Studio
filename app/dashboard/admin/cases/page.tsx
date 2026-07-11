'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Eye, Edit, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/case/StatusBadge';
import { Case, CaseStatus } from '@/lib/types';
import { fetchAllCases } from '@/app/actions/case-actions';
import { useAuth } from '@clerk/nextjs';
import { Skeleton } from '@/components/ui/skeleton';
import { Search } from 'lucide-react';

export default function AdminCasesPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

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

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      !search || c.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
          View and manage every case across the platform
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="flex h-10 rounded-md border border-input bg-card px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="changes_requested">Changes Requested</option>
        </select>
      </div>

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
          {filteredCases.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No cases found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCases.map((caseItem) => (
                <div
                  key={caseItem.id}
                  className="border border-border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 hover:shadow-sm transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{caseItem.title}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <StatusBadge status={caseItem.status as CaseStatus} />
                      <span className="text-sm text-muted-foreground">
                        Created {new Date(caseItem.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link href={`/cases/${caseItem.id}`}>
                      <Button variant="secondary" size="sm" className="min-h-[36px]">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </Link>
                    {(caseItem.status === 'draft' ||
                      caseItem.status === 'changes_requested') && (
                      <Link href={`/cases/${caseItem.id}/edit`}>
                        <Button variant="outline" size="sm" className="min-h-[36px]">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
