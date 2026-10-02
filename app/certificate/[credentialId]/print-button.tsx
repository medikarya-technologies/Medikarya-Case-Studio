'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PrintButton() {
  return (
    <Button onClick={() => window.print()}>
      <Printer className="mr-2 h-4 w-4" /> Print or save as PDF
    </Button>
  );
}
