'use client';

import { useState } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { FileText, Image as ImageIcon, Trash2, ExternalLink, Eye, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CaseAttachment } from '@/lib/types';
import { deleteAttachmentAction } from '@/app/actions/attachment-actions';
import { toast } from '@/components/ui/toaster';

const LightboxModal = dynamic(
  () => import('@/components/attachments/LightboxModal').then((mod) => mod.LightboxModal),
  { ssr: false }
);

interface AttachmentGalleryProps {
  attachments: CaseAttachment[];
  onAttachmentDeleted?: (id: string) => void;
  canDelete?: boolean;
  emptyMessage?: string;
}

export function AttachmentGallery({
  attachments,
  onAttachmentDeleted,
  canDelete = false,
  emptyMessage = 'No attachments added yet.',
}: AttachmentGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<{ url: string; name: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleDelete = async (attachment: CaseAttachment) => {
    setDeletingId(attachment.id);
    try {
      await deleteAttachmentAction(attachment.id);
      toast.success(`Deleted ${attachment.file_name}`);
      setConfirmDeleteId(null);
      if (onAttachmentDeleted) {
        onAttachmentDeleted(attachment.id);
      }
    } catch (e) {
      console.error('Failed to delete attachment:', e);
      const message = e instanceof Error ? e.message : 'Failed to delete attachment';
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  if (attachments.length === 0) {
    return (
      <div className="text-center py-6 border border-dashed rounded-lg bg-muted/20 text-muted-foreground text-sm">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const imageAttachments = attachments.filter((a) => a.file_type === 'image');
  const pdfAttachments = attachments.filter((a) => a.file_type === 'pdf');

  return (
    <div className="space-y-6">
      {/* Image Attachments Section */}
      {imageAttachments.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
            Image Scans & Reports ({imageAttachments.length})
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {imageAttachments.map((att) => (
              <Card
                key={att.id}
                className="group relative overflow-hidden border-emerald-100 hover:border-emerald-300 transition-all bg-card shadow-sm flex flex-col"
              >
                {/* Thumbnail Container */}
                <div
                  className="relative aspect-square bg-zinc-900/5 cursor-pointer overflow-hidden flex items-center justify-center"
                  onClick={() => setSelectedImage({ url: att.public_url, name: att.file_name })}
                >
                  <Image
                    src={att.public_url}
                    alt={att.file_name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                    unoptimized
                    className="object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <span className="bg-white/90 text-zinc-900 text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 shadow-sm">
                      <Eye className="w-3.5 h-3.5" />
                      Preview
                    </span>
                  </div>
                </div>

                {/* File Metadata & Actions */}
                <div className="p-2.5 flex items-center justify-between gap-2 border-t bg-card text-xs">
                  <div className="truncate flex-1">
                    <p className="font-medium text-foreground truncate" title={att.file_name}>
                      {att.file_name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{formatFileSize(att.file_size)}</p>
                  </div>

                  {canDelete && (
                    <div className="shrink-0">
                      {confirmDeleteId === att.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="h-7 px-2 text-[11px]"
                            disabled={deletingId === att.id}
                            onClick={() => handleDelete(att)}
                          >
                            {deletingId === att.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              'Confirm'
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-1.5 text-[11px]"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setConfirmDeleteId(att.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* PDF Reports Section */}
      {pdfAttachments.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-red-500" />
            PDF Reports & Documents ({pdfAttachments.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pdfAttachments.map((att) => (
              <Card
                key={att.id}
                className="p-3 border-emerald-100 hover:border-emerald-300 transition-all flex items-center justify-between gap-3 bg-card shadow-sm"
              >
                <div className="flex items-center gap-3 truncate min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="truncate min-w-0">
                    <a
                      href={att.public_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-sm text-foreground hover:text-emerald-700 truncate block hover:underline"
                      title={att.file_name}
                    >
                      {att.file_name}
                    </a>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{formatFileSize(att.file_size)}</span>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                        PDF
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={att.public_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center h-8 px-2.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1" />
                    View
                  </a>

                  {canDelete && (
                    <div>
                      {confirmDeleteId === att.id ? (
                        <div className="flex items-center gap-1 ml-1">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            disabled={deletingId === att.id}
                            onClick={() => handleDelete(att)}
                          >
                            {deletingId === att.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              'Delete'
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setConfirmDeleteId(att.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox Modal for Image Previews */}
      {selectedImage && (
        <LightboxModal
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          imageUrl={selectedImage.url}
          fileName={selectedImage.name}
        />
      )}
    </div>
  );
}
