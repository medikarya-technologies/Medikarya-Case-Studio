'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useMemo } from 'react';

let client: ReturnType<typeof createBrowserClient> | undefined;

export function useSupabase() {
  return useMemo(() => {
    if (!client) {
      client = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
    }
    return client;
  }, []);
}

// Create a standalone client (for places where hooks aren't available)
export function createSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
