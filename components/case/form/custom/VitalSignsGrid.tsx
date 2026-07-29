'use client';

import React, { useEffect } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function VitalSignsGrid() {
  const { control, watch, setValue } = useFormContext();

  const height = watch('examination_findings.vital_signs.height');
  const weight = watch('examination_findings.vital_signs.weight');

  useEffect(() => {
    if (height && weight && height > 0) {
      const heightInM = height / 100;
      const bmi = weight / (heightInM * heightInM);
      setValue('examination_findings.vital_signs.bmi', Math.round(bmi * 100) / 100);
    }
  }, [height, weight, setValue]);

  return (
    <div className="space-y-3 p-4 border rounded-lg bg-card/30">
      <Label className="text-base font-semibold">Vital Signs</Label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Systolic BP (mmHg)</Label>
          <Controller
            name="examination_findings.vital_signs.bp_systolic"
            control={control}
            render={({ field }: { field: any }) => (
              <Input
                type="number"
                placeholder="120"
                {...field}
                value={field.value ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
              />
            )}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Diastolic BP (mmHg)</Label>
          <Controller
            name="examination_findings.vital_signs.bp_diastolic"
            control={control}
            render={({ field }: { field: any }) => (
              <Input
                type="number"
                placeholder="80"
                {...field}
                value={field.value ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
              />
            )}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Heart Rate (bpm)</Label>
          <Controller
            name="examination_findings.vital_signs.hr"
            control={control}
            render={({ field }: { field: any }) => (
              <Input
                type="number"
                placeholder="72"
                {...field}
                value={field.value ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
              />
            )}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Resp Rate (/min)</Label>
          <Controller
            name="examination_findings.vital_signs.rr"
            control={control}
            render={({ field }: { field: any }) => (
              <Input
                type="number"
                placeholder="16"
                {...field}
                value={field.value ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
              />
            )}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Temperature (°C)</Label>
          <Controller
            name="examination_findings.vital_signs.temp"
            control={control}
            render={({ field }: { field: any }) => (
              <Input
                type="number"
                step="0.1"
                placeholder="36.6"
                {...field}
                value={field.value ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
              />
            )}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">SpO2 (%)</Label>
          <Controller
            name="examination_findings.vital_signs.spo2"
            control={control}
            render={({ field }: { field: any }) => (
              <Input
                type="number"
                placeholder="98"
                {...field}
                value={field.value ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
              />
            )}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Weight (kg)</Label>
          <Controller
            name="examination_findings.vital_signs.weight"
            control={control}
            render={({ field }: { field: any }) => (
              <Input
                type="number"
                step="0.1"
                placeholder="70"
                {...field}
                value={field.value ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
              />
            )}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Height (cm)</Label>
          <Controller
            name="examination_findings.vital_signs.height"
            control={control}
            render={({ field }: { field: any }) => (
              <Input
                type="number"
                placeholder="170"
                {...field}
                value={field.value ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
              />
            )}
          />
        </div>

        <div className="col-span-2 sm:col-span-4 space-y-1">
          <Label className="text-xs">BMI (Calculated kg/m²)</Label>
          <Controller
            name="examination_findings.vital_signs.bmi"
            control={control}
            render={({ field }: { field: any }) => (
              <Input
                type="number"
                readOnly
                className="bg-muted font-medium"
                placeholder="Auto-calculated"
                {...field}
                value={field.value ?? ''}
              />
            )}
          />
        </div>
      </div>
    </div>
  );
}
