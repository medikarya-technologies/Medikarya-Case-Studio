import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ApplicationForm } from '@/app/join/reviewer/application-form';

// On a development machine only: the studio's form pieces on one page, without signing in, to check the design
// (headings, fields, labels, cards, buttons) after changing it. Not available on the live site.

export default function DesignPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
        <div>
          <p className="eyebrow">Design preview</p>
          <h1 className="mt-2">Page title</h1>
          <p className="mt-2 text-muted-foreground">The line under a page title, explaining what the page is for.</p>
        </div>

        <ApplicationForm initial={null} />

        <Card>
          <CardHeader>
            <CardTitle>1. Patient Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="p-age">
                Age <span className="text-destructive">*</span>
              </Label>
              <Input id="p-age" placeholder="e.g. 45" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-sex">
                Sex <span className="text-destructive">*</span>
              </Label>
              <select id="p-sex" className="select-field" defaultValue="">
                <option value="" disabled>
                  Select
                </option>
                <option>Male</option>
                <option>Female</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-occ">Occupation</Label>
              <Input id="p-occ" defaultValue="Farmer" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-dis">Disabled</Label>
              <Input id="p-dis" disabled defaultValue="Cannot be changed" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="p-hpi">History of Present Illness</Label>
              <Textarea id="p-hpi" placeholder="Describe the illness from its onset, in order." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>A case, as it is read</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="field-name">Age</p>
              <p className="mt-0.5 text-[15px] font-medium text-foreground">45</p>
            </div>
            <div>
              <p className="field-name">Occupation</p>
              <p className="mt-0.5 text-[15px] font-medium text-foreground">Farmer</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Delete</Button>
          <Button size="lg">Large</Button>
          <Button size="sm">Small</Button>
        </div>
      </div>
    </main>
  );
}
