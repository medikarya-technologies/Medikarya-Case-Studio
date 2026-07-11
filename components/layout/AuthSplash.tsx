'use client';

import { Logo } from '@/components/layout/Logo';
import { Skeleton } from '@/components/ui/skeleton';
import { APP_NAME } from '@/lib/constants';

export function AuthSplash() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-6 w-full max-w-sm">
        <div className="relative">
          <Logo size={56} />
          <div className="absolute -inset-2 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
        <div className="text-center space-y-2 w-full">
          <h2 className="text-lg font-semibold text-foreground">{APP_NAME}</h2>
          <p className="text-sm text-muted-foreground">Loading your workspace…</p>
        </div>
        <div className="w-full space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-2/3 mx-auto" />
        </div>
      </div>
    </div>
  );
}
