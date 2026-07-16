'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageSquare } from 'lucide-react';
import type { CaseComment } from '@/lib/types';
import { fetchCaseCommentsAction, addCaseCommentAction } from '@/app/actions/case-actions';
import { toast } from '@/components/ui/toaster';

interface CaseCommentsProps {
  caseId: string;
}

export function CaseComments({ caseId }: CaseCommentsProps) {
  const [comments, setComments] = useState<CaseComment[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const loadComments = useCallback(async () => {
    try {
      const data = await fetchCaseCommentsAction(caseId);
      setComments(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setIsSending(true);
    try {
      const comment = await addCaseCommentAction(caseId, message);
      setComments((prev) => [...prev, comment]);
      setMessage('');
      toast.success('Comment added');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5" />
          Discussion ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading comments…</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet. Start the discussion.</p>
        ) : (
          <ul className="space-y-3 max-h-80 overflow-y-auto">
            {comments.map((c) => (
              <li key={c.id} className="border border-border rounded-lg p-3 bg-muted/20">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{c.user?.name || 'User'}</span>
                  {c.user?.role && (
                    <Badge variant="secondary" className="text-xs capitalize">
                      {c.user.role}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{c.message}</p>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            placeholder="Add a comment…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <Button type="submit" size="sm" disabled={isSending || !message.trim()}>
            {isSending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Post comment
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
