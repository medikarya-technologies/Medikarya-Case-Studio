'use client';

import { ReactNode } from 'react';
import { ClerkProvider, useUser } from '@clerk/nextjs';
import { Navbar } from '@/components/layout/Navbar';
import { AuthSplash } from '@/components/layout/AuthSplash';
import { useEffect, useState, useRef } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';
import { usePathname } from 'next/navigation';

function UserSync({ children }: { children: ReactNode }) {
  const { user, isLoaded: isClerkLoaded } = useUser();
  const [isSyncing, setIsSyncing] = useState(false);
  const pathname = usePathname();
  const isPublicLandingPage = pathname === '/' || pathname.startsWith('/sign-');
  const syncedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isClerkLoaded) return;
    if (!user) return;
    // Don't re-sync or block if this user ID has already synced in this session
    if (syncedUserIdRef.current === user.id) return;

    const syncUser = async () => {
      // Only show splash on the very first sync if needed
      if (!syncedUserIdRef.current) {
        setIsSyncing(true);
      }
      try {
        const supabase = createSupabaseClient();

        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('clerk_id', user.id)
          .single();

        if (!data) {
          const role = (user.publicMetadata?.role as string) || 'author';
          await supabase.from('users').insert([
            {
              clerk_id: user.id,
              name: user.fullName || user.firstName || '',
              email: user.primaryEmailAddress?.emailAddress || '',
              role,
            },
          ]);
        }
        syncedUserIdRef.current = user.id;
      } catch (e) {
        console.error('Error syncing user:', e);
      } finally {
        setIsSyncing(false);
      }
    };

    syncUser();
  }, [user?.id, isClerkLoaded]);

  if (!isPublicLandingPage && (!isClerkLoaded || (isSyncing && !syncedUserIdRef.current))) {
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
