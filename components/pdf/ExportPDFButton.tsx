'use client';

import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CaseDocument } from '@/components/pdf/CaseDocument';
import type { Case, User } from '@/lib/types';
import { toast } from '@/components/ui/toaster';

import { resolvePdfImagesAction, type ResolvedImageMap } from '@/app/actions/attachment-actions';

interface ExportPDFButtonProps {
  caseData: Case;
  author?: User;
  size?: 'sm' | 'default';
}

export function ExportPDFButton({ caseData, author, size = 'sm' }: ExportPDFButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Collect all image URLs from investigations and attachments
      const imageUrls: string[] = [];
      if (caseData.investigations) {
        for (const inv of caseData.investigations) {
          if (inv.image_url) imageUrls.push(inv.image_url);
        }
      }
      if (caseData.attachments) {
        for (const att of caseData.attachments) {
          if (att.file_type === 'image' && att.public_url) {
            imageUrls.push(att.public_url);
          }
        }
      }

      // Resolve images server-side (bypasses browser CORS & prevents PDF crashes)
      const resolvedImages: ResolvedImageMap = await resolvePdfImagesAction(imageUrls);

      const blob = await pdf(
        <CaseDocument caseData={caseData} author={author} resolvedImages={resolvedImages} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${caseData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'case'}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch (e) {
      console.error('PDF export failed:', e);
      toast.error('Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button variant="outline" size={size} onClick={handleExport} disabled={isExporting}>
      {isExporting ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      Export PDF
    </Button>
  );
}
