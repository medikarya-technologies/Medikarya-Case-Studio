'use client';

import { memo } from 'react';
import { CheckCircle2, AlertCircle, Calendar, User as UserIcon, MessageSquare, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type CaseReview, parseReviewComments } from '@/lib/types';
import { SECTION_LABELS } from '@/lib/case-completeness';

interface ReviewHistoryTimelineProps {
  reviews?: CaseReview[];
  onJumpToSection?: (sectionId: string) => void;
}

export const ReviewHistoryTimeline = memo(function ReviewHistoryTimeline({ reviews = [], onJumpToSection }: ReviewHistoryTimelineProps) {
  if (!reviews || reviews.length === 0) {
    return (
      <Card className="border-dashed bg-muted/20">
        <CardContent className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
          <MessageSquare className="w-4 h-4 text-muted-foreground/60" />
          <span>No review rounds or feedback recorded yet.</span>
        </CardContent>
      </Card>
    );
  }

  // Sort chronologically ascending (Round 1, Round 2...)
  const sortedReviews = [...reviews].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <Card className="shadow-sm border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <span>Review History ({reviews.length} {reviews.length === 1 ? 'Round' : 'Rounds'})</span>
          </CardTitle>
          <Badge variant="outline" className="text-xs font-normal">
            Chronological Timeline
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
          {sortedReviews.map((review, idx) => {
            const isApproved = review.decision === 'approved';
            const commentsList = parseReviewComments(review.comments);
            const roundNumber = idx + 1;
            const reviewerName = review.reviewer?.name || 'Assigned Reviewer';

            return (
              <div key={review.id || idx} className="relative group">
                {/* Timeline node icon */}
                <div
                  className={`absolute -left-[31px] top-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${
                    isApproved ? 'bg-emerald-600 ring-4 ring-emerald-100 dark:ring-emerald-950' : 'bg-amber-600 ring-4 ring-amber-100 dark:ring-amber-950'
                  }`}
                >
                  {roundNumber}
                </div>

                <div className="p-4 border rounded-xl bg-card shadow-sm space-y-3 hover:border-primary/40 transition-colors">
                  {/* Round Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/60">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">
                        Round {roundNumber}
                      </span>
                      {isApproved ? (
                        <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Approved
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-950 border-amber-400 dark:bg-amber-950/80 dark:text-amber-100 dark:border-amber-700 text-xs font-medium flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Changes Requested
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <UserIcon className="w-3.5 h-3.5" />
                        {reviewerName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(review.created_at).toLocaleDateString()} at{' '}
                        {new Date(review.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Section Comments List */}
                  <div className="space-y-3 pt-1">
                    {commentsList.map((sc, sIdx) => {
                      const sectionTitle = SECTION_LABELS[sc.sectionId] || sc.sectionLabel || 'Section Feedback';
                      const isSectionJumpable = sc.sectionId && sc.sectionId !== 'general';

                      return (
                        <div
                          key={sc.id || sIdx}
                          className="p-3 rounded-lg bg-muted/40 border border-border/50 text-sm space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <Badge
                              variant="outline"
                              className={`text-[11px] font-medium ${
                                sc.sectionId === 'general'
                                  ? 'bg-muted text-muted-foreground border-border'
                                  : 'bg-primary/10 text-primary border-primary/30'
                              }`}
                            >
                              {sectionTitle}
                            </Badge>

                            {isSectionJumpable && onJumpToSection && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10 gap-1"
                                onClick={() => onJumpToSection(sc.sectionId)}
                              >
                                <span>Jump to section</span>
                                <ArrowRight className="w-3 h-3" />
                              </Button>
                            )}
                          </div>

                          <p className="text-foreground whitespace-pre-wrap leading-relaxed text-sm">
                            {sc.text || '(No additional text provided)'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});
