import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServiceClient } from '@/lib/supabase/server';
import { DEV_CLERK_PREFIX, DEV_USER_COOKIE, parseDevUser, testLoginEnabled } from '@/lib/dev/dev-user';

// TEST MODE ONLY (`npm run dev:test`): choose which dummy user to be. The dummy users are the rows of the users table
// whose clerk_id starts with "dev_" (made by scripts/test-users.mjs). Not found on a normal dev server or the live site.

export const dynamic = 'force-dynamic';

async function become(formData: FormData) {
  'use server';
  if (!testLoginEnabled()) return;
  const clerkId = String(formData.get('clerkId') ?? '');
  const jar = await cookies();
  if (!clerkId) {
    jar.delete(DEV_USER_COOKIE);
    redirect('/dev/login');
  }
  if (!clerkId.startsWith(DEV_CLERK_PREFIX)) return;
  const { data: u } = await createServiceClient().from('users').select('clerk_id, name, email, role').eq('clerk_id', clerkId).maybeSingle();
  if (!u) return;
  jar.set(DEV_USER_COOKIE, JSON.stringify({ clerkId: u.clerk_id, name: u.name, email: u.email, role: u.role }), { path: '/' });
  redirect(String(formData.get('next') || '/'));
}

export default async function DevLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (!testLoginEnabled()) notFound();
  const { next } = await searchParams;
  const { data: users } = await createServiceClient().from('users').select('clerk_id, name, email, role').like('clerk_id', `${DEV_CLERK_PREFIX}%`).order('role');
  const current = parseDevUser((await cookies()).get(DEV_USER_COOKIE)?.value);

  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto max-w-md px-4 py-16">
        <p className="eyebrow">Test mode</p>
        <h1 className="mt-2">Choose a dummy user</h1>
        <p className="mt-2 text-muted-foreground">
          These are test accounts in the database, not real people. {current ? `You are ${current.name}.` : 'You are signed out.'}
        </p>
        <div className="mt-6 space-y-2">
          {(users ?? []).map((u) => (
            <form key={u.clerk_id} action={become}>
              <input type="hidden" name="clerkId" value={u.clerk_id} />
              <input type="hidden" name="next" value={next ?? '/'} />
              <button
                type="submit"
                className={`flex w-full items-center justify-between rounded-lg border bg-card px-4 py-3 text-left hover:border-primary ${current?.clerkId === u.clerk_id ? 'border-primary ring-1 ring-primary' : 'border-input'}`}
              >
                <span>
                  <span className="block font-semibold text-foreground">{u.name}</span>
                  <span className="field-hint block">{u.email}</span>
                </span>
                <span className="eyebrow">{u.role}</span>
              </button>
            </form>
          ))}
          {(users ?? []).length === 0 && <p className="field-hint">No dummy users yet. Run: node scripts/test-users.mjs create</p>}
          {current && (
            <form action={become}>
              <input type="hidden" name="clerkId" value="" />
              <button type="submit" className="mt-3 text-sm font-medium text-primary hover:underline">
                Sign out
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
