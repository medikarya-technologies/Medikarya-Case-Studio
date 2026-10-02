import { ClaimReview } from './claim-review';

export const dynamic = 'force-dynamic';

export default async function ClaimReviewPage({ params }: { params: Promise<{ claimId: string }> }) {
  const { claimId } = await params;
  return <ClaimReview claimId={claimId} base="/dashboard/reviewer/medikarya" />;
}
