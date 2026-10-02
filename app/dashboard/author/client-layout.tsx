'use client';

import {
  Home,
  FileText,
  Plus,
  BookOpen,
  User,
  ClipboardCheck,
} from 'lucide-react';
import { DashboardShell } from '@/components/layout/DashboardShell';

const navItems = [
  { href: '/dashboard/author', label: 'Dashboard', icon: Home },
  { href: '/dashboard/author/cases', label: 'All Cases', icon: FileText },
  { href: '/dashboard/author/new', label: 'New Case', icon: Plus },
  { href: '/dashboard/author/templates', label: 'Templates', icon: BookOpen },
  { href: '/dashboard/author/profile', label: 'Profile', icon: User },
];

const reviewItem = { href: '/dashboard/author/medikarya', label: 'MediKarya reviews', icon: ClipboardCheck };

export default function AuthorDashboardClientLayout({
  children,
  reviewsMediKarya = false,
}: Readonly<{
  children: React.ReactNode;
  /** They have applied to review MediKarya cases: show that page first in the menu. */
  reviewsMediKarya?: boolean;
}>) {
  return (
    <DashboardShell navItems={reviewsMediKarya ? [reviewItem, ...navItems] : navItems} roleLabel={reviewsMediKarya ? 'Reviewer' : 'Author'}>
      {children}
    </DashboardShell>
  );
}
