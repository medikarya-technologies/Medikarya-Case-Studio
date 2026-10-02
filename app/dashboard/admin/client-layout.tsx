'use client';

import { Home, Users, FileText, ShieldCheck, ClipboardCheck, IndianRupee } from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';

const navItems = [
  { href: '/dashboard/admin', label: 'Dashboard', icon: Home },
  { href: '/dashboard/admin/users', label: 'Manage Users', icon: Users },
  { href: '/dashboard/admin/cases', label: 'All Cases', icon: FileText },
  { href: '/dashboard/admin/reviewers', label: 'Reviewers', icon: ShieldCheck },
  { href: '/dashboard/admin/medikarya', label: 'MediKarya reviews', icon: ClipboardCheck },
  { href: '/dashboard/admin/payouts', label: 'Payouts', icon: IndianRupee },
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
