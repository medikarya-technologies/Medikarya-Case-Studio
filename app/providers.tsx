'use client';

import { ReactNode } from 'react';
import { ClerkProvider, useUser } from '@clerk/nextjs';
import { Navbar } from '@/components/layout/Navbar';
import { AuthSplash } from '@/components/layout/AuthSplash';
import { useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';
import { usePathname } from 'next/navigation';

function UserSync({ children }: { children: ReactNode }) {
  const { user, isLoaded: isClerkLoaded } = useUser();
  const [isSyncing, setIsSyncing] = useState(false);
  const pathname = usePathname();
  const isPublicLandingPage = pathname === '/' || pathname.startsWith('/sign-');

  useEffect(() => {
    if (!isClerkLoaded) return;
    if (!user) return;

    const syncUser = async () => {
      setIsSyncing(true);
      try {
        const supabase = createSupabaseClient();

        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('clerk_id', user.id)
          .single();

        if (!data) {
          const role = (user.publicMetadata.role as string) || 'author';
          await supabase.from('users').insert([
            {
              clerk_id: user.id,
              name: user.fullName || user.firstName || '',
              email: user.primaryEmailAddress?.emailAddress || '',
              role,
            },
          ]);
        }
      } catch (e) {
        console.error('Error syncing user:', e);
      } finally {
        setIsSyncing(false);
      }
    };

    syncUser();
  }, [user, isClerkLoaded]);

  if (!isPublicLandingPage && (!isClerkLoaded || isSyncing)) {
    return <AuthSplash />;
  }

  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPublicLandingPage = pathname === '/' || pathname.startsWith('/sign-');

  return (
    <ClerkProvider>
      <UserSync>
        {isPublicLandingPage && <Navbar />}
        {isPublicLandingPage ? (
          <main>{children}</main>
        ) : (
          children
        )}
      </UserSync>
    </ClerkProvider>
  );
}
