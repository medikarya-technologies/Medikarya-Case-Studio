import { auth } from '@clerk/nextjs/server';
import { UserRole } from '@/lib/types';

export async function getUserRole(): Promise<UserRole> {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: UserRole })?.role;
  return role || 'author';
}
