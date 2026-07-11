import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getOrCreateUser } from '@/lib/supabase/queries';
import ReviewerDashboardClientLayout from './client-layout';

export default async function ReviewerDashboardLayout({
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
  
  if (role !== 'reviewer' && role !== 'admin') {
    redirect('/');
  }
  
  return <ReviewerDashboardClientLayout>{children}</ReviewerDashboardClientLayout>;
}
