'use client';

import React from 'react';
import type { FieldConfig } from '@/lib/case-form-schema';
import { TextField } from './renderers/TextField';
import { TextareaField } from './renderers/TextareaField';
import { NumberField } from './renderers/NumberField';
import { SelectField } from './renderers/SelectField';
import { CheckboxListField } from './renderers/CheckboxListField';
import { ChipInputField } from './renderers/ChipInputField';
import { RepeatableGroupField } from './renderers/RepeatableGroupField';
import { DateField } from './renderers/DateField';
import { VitalSignsGrid } from './custom/VitalSignsGrid';

export function FormFieldRenderer({ field }: { field: FieldConfig }) {
  let content: React.ReactNode = null;

  switch (field.type) {
    case 'text':
      content = <TextField field={field} />;
      break;
    case 'textarea':
      content = <TextareaField field={field} />;
      break;
    case 'number':
      content = <NumberField field={field} />;
      break;
    case 'select':
      content = <SelectField field={field} />;
      break;
    case 'checkbox-list':
      content = <CheckboxListField field={field} />;
      break;
    case 'chip-input':
      content = <ChipInputField field={field} />;
      break;
    case 'repeatable-group':
      content = <RepeatableGroupField field={field} />;
      break;
    case 'date':
      content = <DateField field={field} />;
      break;
    case 'custom':
      if (field.customComponentId === 'vital_signs_grid') {
        content = <VitalSignsGrid />;
      }
      break;
    default:
      content = <TextField field={field} />;
  }

  const span = field.gridSpan || 12;

  return (
    <div
      className={`col-span-12 ${
        span === 6 ? 'sm:col-span-6' : span === 4 ? 'sm:col-span-4' : span === 3 ? 'sm:col-span-3' : span === 5 ? 'sm:col-span-5' : span === 7 ? 'sm:col-span-7' : ''
      }`}
    >
      {content}
    </div>
  );
}
