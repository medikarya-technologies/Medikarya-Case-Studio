'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import type { Notification } from '@/lib/types';
import { createSupabaseClient } from '@/lib/supabase/client';
import {
  fetchNotificationsAction,
  fetchUnreadNotificationCountAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
  fetchCurrentUser,
} from '@/app/actions/case-actions';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { isLoaded, isSignedIn } = useUser();
  // Keep a ref to the supabase channel so we can unsubscribe on unmount
  const channelRef = useRef<ReturnType<ReturnType<typeof createSupabaseClient>['channel']> | null>(null);

  // ─── Initial load ─────────────────────────────────────────────────────────
  const loadInitial = useCallback(async () => {
    if (!isLoaded || !isSignedIn) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      const [items, count] = await Promise.all([
        fetchNotificationsAction(),
        fetchUnreadNotificationCountAction(),
      ]);
      setNotifications(items);
      setUnreadCount(count);
    } catch (e) {
      console.error('Failed to load notifications', e);
    }
  }, [isLoaded, isSignedIn]);

  // ─── Realtime subscription ────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let cancelled = false;

    async function setupRealtime() {
      try {
        // Get the Supabase user UUID (needed to filter the channel)
        const currentUserRecord = await fetchCurrentUser();
        if (cancelled) return;

        const supabase = createSupabaseClient();

        // Clean up any previous channel before creating a new one
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
        }

        const channel = supabase
          .channel(`notifications:${currentUserRecord.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${currentUserRecord.id}`,
            },
            (payload) => {
              const newNotification = payload.new as Notification;
              // Prepend to list and bump unread count — no server round-trip
              setNotifications((prev) => [newNotification, ...prev]);
              setUnreadCount((c) => c + 1);
            }
          )
          .subscribe();

        channelRef.current = channel;
      } catch (e) {
        console.error('Failed to set up notifications realtime', e);
      }
    }

    // Load initial data once, then subscribe
    loadInitial();
    setupRealtime();

    return () => {
      cancelled = true;
      // Unsubscribe when component unmounts or user signs out
      if (channelRef.current) {
        const supabase = createSupabaseClient();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [isLoaded, isSignedIn, loadInitial]);

  // ─── Click outside to close panel ─────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleOpen = async () => {
    setOpen((v) => !v);
    if (!open) {
      // Refresh the list when the user explicitly opens the panel
      setIsLoading(true);
      await loadInitial();
      setIsLoading(false);
    }
  };

  const handleClickNotification = async (n: Notification) => {
    if (!n.is_read) {
      await markNotificationReadAction(n.id);
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, is_read: true } : item))
      );
    }
    setOpen(false);
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsReadAction();
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={handleOpen}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[min(100vw-2rem,22rem)] bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="font-semibold text-sm">Notifications</p>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={handleMarkAllRead}>
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No notifications</p>
            ) : (
              <ul>
                {notifications.map((n) => (
                  <li key={n.id}>
                    {n.related_case_id ? (
                      <Link
                        href={`/cases/${n.related_case_id}`}
                        onClick={() => handleClickNotification(n)}
                        className={`block px-4 py-3 text-sm hover:bg-muted/50 border-b border-border last:border-0 ${
                          !n.is_read ? 'bg-brand-muted/40' : ''
                        }`}
                      >
                        <p>{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(n.created_at).toLocaleString()}
                        </p>
                      </Link>
                    ) : (
                      <div
                        className={`px-4 py-3 text-sm border-b border-border last:border-0 ${
                          !n.is_read ? 'bg-brand-muted/40' : ''
                        }`}
                      >
                        <p>{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(n.created_at).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
