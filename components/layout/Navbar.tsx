'use client';

import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { UserButton } from '@clerk/nextjs';
import { Logo } from './Logo';
import { APP_SHORT_NAME, APP_SUBTITLE } from '@/lib/constants';

export function Navbar() {
  const { isSignedIn } = useUser();

  return (
    <nav className="bg-card border-b border-border px-4 sm:px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <Logo size={36} />
          <div>
            <span className="text-lg font-bold text-foreground">{APP_SHORT_NAME}</span>
            <span className="hidden sm:inline text-sm text-muted-foreground ml-2">{APP_SUBTITLE}</span>
          </div>
        </Link>

        {isSignedIn ? (
          <UserButton />
        ) : (
          <div className="flex gap-2 sm:gap-3">
            <Link
              href="/sign-in"
              className="px-4 py-2 text-foreground hover:text-primary font-medium transition-colors min-h-[44px] flex items-center"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-brand-light font-medium transition-colors min-h-[44px] flex items-center"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
