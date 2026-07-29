'use client';

import React from 'react';
import type { SectionConfig } from '@/lib/case-form-schema';
import type { CaseAttachment } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FormFieldRenderer } from './FormFieldRenderer';
import { InvestigationsSection } from './custom/InvestigationsSection';

interface FormSectionRendererProps {
  section: SectionConfig;
  caseId?: string | null;
  attachments?: CaseAttachment[];
  onAttachmentUploaded?: (attachment: CaseAttachment) => void;
  onAttachmentDeleted?: (id: string) => void;
}

export function FormSectionRenderer({
  section,
  caseId,
  attachments = [],
  onAttachmentUploaded,
  onAttachmentDeleted,
}: FormSectionRendererProps) {
  // If the section is a custom override (like Investigations)
  if (section.customComponentId === 'investigations_section') {
    return (
      <InvestigationsSection
        caseId={caseId}
        attachments={attachments}
        onAttachmentUploaded={onAttachmentUploaded}
        onAttachmentDeleted={onAttachmentDeleted}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{section.title}</CardTitle>
        {section.description && <CardDescription>{section.description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-12 gap-4">
          {section.fields.map((fieldConfig) => (
            <FormFieldRenderer key={fieldConfig.name} field={fieldConfig} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
