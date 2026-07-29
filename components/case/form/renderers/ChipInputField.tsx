'use client';

import React, { useState } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';
import type { FieldConfig } from '@/lib/case-form-schema';

export function ChipInputField({ field }: { field: FieldConfig }) {
  const { control } = useFormContext();
  const [inputValue, setInputValue] = useState('');

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

          const handleAdd = () => {
            const trimmed = inputValue.trim();
            if (trimmed && !currentValues.includes(trimmed)) {
              controllerField.onChange([...currentValues, trimmed]);
              setInputValue('');
            }
          };

          const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          };

          const handleRemove = (index: number) => {
            const nextValues = currentValues.filter((_, i) => i !== index);
            controllerField.onChange(nextValues);
          };

          return (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder={field.placeholder || `Add ${field.label}...`}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <Button type="button" variant="secondary" onClick={handleAdd}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
              {currentValues.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {currentValues.map((item: string, index: number) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {item}
                      <button
                        type="button"
                        onClick={() => handleRemove(index)}
                        className="hover:text-destructive text-muted-foreground ml-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          );
        }}
      />
    </div>
  );
}
