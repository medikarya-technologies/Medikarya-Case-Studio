'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Menu, X, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { UserButton, useUser } from '@clerk/nextjs';
import { Logo } from '@/components/layout/Logo';
import { APP_SHORT_NAME, APP_SUBTITLE } from '@/lib/constants';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Use `prefix` only for items with nested child routes that should keep the parent highlighted. */
  match?: 'exact' | 'prefix';
}

interface DashboardShellProps {
  children: React.ReactNode;
  navItems: NavItem[];
  roleLabel: string;
}

function normalizePath(path: string) {
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path;
}

export function DashboardShell({ children, navItems, roleLabel }: DashboardShellProps) {
  const pathname = normalizePath(usePathname());
  const { user } = useUser();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Default: exact pathname match only. Prefix matching is opt-in via item.match === 'prefix'
  // so Dashboard (`/dashboard/author`) never lights up on `/dashboard/author/new`.
  const isActive = (item: NavItem) => {
    const href = normalizePath(item.href);
    if (pathname === href) return true;
    if (item.match === 'prefix' && href !== '/') {
      return pathname.startsWith(`${href}/`);
    }
    return false;
  };

  return (
    <div className="flex h-screen bg-surface">
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`
          fixed lg:static z-50 h-full transition-all duration-300
          bg-sidebar text-sidebar-foreground flex flex-col
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isSidebarOpen ? 'w-64' : 'w-[4.5rem]'}
        `}
      >
        <div className="p-4 flex items-center gap-3 border-b border-sidebar-border">
          <Logo size={40} className="text-brand-light shrink-0" />
          {isSidebarOpen && (
            <div className="min-w-0">
              <p className="text-base font-bold truncate">{APP_SHORT_NAME}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{APP_SUBTITLE}</p>
            </div>
          )}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="ml-auto lg:hidden p-2 rounded-lg hover:bg-sidebar-accent/30 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 min-h-[44px] ${
                      active
                        ? 'bg-sidebar-accent text-white shadow-sm'
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/40 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    {isSidebarOpen && <span className="font-medium text-sm">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="hidden lg:block p-3 text-center border-t border-sidebar-border text-sidebar-foreground/70 hover:bg-sidebar-accent/30 transition-colors"
          aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <Menu className="w-5 h-5 mx-auto" />
        </button>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="bg-card border-b border-border px-4 lg:px-6 py-3 flex items-center justify-between shadow-sm">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              className="p-2 rounded-lg hover:bg-muted transition-colors hidden sm:flex"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-foreground">
                  {user?.fullName || user?.username || 'User'}
                </p>
                <p className="text-xs text-muted-foreground">{roleLabel}</p>
              </div>
              <UserButton />
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 page-enter">{children}</div>
      </main>
    </div>
  );
}
