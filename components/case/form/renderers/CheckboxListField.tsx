'use client';

import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import type { FieldConfig } from '@/lib/case-form-schema';

export function CheckboxListField({ field }: { field: FieldConfig }) {
  const { control } = useFormContext();

  const options = (field.options || []).map((opt) =>
    typeof opt === 'string' ? opt : opt.value
  );

  return (
    <div className="space-y-2">
      <Label>{field.label}</Label>
      <Controller
        name={field.name}
        control={control}
        render={({ field: controllerField }: { field: any }) => {
          const currentValues: string[] = Array.isArray(controllerField.value)
            ? controllerField.value
            : [];

          const handleToggle = (item: string) => {
            if (currentValues.includes(item)) {
              controllerField.onChange(currentValues.filter((v) => v !== item));
            } else {
              controllerField.onChange([...currentValues, item]);
            }
          };

          return (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {options.map((item) => (
                <label
                  key={item}
                  className="flex items-center gap-2 p-2 border rounded-md cursor-pointer hover:bg-accent text-sm"
                >
                  <input
                    type="checkbox"
                    checked={currentValues.includes(item)}
                    onChange={() => handleToggle(item)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          );
        }}
      />
    </div>
  );
}
