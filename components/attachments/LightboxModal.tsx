'use client';

import { X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  fileName: string;
}

export function LightboxModal({
  isOpen,
  onClose,
  imageUrl,
  fileName,
}: LightboxModalProps) {
  if (!isOpen || !imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in-0 duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full bg-card border rounded-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
          <div className="flex items-center gap-2 truncate pr-4">
            <span className="font-semibold text-sm truncate">{fileName}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Original
            </a>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-zinc-950/90 min-h-[300px]">
          <img
            src={imageUrl}
            alt={fileName}
            className="max-h-[75vh] w-auto max-w-full object-contain rounded shadow-lg"
          />
        </div>
      </div>
    </div>
  );
}
