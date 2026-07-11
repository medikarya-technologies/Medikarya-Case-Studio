'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  href: string;
  label?: string;
  onBeforeNavigate?: () => boolean;
}

export function BackButton({
  href,
  label = 'Back to Dashboard',
  onBeforeNavigate,
}: BackButtonProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    if (onBeforeNavigate && !onBeforeNavigate()) {
      e.preventDefault();
      return;
    }
    if (onBeforeNavigate) {
      e.preventDefault();
      router.push(href);
    }
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary font-medium mb-6 transition-colors min-h-[44px]"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}
