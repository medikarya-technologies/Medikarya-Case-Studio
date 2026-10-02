// TEST MODE ONLY. next.config.js swaps '@clerk/nextjs/server' for this file when the studio is started with
// `npm run dev:test` (see ./clerk-client-stub.tsx). It answers "who is signed in" with the dummy user chosen at
// /dev/login. Never loaded by a normal dev server or a production build.

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { DEV_USER_COOKIE, parseDevUser } from './dev-user';

async function devUser() {
  return parseDevUser((await cookies()).get(DEV_USER_COOKIE)?.value);
}

export async function auth() {
  const user = await devUser();
  return { userId: user?.clerkId ?? null, sessionClaims: user ? { metadata: { role: user.role } } : null };
}

export async function currentUser() {
  const user = await devUser();
  if (!user) return null;
  return { id: user.clerkId, fullName: user.name, username: user.name, emailAddresses: [{ emailAddress: user.email }] };
}

export function clerkMiddleware() {
  return () => NextResponse.next();
}
