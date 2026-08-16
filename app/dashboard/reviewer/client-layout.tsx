'use client';

import { Home, Users } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';

const navItems = [
  { href: '/dashboard/reviewer', label: 'Dashboard', icon: Home },
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
