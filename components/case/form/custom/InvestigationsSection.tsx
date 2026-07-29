'use client';

import React from 'react';
import { useFormContext, useFieldArray, Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { AttachmentUploader } from '@/components/attachments/AttachmentUploader';
import { AttachmentGallery } from '@/components/attachments/AttachmentGallery';
import type { CaseAttachment } from '@/lib/types';

interface InvestigationsSectionProps {
  caseId?: string | null;
  attachments?: CaseAttachment[];
  onAttachmentUploaded?: (attachment: CaseAttachment) => void;
  onAttachmentDeleted?: (id: string) => void;
}

export function InvestigationsSection({
  caseId,
  attachments = [],
  onAttachmentUploaded,
  onAttachmentDeleted,
}: InvestigationsSectionProps) {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'investigations',
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Investigations Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {fields.map((field: Record<string, any>, index: number) => (
            <Card key={field.id} className="p-4 bg-card/50">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium">Investigation {index + 1}</h4>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => remove(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 sm:col-span-3 space-y-2">
                  <Label>Type</Label>
                  <Controller
                    name={`investigations.${index}.type`}
                    control={control}
                    render={({ field: f }: { field: any }) => (
                      <select
                        {...f}
                        value={f.value || 'lab'}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      >
                        <option value="lab">Lab</option>
                        <option value="imaging">Imaging</option>
                        <option value="biopsy">Biopsy</option>
                        <option value="other">Other</option>
                      </select>
                    )}
                  />
                </div>
                <div className="col-span-12 sm:col-span-4 space-y-2">
                  <Label>Test Name</Label>
                  <Controller
                    name={`investigations.${index}.test_name`}
                    control={control}
                    render={({ field: f }: { field: any }) => (
                      <Input placeholder="Test name" {...f} value={f.value || ''} />
                    )}
                  />
                </div>
                <div className="col-span-12 sm:col-span-2 space-y-2">
                  <Label>Date</Label>
                  <Controller
                    name={`investigations.${index}.date`}
                    control={control}
                    render={({ field: f }: { field: any }) => (
                      <Input type="date" {...f} value={f.value || ''} />
                    )}
                  />
                </div>
                <div className="col-span-12 sm:col-span-3 space-y-2">
                  <Label>Result</Label>
                  <Controller
                    name={`investigations.${index}.result`}
                    control={control}
                    render={({ field: f }: { field: any }) => (
                      <Input placeholder="Result" {...f} value={f.value || ''} />
                    )}
                  />
                </div>
                <div className="col-span-12 sm:col-span-4 space-y-2">
                  <Label>Normal Range</Label>
                  <Controller
                    name={`investigations.${index}.normal_range`}
                    control={control}
                    render={({ field: f }: { field: any }) => (
                      <Input placeholder="Normal range" {...f} value={f.value || ''} />
                    )}
                  />
                </div>
                <div className="col-span-12 sm:col-span-8 space-y-2">
                  <Label>Interpretation</Label>
                  <Controller
                    name={`investigations.${index}.interpretation`}
                    control={control}
                    render={({ field: f }: { field: any }) => (
                      <Textarea placeholder="Interpretation" {...f} value={f.value || ''} />
                    )}
                  />
                </div>
                <div className="col-span-12 space-y-2">
                  <Label>Image URL (X-Ray, scan, or chart URL)</Label>
                  <Controller
                    name={`investigations.${index}.image_url`}
                    control={control}
                    render={({ field: f }: { field: any }) => (
                      <Input placeholder="https://example.com/scan.jpg" {...f} value={f.value || ''} />
                    )}
                  />
                </div>
              </div>
            </Card>
          ))}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              append({
                type: 'lab',
                test_name: '',
                result: '',
                normal_range: '',
                date: '',
                interpretation: '',
                image_url: '',
              })
            }
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Investigation
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Investigation Attachments & Scans</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <AttachmentUploader
            caseId={caseId || ''}
            onAttachmentUploaded={onAttachmentUploaded}
          />
          <div className="pt-2">
            <h4 className="text-sm font-medium mb-3">Uploaded Case Attachments</h4>
            <AttachmentGallery
              attachments={attachments}
              canDelete={true}
              onAttachmentDeleted={onAttachmentDeleted}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
