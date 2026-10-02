'use client';

import { ReactNode } from 'react';
import { ClerkProvider, useUser } from '@clerk/nextjs';
import { Navbar } from '@/components/layout/Navbar';
import { AuthSplash } from '@/components/layout/AuthSplash';
import { usePathname } from 'next/navigation';

/** The front page and the sign-in pages: they get the site's top bar. */
function isPublicPage(pathname: string) {
  return pathname === '/' || pathname.startsWith('/sign-');
}

/** Pages that are about the signed-in person. The public ones (contributors, certificates, the reviewer page) show at once. */
function needsSession(pathname: string) {
  return pathname.startsWith('/dashboard') || pathname.startsWith('/cases') || pathname.startsWith('/welcome');
}

// The account row in our database is made on the server the first time a signed-in person opens a page
// (getOrCreateUser), so there is nothing to sync from the browser: this only holds the page until Clerk has loaded.
function WaitForSession({ children }: { children: ReactNode }) {
  const { isLoaded } = useUser();
  const pathname = usePathname();
  if (needsSession(pathname) && !isLoaded) return <AuthSplash />;
  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPublicLandingPage = isPublicPage(pathname);

  return (
    <ClerkProvider>
      <WaitForSession>
        {isPublicLandingPage && <Navbar />}
        {isPublicLandingPage ? <main>{children}</main> : children}
      </WaitForSession>
    </ClerkProvider>
  );
}
