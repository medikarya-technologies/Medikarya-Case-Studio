'use client';

import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FieldConfig } from '@/lib/case-form-schema';

export function NumberField({ field }: { field: FieldConfig }) {
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

  return (
    <div className="space-y-2">
      <Label htmlFor={field.name}>
        {field.label} {field.required && <span className="text-destructive">*</span>}
      </Label>
      <Controller
        name={field.name}
        control={control}
        render={({ field: controllerField }: { field: any }) => (
          <Input
            id={field.name}
            type="number"
            placeholder={field.placeholder}
            {...controllerField}
            value={controllerField.value ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const val = e.target.value;
              controllerField.onChange(val === '' ? undefined : Number(val));
            }}
          />
        )}
      />
      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
    </div>
  );
}
