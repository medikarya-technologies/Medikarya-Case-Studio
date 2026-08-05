import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { CaseStatus } from '@/lib/types';
import { STATUS_LABELS } from '@/lib/constants';

interface StatusBadgeProps {
  status: CaseStatus;
}

const statusStyles: Record<CaseStatus, string> = {
  draft: 'bg-status-draft hover:bg-status-draft/90',
  submitted: 'bg-status-submitted hover:bg-status-submitted/90',
  approved: 'bg-status-approved hover:bg-status-approved/90',
  changes_requested: 'bg-status-changes hover:bg-status-changes/90',
};

export const StatusBadge = memo(function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge className={`${statusStyles[status]} text-white`}>
      {STATUS_LABELS[status]}
    </Badge>
  );
});
