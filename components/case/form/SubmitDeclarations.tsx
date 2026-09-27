'use client';

// The two things an author confirms before submitting, shown at the end of step 7. The first is required: most cases
// here are made up for training, but some are written from a real patient, and a real name, UHID or hospital must not
// end up in the case or its attachments. The second is optional: only cases whose author said yes can be adapted and
// published on MediKarya. Both are saved with the case (patient_details.declarations) and checked again on submit.

import { Controller, useFormContext } from 'react-hook-form';
import { ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CaseFormData } from '@/lib/case-schema';

export function SubmitDeclarations() {
  const { control, formState: { errors } } = useFormContext<CaseFormData>();
  const error = errors.patient_details?.declarations?.no_identifiers?.message;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="w-4 h-4 text-primary" />
          Before you submit
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <Controller
          name="patient_details.declarations"
          control={control}
          render={({ field }) => {
            const value = field.value || {};
            const set = (key: 'no_identifiers' | 'publish_consent', checked: boolean) =>
              field.onChange({ ...value, [key]: checked, confirmed_at: new Date().toISOString() });

            return (
              <>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                    checked={!!value.no_identifiers}
                    onChange={(e) => set('no_identifiers', e.target.checked)}
                  />
                  <span>
                    This case is made up, or has no real patient&apos;s identifying details. No real name, UHID, hospital
                    name, face or address appears anywhere in it, including the attached reports and scans.
                    <span className="text-destructive"> *</span>
                  </span>
                </label>
                {error && <p className="text-sm text-destructive">{error}</p>}

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                    checked={!!value.publish_consent}
                    onChange={(e) => set('publish_consent', e.target.checked)}
                  />
                  <span>
                    I allow MediKarya to adapt and publish this case for other students to practise on, with credit to me.
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      Optional. It does not affect your review.
                    </span>
                  </span>
                </label>
              </>
            );
          }}
        />
      </CardContent>
    </Card>
  );
}
