import { redirect } from 'next/navigation';

// Faculty used to approve the students' raw case sheets here. There is now one review per case, of the version
// MediKarya's AI has converted (the report in the queue), so a reviewer's home is that queue.
export default function ReviewerHome() {
  redirect('/dashboard/reviewer/medikarya');
}
