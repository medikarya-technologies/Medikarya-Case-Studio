'use client';

import { useState } from 'react';
import { CheckCircle2, AlertCircle, Plus, Trash2, Loader2, MessageSquare, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SECTION_LABELS } from '@/lib/case-completeness';
import type { SectionComment } from '@/lib/types';

interface ApproveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  caseTitle: string;
  isSubmitting?: boolean;
}

export function ApproveConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  caseTitle,
  isSubmitting = false,
}: ApproveModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-card border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-950/60 rounded-full text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground">Approve Clinical Case</h3>
            <p className="text-sm text-muted-foreground">
              You are about to approve &quot;<span className="font-semibold text-foreground">{caseTitle}</span>&quot;.
            </p>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
          The case will be marked as <strong>Approved</strong> and the author will receive a notification immediately.
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Confirm Approval
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface RequestChangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (commentsJsonString: string) => Promise<void>;
  caseTitle: string;
  isSubmitting?: boolean;
}

const SECTION_OPTIONS = [
  { id: 'general', label: 'General / Overall Feedback' },
  { id: 'patient_details', label: 'Patient Details' },
  { id: 'chief_complaint', label: 'Chief Complaint & HPI' },
  { id: 'medical_history', label: 'Medical & Personal History' },
  { id: 'examination', label: 'Examination Findings' },
  { id: 'investigations', label: 'Investigations & Reports' },
  { id: 'diagnosis', label: 'Diagnosis & Management' },
  { id: 'learning_points', label: 'Learning Points' },
];

export function RequestChangesModal({
  isOpen,
  onClose,
  onConfirm,
  caseTitle,
  isSubmitting = false,
}: RequestChangesModalProps) {
  const [comments, setComments] = useState<SectionComment[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('general');
  const [currentText, setCurrentText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleAddComment = () => {
    const trimmed = currentText.trim();
    if (!trimmed) {
      setErrorMsg('Please enter feedback text before adding.');
      return;
    }

    const sectionLabel =
      SECTION_OPTIONS.find((s) => s.id === selectedSectionId)?.label || 'General Feedback';

    setComments((prev) => [
      ...prev,
      {
        id: `sc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sectionId: selectedSectionId,
        sectionLabel,
        text: trimmed,
      },
    ]);

    setCurrentText('');
    setErrorMsg('');
  };

  const handleRemoveComment = (index: number) => {
    setComments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    let finalCommentsList = [...comments];

    // If user has un-added text in currentText, add it as a comment automatically
    if (currentText.trim()) {
      const sectionLabel =
        SECTION_OPTIONS.find((s) => s.id === selectedSectionId)?.label || 'General Feedback';
      finalCommentsList.push({
        id: `sc_${Date.now()}`,
        sectionId: selectedSectionId,
        sectionLabel,
        text: currentText.trim(),
      });
    }

    if (finalCommentsList.length === 0) {
      setErrorMsg('Please provide at least one review comment before requesting changes.');
      return;
    }

    const jsonString = JSON.stringify(finalCommentsList);
    await onConfirm(jsonString);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-card border rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 my-8">
        <div className="flex items-start gap-3 border-b pb-4">
          <div className="p-2.5 bg-amber-100 dark:bg-amber-950/80 rounded-full text-amber-800 dark:text-amber-300 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Request Changes</h3>
            <p className="text-xs text-muted-foreground">
              Case: &quot;<span className="font-semibold text-foreground">{caseTitle}</span>&quot;
            </p>
          </div>
        </div>

        {/* Added Comments List Preview */}
        {comments.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Feedback List ({comments.length})
            </Label>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {comments.map((sc, idx) => (
                <div
                  key={sc.id || idx}
                  className="p-3 rounded-lg border bg-muted/40 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                      {sc.sectionLabel}
                    </Badge>
                    <p className="text-foreground whitespace-pre-wrap leading-relaxed">{sc.text}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => handleRemoveComment(idx)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mini Comment Form */}
        <div className="space-y-3 p-4 border rounded-xl bg-amber-50/50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-800">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Target Section for Comment</Label>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
            >
              {SECTION_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Review Feedback / Instructions *</Label>
            <Textarea
              placeholder="Write detailed review feedback for this section (multi-paragraph supported)..."
              value={currentText}
              onChange={(e) => {
                setCurrentText(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              rows={4}
              className="text-xs bg-background leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            {errorMsg ? (
              <p className="text-xs text-destructive font-medium">{errorMsg}</p>
            ) : (
              <span className="text-[11px] text-muted-foreground">
                You can add multiple section-specific comments before submitting.
              </span>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddComment}
              className="text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add to List
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-amber-600 hover:bg-amber-700 text-white"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting Feedback...
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 mr-2" />
                Submit Feedback & Request Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
