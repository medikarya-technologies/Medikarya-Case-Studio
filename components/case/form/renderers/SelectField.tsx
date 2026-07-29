'use client';

import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import type { FieldConfig, FieldOption } from '@/lib/case-form-schema';

export function SelectField({ field }: { field: FieldConfig }) {
  const { control, formState: { errors } } = useFormContext();

  const getFieldError = (name: string) => {
    const parts = name.split('.');
    let err: any = errors;
    for (const part of parts) {
      if (!err) break;
      err = err[part];
    }
    return err?.message as string | undefined;
  };

  const errorMessage = getFieldError(field.name);

  const formattedOptions: FieldOption[] = (field.options || []).map((opt) =>
    typeof opt === 'string' ? { label: opt, value: opt } : opt
  );

  return (
    <div className="space-y-2">
      <Label htmlFor={field.name}>
        {field.label} {field.required && <span className="text-destructive">*</span>}
      </Label>
      <Controller
        name={field.name}
        control={control}
        render={({ field: controllerField }: { field: any }) => (
          <select
            id={field.name}
            {...controllerField}
            value={controllerField.value || ''}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="" disabled>
              Select {field.label}...
            </option>
            {formattedOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
      />
      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
    </div>
  );
}
