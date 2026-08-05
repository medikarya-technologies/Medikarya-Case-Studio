import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getUserByClerkId, getOrCreateUser } from '@/lib/supabase/queries';
import AdminDashboardClientLayout from './client-layout';

export default async function AdminDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  let user = await getUserByClerkId(userId);
  if (!user) {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      redirect('/sign-in');
    }
    user = await getOrCreateUser(
      userId,
      clerkUser.fullName || clerkUser.username || 'Unknown User',
      clerkUser.emailAddresses[0]?.emailAddress || ''
    );
  }
  
  const role = user.role as 'author' | 'reviewer' | 'admin';
  
  if (role !== 'admin') {
    redirect('/');
  }
  
  return <AdminDashboardClientLayout>{children}</AdminDashboardClientLayout>;
}
