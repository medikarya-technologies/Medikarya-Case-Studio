'use client';

import { Home, Users, FileText } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';

const navItems = [
  { href: '/dashboard/admin', label: 'Dashboard', icon: Home },
  { href: '/dashboard/admin/users', label: 'Manage Users', icon: Users },
  { href: '/dashboard/admin/cases', label: 'All Cases', icon: FileText },
];

export default function AdminDashboardClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <DashboardShell navItems={navItems} roleLabel="Admin">
      {children}
    </DashboardShell>
  );
}
