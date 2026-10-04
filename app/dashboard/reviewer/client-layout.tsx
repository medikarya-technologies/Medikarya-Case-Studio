'use client';

import { ClipboardCheck, Users } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';

const navItems = [
  { href: '/dashboard/reviewer/medikarya', label: 'MediKarya reviews', icon: ClipboardCheck },
  { href: '/dashboard/reviewer/authors', label: 'Author Overview', icon: Users },
];

export default function ReviewerDashboardClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <DashboardShell navItems={navItems} roleLabel="Reviewer">
      {children}
    </DashboardShell>
  );
}
