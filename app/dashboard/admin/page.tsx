'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { FileText, Clock, CheckCircle, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/case/StatusBadge';
import { Case } from '@/lib/types';
import { fetchAllCases } from '@/app/actions/case-actions';
import { useAuth } from '@clerk/nextjs';
import { Skeleton } from '@/components/ui/skeleton';

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-16" />
            </div>
            <Skeleton className="h-12 w-12 rounded-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const { isLoaded, isSignedIn } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

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

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <StatsSkeleton />
        <Card className="shadow-sm">
          <CardContent className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  const recentCases = [...cases]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1>Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">Platform overview and recent activity</p>
      </div>

      {fetchError && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{fetchError}</span>
          <Button variant="outline" size="sm" onClick={() => fetchCases()}>
            Retry
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Cases</p>
              <p className="text-3xl font-bold text-primary mt-2">{cases.length}</p>
            </div>
            <div className="bg-brand-muted p-3 rounded-full">
              <FileText className="w-6 h-6 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Pending Review</p>
              <p className="text-3xl font-bold text-warning mt-2">
                {cases.filter((c) => c.status === 'submitted').length}
              </p>
            </div>
            <div className="bg-warning/10 p-3 rounded-full">
              <Clock className="w-6 h-6 text-warning" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Approved</p>
              <p className="text-3xl font-bold text-success mt-2">
                {cases.filter((c) => c.status === 'approved').length}
              </p>
            </div>
            <div className="bg-success/10 p-3 rounded-full">
              <CheckCircle className="w-6 h-6 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Activity</h2>
            <Link href="/dashboard/admin/cases">
              <Button variant="ghost" size="sm" className="text-secondary">
                View all cases
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          {recentCases.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No cases yet</p>
          ) : (
            <div className="space-y-2">
              {recentCases.map((caseItem) => (
                <Link
                  key={caseItem.id}
                  href={`/cases/${caseItem.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{caseItem.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Updated {new Date(caseItem.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={caseItem.status} />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/dashboard/admin/users">
          <Card className="shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer h-full">
            <CardContent className="p-6">
              <h3 className="font-semibold">Manage Users</h3>
              <p className="text-sm text-muted-foreground mt-1">
                View and update user roles across the platform
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/admin/cases">
          <Card className="shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer h-full">
            <CardContent className="p-6">
              <h3 className="font-semibold">All Cases</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Oversee and manage every case on the platform
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
