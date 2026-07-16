import { Badge } from '@/components/ui/badge';
import type { DifficultyLevel } from '@/lib/types';

const labels: Record<DifficultyLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export function DifficultyBadge({ difficulty }: { difficulty: DifficultyLevel | string }) {
  return (
    <Badge variant="outline" className="capitalize">
      {labels[difficulty as DifficultyLevel] ?? difficulty}
    </Badge>
  );
}
