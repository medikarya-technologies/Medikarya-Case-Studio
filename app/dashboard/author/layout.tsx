import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getUserByClerkId, getOrCreateUser } from '@/lib/supabase/queries';
import AuthorDashboardClientLayout from './client-layout';
import { getReviewerProfile } from '@/lib/reviewers/server';
import { writerStanding } from '@/lib/writers/server';

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

  // A new person says who they are before anything else (/welcome): it is the first thing after signing up, by
  // email or with Google alike. Someone who came to review has already said so on their application.
  const standing = await writerStanding(user).catch(() => ({ state: 'verified' as const }));
  if (standing.state === 'none' && !reviewerProfile) redirect('/welcome');

  return (
    <AuthorDashboardClientLayout reviewsMediKarya={!!reviewerProfile} standing={standing}>
      {children}
    </AuthorDashboardClientLayout>
  );
}
