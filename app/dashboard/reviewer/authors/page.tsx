'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Eye,
  X,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/case/StatusBadge';
import { useAuth } from '@clerk/nextjs';
import {
  fetchAuthorCaseSummary,
  AuthorCaseSummary,
  AuthorCaseSummaryOverview,
} from '@/app/actions/case-actions';
import { Case } from '@/lib/types';
import { getCaseCompleteness } from '@/lib/case-completeness';

type SortField =
  | 'name'
  | 'totalCases'
  | 'completedCases'
  | 'incompleteCases'
  | 'submittedCases'
  | 'approvedCases'
  | 'changesRequestedCases';

type SortOrder = 'asc' | 'desc';

type CaseFilterCategory =
  | 'all'
  | 'completed'
  | 'incomplete'
  | 'submitted'
  | 'approved'
  | 'changes_requested';

interface SelectedAuthorDrillDown {
  author: AuthorCaseSummary;
  category: CaseFilterCategory;
}

export default function ReviewerAuthorOverviewPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const [data, setData] = useState<AuthorCaseSummaryOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Search & Sorting state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('submittedCases');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Drill-down Modal State
  const [drillDown, setDrillDown] = useState<SelectedAuthorDrillDown | null>(null);

  const loadData = useCallback(async (retryCount = 0) => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const overview = await fetchAuthorCaseSummary();
      setData(overview);
    } catch (e) {
      console.error('Error fetching author case summary:', e);
      if (retryCount < 2) {
        setTimeout(() => loadData(retryCount + 1), 700);
        return;
      }
      setFetchError('Could not load author case tracking summary. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    loadData();
  }, [isLoaded, isSignedIn, loadData]);

  // Handle column header click for sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'name' ? 'asc' : 'desc');
    }
  };

  // Filtered and sorted authors
  const processedAuthors = useMemo(() => {
    if (!data?.authors) return [];

    let list = data.authors.filter((author) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        author.name.toLowerCase().includes(q) ||
        author.email.toLowerCase().includes(q)
      );
    });

    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      const numA = valA as number;
      const numB = valB as number;
      return sortOrder === 'asc' ? numA - numB : numB - numA;
    });

    return list;
  }, [data?.authors, searchQuery, sortField, sortOrder]);

  // Filter cases inside drill-down modal
  const filteredDrillDownCases = useMemo(() => {
    if (!drillDown) return [];
    const { author, category } = drillDown;

    return author.cases.filter((c) => {
      const completeness = getCaseCompleteness(c);
      const isCompleted = completeness.incompleteItems.length === 0;

      switch (category) {
        case 'completed':
          return isCompleted;
        case 'incomplete':
          return !isCompleted;
        case 'submitted':
          return c.status === 'submitted';
        case 'approved':
          return c.status === 'approved';
        case 'changes_requested':
          return c.status === 'changes_requested';
        case 'all':
        default:
          return true;
      }
    });
  }, [drillDown]);

  // Render Sort Header Indicator
  const renderSortHeader = (label: string, field: SortField, alignRight = false) => {
    const isCurrent = sortField === field;
    return (
      <button
        onClick={() => handleSort(field)}
        className={`flex items-center gap-1.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors ${
          alignRight ? 'ml-auto' : ''
        }`}
      >
        <span>{label}</span>
        {isCurrent ? (
          sortOrder === 'asc' ? (
            <ChevronUp className="w-3.5 h-3.5 text-primary" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-primary" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 text-muted-foreground/40" />
        )}
      </button>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>

        {/* Top summary strip skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="shadow-2xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-7 w-12" />
                </div>
                <Skeleton className="h-10 w-10 rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search bar skeleton */}
        <Skeleton className="h-10 w-full max-w-md" />

        {/* Table skeleton */}
        <Card className="shadow-xs">
          <CardContent className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2.5">
          <Users className="w-8 h-8 text-primary" />
          Author Case Tracking
        </h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Complete overview of author submission metrics, completion progress, and pending review workload.
        </p>
      </div>

      {fetchError && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{fetchError}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => loadData()}>
            Retry
          </Button>
        </div>
      )}

      {data && (
        <>
          {/* Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="shadow-2xs border-l-4 border-l-primary hover:shadow-xs transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Total Authors
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-0.5">{data.totalAuthors}</p>
                </div>
                <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-2xs border-l-4 border-l-secondary hover:shadow-xs transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Total Cases
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-0.5">{data.totalCases}</p>
                </div>
                <div className="p-2.5 bg-secondary/10 text-secondary rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-2xs border-l-4 border-l-blue-500 hover:shadow-xs transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Pending Review
                  </p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-0.5">
                    {data.totalSubmitted}
                  </p>
                </div>
                <div className="p-2.5 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-2xs border-l-4 border-l-emerald-600 hover:shadow-xs transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Approved Cases
                  </p>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                    {data.totalApproved}
                  </p>
                </div>
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-2xs border-l-4 border-l-amber-500 hover:shadow-xs transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Needs Changes
                  </p>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-0.5">
                    {data.totalChangesRequested}
                  </p>
                </div>
                <div className="p-2.5 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl">
                  <AlertCircle className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search Bar & Sorting Helper */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search author by name or email…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-card"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{processedAuthors.length}</span> of{' '}
              <span className="font-semibold text-foreground">{data.totalAuthors}</span> authors
            </div>
          </div>

          {/* Authors Table */}
          <Card className="shadow-xs overflow-hidden">
            {processedAuthors.length === 0 ? (
              <CardContent className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-base font-medium">No authors match your search criteria</p>
                {searchQuery && (
                  <Button variant="outline" size="sm" onClick={() => setSearchQuery('')} className="mt-4">
                    Clear search filter
                  </Button>
                )}
              </CardContent>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/40 border-b border-border">
                    <tr>
                      <th className="py-3.5 px-4">{renderSortHeader('Author', 'name')}</th>
                      <th className="py-3.5 px-4 text-center">{renderSortHeader('Total Cases', 'totalCases')}</th>
                      <th className="py-3.5 px-4 text-center">{renderSortHeader('Completed', 'completedCases')}</th>
                      <th className="py-3.5 px-4 text-center">{renderSortHeader('Incomplete', 'incompleteCases')}</th>
                      <th className="py-3.5 px-4 text-center">{renderSortHeader('Submitted', 'submittedCases')}</th>
                      <th className="py-3.5 px-4 text-center">{renderSortHeader('Approved', 'approvedCases')}</th>
                      <th className="py-3.5 px-4 text-center">{renderSortHeader('Changes Req.', 'changesRequestedCases')}</th>
                      <th className="py-3.5 px-4 text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {processedAuthors.map((author) => {
                      const hasSubmitted = author.submittedCases > 0;
                      const hasChanges = author.changesRequestedCases > 0;

                      return (
                        <tr
                          key={author.authorId}
                          className="hover:bg-muted/30 transition-colors group"
                        >
                          {/* Author Name & Email */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-foreground flex items-center gap-2">
                              <span>{author.name}</span>
                              {hasSubmitted && (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[10px] px-1.5 py-0">
                                  Action Needed
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">{author.email}</div>
                          </td>

                          {/* Total Cases */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => setDrillDown({ author, category: 'all' })}
                              className="inline-flex items-center justify-center min-w-[2.25rem] h-8 px-2.5 rounded-lg text-sm font-semibold bg-muted hover:bg-muted/80 text-foreground transition-all"
                              title="Click to view all cases by this author"
                            >
                              {author.totalCases}
                            </button>
                          </td>

                          {/* Completed Cases */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => setDrillDown({ author, category: 'completed' })}
                              className="inline-flex items-center justify-center min-w-[2.25rem] h-8 px-2.5 rounded-lg text-sm font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-950 transition-all border border-emerald-200 dark:border-emerald-800/50"
                              title="Click to view completed cases"
                            >
                              {author.completedCases}
                            </button>
                          </td>

                          {/* Incomplete Cases */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => setDrillDown({ author, category: 'incomplete' })}
                              className={`inline-flex items-center justify-center min-w-[2.25rem] h-8 px-2.5 rounded-lg text-sm font-semibold transition-all border ${
                                author.incompleteCases > 0
                                  ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/50'
                                  : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                              }`}
                              title="Click to view incomplete cases"
                            >
                              {author.incompleteCases}
                            </button>
                          </td>

                          {/* Submitted Cases */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => setDrillDown({ author, category: 'submitted' })}
                              className={`inline-flex items-center justify-center min-w-[2.25rem] h-8 px-2.5 rounded-lg text-sm font-bold transition-all border ${
                                author.submittedCases > 0
                                  ? 'bg-blue-600 text-white shadow-xs hover:bg-blue-700 animate-pulse'
                                  : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                              }`}
                              title="Click to view cases submitted for review"
                            >
                              {author.submittedCases}
                            </button>
                          </td>

                          {/* Approved Cases */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => setDrillDown({ author, category: 'approved' })}
                              className="inline-flex items-center justify-center min-w-[2.25rem] h-8 px-2.5 rounded-lg text-sm font-semibold bg-emerald-100 text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 transition-all"
                              title="Click to view approved cases"
                            >
                              {author.approvedCases}
                            </button>
                          </td>

                          {/* Cases Requiring Changes */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => setDrillDown({ author, category: 'changes_requested' })}
                              className={`inline-flex items-center justify-center min-w-[2.25rem] h-8 px-2.5 rounded-lg text-sm font-semibold transition-all border ${
                                hasChanges
                                  ? 'bg-orange-100 text-orange-950 border-orange-300 hover:bg-orange-200 dark:bg-orange-950/80 dark:text-orange-200 dark:border-orange-800'
                                  : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                              }`}
                              title="Click to view cases requiring changes"
                            >
                              {author.changesRequestedCases}
                            </button>
                          </td>

                          {/* Action Button */}
                          <td className="py-3.5 px-4 text-right">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setDrillDown({ author, category: 'all' })}
                              className="h-8 text-xs shrink-0"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              View Cases
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {/* Drill-Down Author Cases Modal */}
      {drillDown && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setDrillDown(null)}
        >
          <div
            className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden page-enter"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-border bg-muted/20 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                    Author Portfolio
                  </Badge>
                  <span className="text-xs text-muted-foreground">• {drillDown.author.email}</span>
                </div>
                <h2 className="text-xl font-bold text-foreground mt-1">{drillDown.author.name}</h2>
              </div>
              <button
                onClick={() => setDrillDown(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="px-4 sm:px-6 pt-3 bg-muted/10 border-b border-border flex flex-wrap gap-2">
              {(
                [
                  { id: 'all', label: 'All Cases', count: drillDown.author.totalCases },
                  { id: 'submitted', label: 'Submitted', count: drillDown.author.submittedCases },
                  { id: 'completed', label: 'Completed', count: drillDown.author.completedCases },
                  { id: 'incomplete', label: 'Incomplete', count: drillDown.author.incompleteCases },
                  { id: 'approved', label: 'Approved', count: drillDown.author.approvedCases },
                  { id: 'changes_requested', label: 'Changes Requested', count: drillDown.author.changesRequestedCases },
                ] as const
              ).map((tab) => {
                const isActive = drillDown.category === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setDrillDown({ ...drillDown, category: tab.id })}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all ${
                      isActive
                        ? 'border-primary text-primary bg-card shadow-2xs'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[11px] ${
                        isActive
                          ? 'bg-primary text-primary-foreground font-bold'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Modal Body / Case List */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3">
              {filteredDrillDownCases.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No cases found in this category</p>
                </div>
              ) : (
                filteredDrillDownCases.map((caseItem: Case) => {
                  const completeness = getCaseCompleteness(caseItem);
                  return (
                    <div
                      key={caseItem.id}
                      className="border border-border rounded-lg p-4 bg-card hover:border-primary/40 hover:shadow-2xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-base line-clamp-1">{caseItem.title}</h3>
                          <StatusBadge status={caseItem.status} />
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="capitalize">
                            Specialty: <strong className="text-foreground">{caseItem.specialty?.replace(/_/g, ' ') || 'General'}</strong>
                          </span>
                          <span>•</span>
                          <span>Completeness: <strong className="text-foreground">{completeness.score}%</strong></span>
                          <span>•</span>
                          <span>Created: {new Date(caseItem.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link href={`/cases/${caseItem.id}`} onClick={() => setDrillDown(null)}>
                          <Button size="sm" variant="default" className="min-h-[36px]">
                            <Eye className="w-4 h-4 mr-1.5" />
                            View & Review
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-muted/20 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setDrillDown(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
