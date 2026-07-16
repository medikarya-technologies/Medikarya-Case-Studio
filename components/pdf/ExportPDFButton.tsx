'use client';

import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CaseDocument } from '@/components/pdf/CaseDocument';
import type { Case, User } from '@/lib/types';
import { toast } from '@/components/ui/toaster';

interface ExportPDFButtonProps {
  caseData: Case;
  author?: User;
  size?: 'sm' | 'default';
}

export function ExportPDFButton({ caseData, author, size = 'sm' }: ExportPDFButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  if (caseData.status !== 'approved') return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await pdf(<CaseDocument caseData={caseData} author={author} />).toBlob();
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
