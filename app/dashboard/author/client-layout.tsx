'use client';

import {
  Home,
  FileText,
  Plus,
  BookOpen,
  User,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';

const navItems = [
  { href: '/dashboard/author', label: 'Dashboard', icon: Home },
  { href: '/dashboard/author/cases', label: 'All Cases', icon: FileText },
  { href: '/dashboard/author/new', label: 'New Case', icon: Plus },
  { href: '/dashboard/author/templates', label: 'Templates', icon: BookOpen },
  { href: '/dashboard/author/profile', label: 'Profile', icon: User },
];

export default function AuthorDashboardClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <DashboardShell navItems={navItems} roleLabel="Author">
      {children}
    </DashboardShell>
  );
}
