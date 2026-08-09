'use client';

import { useState } from 'react';
import { useFormContext, useFieldArray, Controller } from 'react-hook-form';
import { Plus, X, Type, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { CaseFormData } from '@/lib/case-schema';
import type { CustomField } from '@/lib/types';

interface CustomFieldsSectionProps {
  sectionId: string;
  sectionTitle?: string;
}

export function CustomFieldsSection({ sectionId, sectionTitle }: CustomFieldsSectionProps) {
  const { control, watch } = useFormContext<CaseFormData>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'custom_fields',
  });

  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<'text' | 'textarea'>('text');
  const [newValue, setNewValue] = useState('');
  const [labelError, setLabelError] = useState('');

  // Get current fields matching sectionId
  const sectionCustomFields = fields
    .map((field: any, index: number) => ({ field, index }))
    .filter(({ field }: any) => (field as unknown as CustomField).sectionId === sectionId);

  const handleConfirmAdd = () => {
    const trimmedLabel = newLabel.trim();
    if (!trimmedLabel) {
      setLabelError('Field name is required');
      return;
    }

    const newField: CustomField = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sectionId,
      label: trimmedLabel,
      type: newType,
      value: newValue.trim(),
    };

    append(newField as any);
    setNewLabel('');
    setNewType('text');
    setNewValue('');
    setLabelError('');
    setIsAdding(false);
  };

  const handleCancelAdd = () => {
    setNewLabel('');
    setNewType('text');
    setNewValue('');
    setLabelError('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-4 pt-3 border-t border-dashed">
      {/* Existing Custom Fields for this section */}
      {sectionCustomFields.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {sectionTitle ? `${sectionTitle} — Custom Fields` : 'Custom Fields'}
            </span>
          </div>

          {sectionCustomFields.map(({ field, index }: any) => {
            const customField = field as unknown as CustomField;
            return (
              <div
                key={field.id}
                className="p-3 border rounded-lg bg-amber-500/5 border-amber-500/20 space-y-2 relative group"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Label className="font-medium text-sm text-foreground">
                      {customField.label}
                    </Label>
                    <Badge
                      variant="outline"
                      className="text-xs px-1.5 py-0 bg-amber-100 text-amber-950 border-amber-400 dark:bg-amber-950/80 dark:text-amber-100 dark:border-amber-700 font-medium"
                    >
                      Custom
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(index)}
                    title="Remove custom field"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <Controller
                  name={`custom_fields.${index}.value`}
                  control={control}
                  render={({ field: inputField }: any) =>
                    customField.type === 'textarea' ? (
                      <Textarea
                        placeholder={`Enter ${customField.label.toLowerCase()}...`}
                        {...inputField}
                        value={inputField.value || ''}
                        className="bg-background text-sm"
                        rows={3}
                      />
                    ) : (
                      <Input
                        placeholder={`Enter ${customField.label.toLowerCase()}...`}
                        {...inputField}
                        value={inputField.value || ''}
                        className="bg-background text-sm"
                      />
                    )
                  }
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Inline Mini-Form to Add New Custom Field */}
      {isAdding ? (
        <Card className="border-amber-400/80 bg-amber-50/60 dark:bg-amber-950/30 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span>Add Custom Field</span>
              <Badge
                variant="outline"
                className="text-xs px-1.5 py-0 bg-amber-100 text-amber-950 border-amber-400 dark:bg-amber-950/80 dark:text-amber-100 dark:border-amber-700 font-medium"
              >
                This Case Only
              </Badge>
            </h4>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleCancelAdd}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Field Name / Label *</Label>
              <Input
                placeholder="e.g. Pemberton's Sign, Bethesda Category..."
                value={newLabel}
                onChange={(e) => {
                  setNewLabel(e.target.value);
                  if (labelError) setLabelError('');
                }}
                className="text-sm bg-background"
                autoFocus
              />
              {labelError && <p className="text-xs text-destructive">{labelError}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Field Type</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={newType === 'text' ? 'default' : 'outline'}
                  className="flex-1 text-xs"
                  onClick={() => setNewType('text')}
                >
                  <Type className="w-3.5 h-3.5 mr-1.5" />
                  Single Line Text
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={newType === 'textarea' ? 'default' : 'outline'}
                  className="flex-1 text-xs"
                  onClick={() => setNewType('textarea')}
                >
                  <FileText className="w-3.5 h-3.5 mr-1.5" />
                  Multi-line Textarea
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Initial Value (Optional)</Label>
              {newType === 'textarea' ? (
                <Textarea
                  placeholder="Enter initial value..."
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="text-sm bg-background"
                  rows={2}
                />
              ) : (
                <Input
                  placeholder="Enter initial value..."
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="text-sm bg-background"
                />
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={handleCancelAdd}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleConfirmAdd}>
              Add Custom Field
            </Button>
          </div>
        </Card>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsAdding(true)}
          className="border-dashed text-xs text-muted-foreground hover:text-foreground"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Custom Field
        </Button>
      )}
    </div>
  );
}
