'use client';

import React from 'react';
import { useFormContext, useFieldArray, Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import type { FieldConfig } from '@/lib/case-form-schema';

export function RepeatableGroupField({ field }: { field: FieldConfig }) {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: field.name,
  });

  const subFields = field.itemFields || [];

  return (
    <div className="space-y-4">
      <Label>{field.label}</Label>
      <div className="space-y-3">
        {fields.map((item: Record<string, any>, index: number) => (
          <div key={item.id} className="flex gap-2 items-end border p-3 rounded-lg bg-card/50">
            <div className="grid grid-cols-12 gap-2 flex-1">
              {subFields.map((sf) => (
                <div
                  key={sf.name}
                  className={`col-span-${sf.gridSpan || 4} space-y-1`}
                  style={{ gridColumn: `span ${sf.gridSpan || 4} / span ${sf.gridSpan || 4}` }}
                >
                  <Label className="text-xs">{sf.label}</Label>
                  <Controller
                    name={`${field.name}.${index}.${sf.name}`}
                    control={control}
                    render={({ field: controllerField }: { field: any }) => (
                      <Input
                        placeholder={sf.placeholder}
                        {...controllerField}
                        value={controllerField.value || ''}
                      />
                    )}
                  />
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="shrink-0"
              onClick={() => remove(index)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => append(field.defaultItemValue || {})}
      >
        <Plus className="w-4 h-4 mr-2" />
        {field.addButtonText || `Add ${field.label}`}
      </Button>
    </div>
  );
}
