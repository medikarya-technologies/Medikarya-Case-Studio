import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getOrCreateUser } from '@/lib/supabase/queries';
import AuthorDashboardClientLayout from './client-layout';

export default async function AuthorDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = await auth();
  const clerkUser = await currentUser();
  
  if (!userId || !clerkUser) {
    redirect('/sign-in');
  }
  
  const user = await getOrCreateUser(
    userId,
    clerkUser.fullName || clerkUser.username || 'Unknown User',
    clerkUser.emailAddresses[0]?.emailAddress || ''
  );
  
  const role = user.role as 'author' | 'reviewer' | 'admin';
  
  if (role !== 'author' && role !== 'admin') {
    redirect('/');
  }
  
  return <AuthorDashboardClientLayout>{children}</AuthorDashboardClientLayout>;
}
