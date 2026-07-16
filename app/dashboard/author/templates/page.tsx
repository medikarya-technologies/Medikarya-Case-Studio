'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DifficultyBadge } from '@/components/case/DifficultyBadge';
import { SpecialtyIconBadge, formatSpecialtyLabel } from '@/lib/specialtyIcons';
import { caseTemplates } from '@/lib/caseTemplates';
import { useTemplateAction } from '@/app/actions/case-actions';
import { useState } from 'react';

export default function TemplatesPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleUseTemplate = async (templateId: string) => {
    try {
      setIsLoading(templateId);
      const caseId = await useTemplateAction(templateId);
      router.push(`/cases/${caseId}/edit`);
    } catch (error) {
      console.error('Failed to use template:', error);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Case Templates</h1>
        <p className="text-muted-foreground mt-2">
          Choose a template to get started with your case report
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {caseTemplates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start gap-3">
                <SpecialtyIconBadge specialty={template.specialty} />
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-xl leading-snug">{template.name}</CardTitle>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-sm text-muted-foreground capitalize">
                      {formatSpecialtyLabel(template.specialty)}
                    </span>
                    <DifficultyBadge difficulty={template.difficulty} />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                onClick={() => handleUseTemplate(template.id)}
                disabled={isLoading === template.id}
              >
                {isLoading === template.id ? 'Creating...' : 'Use Template'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
