// The same review page, inside the admin dashboard.
import { ClaimReview } from '@/app/dashboard/reviewer/medikarya/[claimId]/claim-review';

export const dynamic = 'force-dynamic';

export default async function ClaimReviewPage({ params }: { params: Promise<{ claimId: string }> }) {
  const { claimId } = await params;
  return <ClaimReview claimId={claimId} base="/dashboard/admin/medikarya" />;
}
