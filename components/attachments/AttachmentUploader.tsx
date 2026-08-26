'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, FileText, Image as ImageIcon, Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CaseAttachment } from '@/lib/types';
import { uploadAttachmentAction } from '@/app/actions/attachment-actions';
import { toast } from '@/components/ui/toaster';

interface AttachmentUploaderProps {
  caseId: string;
  investigationId?: string | null;
  investigationGroup?: 'confirmation' | 'staging' | null;
  onAttachmentUploaded?: (attachment: CaseAttachment) => void;
  label?: string;
  description?: string;
}

interface UploadProgressItem {
  id: string;
  fileName: string;
  fileSize: number;
  status: 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];

export function AttachmentUploader({
  caseId,
  investigationId = null,
  investigationGroup = null,
  onAttachmentUploaded,
  label = 'Upload Investigation Scans & Reports',
  description = 'Drag & drop image scans (JPG, PNG, WEBP) or PDF lab reports (up to 10MB per file)',
}: AttachmentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadProgressItem[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `"${file.name}" exceeds the maximum 10MB size limit.`;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Only images (JPG, PNG, WEBP) and PDF files are supported. "${file.name}" was rejected.`;
    }

    return null;
  };

  const processFiles = async (files: FileList | File[]) => {
    setValidationError(null);
    const fileArray = Array.from(files);

    if (fileArray.length === 0) return;

    // Check all files for validation errors
    for (const file of fileArray) {
      const errorMsg = validateFile(file);
      if (errorMsg) {
        setValidationError(errorMsg);
        toast.error(errorMsg);
        return;
      }
    }

    // Upload each valid file
    for (const file of fileArray) {
      const uploadId = Math.random().toString(36).substring(2, 9);
      
      setUploadingFiles((prev) => [
        ...prev,
        {
          id: uploadId,
          fileName: file.name,
          fileSize: file.size,
          status: 'uploading',
        },
      ]);

      try {
        const formData = new FormData();
        formData.append('caseId', caseId);
        if (investigationId) {
          formData.append('investigationId', investigationId);
        }
        if (investigationGroup) {
          formData.append('investigationGroup', investigationGroup);
        }
        formData.append('file', file);

        const newAttachment = await uploadAttachmentAction(formData);

        setUploadingFiles((prev) =>
          prev.map((item) =>
            item.id === uploadId ? { ...item, status: 'success' } : item
          )
        );

        toast.success(`Successfully uploaded "${file.name}"`);

        if (onAttachmentUploaded) {
          onAttachmentUploaded(newAttachment);
        }

        // Auto remove successful items after 3 seconds
        setTimeout(() => {
          setUploadingFiles((prev) => prev.filter((item) => item.id !== uploadId));
        }, 3000);
      } catch (err) {
        const errorText = err instanceof Error ? err.message : 'Upload failed';
        setUploadingFiles((prev) =>
          prev.map((item) =>
            item.id === uploadId
              ? { ...item, status: 'error', errorMessage: errorText }
              : item
          )
        );
        toast.error(`Upload failed for "${file.name}": ${errorText}`);
      }
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  return (
    <div className="space-y-3">
      {/* Dropzone Container */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/20'
            : 'border-emerald-200/80 bg-emerald-50/20 hover:bg-emerald-50/40 hover:border-emerald-300'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={handleFileSelect}
        />

        <div className="flex flex-col items-center justify-center gap-2">
          <div className="w-12 h-12 rounded-full bg-emerald-100/80 flex items-center justify-center text-emerald-700 shadow-sm">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-950">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-1 text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-100/50 hover:text-emerald-950"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            Select Files from Device
          </Button>
        </div>
      </div>

      {/* Inline Validation Error Message */}
      {validationError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 animate-in fade-in-0">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <p className="flex-1">{validationError}</p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-red-600 hover:bg-red-100"
            onClick={() => setValidationError(null)}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Progress feedback per file */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2.5 bg-card border rounded-md text-xs shadow-sm"
            >
              <div className="flex items-center gap-2 truncate pr-2">
                {item.status === 'uploading' && (
                  <Loader2 className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
                )}
                {item.status === 'success' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                {item.status === 'error' && (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span className="font-medium truncate">{item.fileName}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {item.status === 'uploading' && (
                  <span className="text-muted-foreground animate-pulse">Uploading...</span>
                )}
                {item.status === 'success' && (
                  <span className="text-emerald-700 font-medium">Uploaded</span>
                )}
                {item.status === 'error' && (
                  <span className="text-red-600 font-medium">{item.errorMessage || 'Failed'}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
