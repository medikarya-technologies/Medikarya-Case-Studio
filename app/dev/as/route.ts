import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { DEV_CLERK_PREFIX, DEV_USER_COOKIE, testLoginEnabled } from '@/lib/dev/dev-user';

// TEST MODE ONLY: /dev/as?user=dev_admin&next=/dashboard/admin opens a page as a dummy user in one step (for
// screenshots and scripts). The same as choosing the user at /dev/login. 404 anywhere but `npm run dev:test`.

export async function GET(request: NextRequest) {
  if (!testLoginEnabled()) return new NextResponse('Not found', { status: 404 });
  const clerkId = request.nextUrl.searchParams.get('user') ?? '';
  const next = request.nextUrl.searchParams.get('next') || '/';
  if (!clerkId.startsWith(DEV_CLERK_PREFIX) || !next.startsWith('/')) return new NextResponse('Not found', { status: 404 });
  const { data: u } = await createServiceClient().from('users').select('clerk_id, name, email, role').eq('clerk_id', clerkId).maybeSingle();
  if (!u) return new NextResponse('No such dummy user', { status: 404 });
  const response = NextResponse.redirect(new URL(next, request.url));
  response.cookies.set(DEV_USER_COOKIE, JSON.stringify({ clerkId: u.clerk_id, name: u.name, email: u.email, role: u.role }), { path: '/' });
  return response;
}
