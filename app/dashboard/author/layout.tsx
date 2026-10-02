import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getUserByClerkId, getOrCreateUser } from '@/lib/supabase/queries';
import AuthorDashboardClientLayout from './client-layout';
import { getReviewerProfile } from '@/lib/reviewers/server';

export default async function AuthorDashboardLayout({
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
  
  if (role !== 'author' && role !== 'admin') {
    redirect('/');
  }
  
  // Someone who has applied to review MediKarya cases gets that page in their menu (their role stays as it is).
  const reviewerProfile = await getReviewerProfile(user.id).catch(() => null);

  return <AuthorDashboardClientLayout reviewsMediKarya={!!reviewerProfile}>{children}</AuthorDashboardClientLayout>;
}
