'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { UseFormWatch, UseFormReset, FieldValues, DefaultValues } from 'react-hook-form';

const DEBOUNCE_MS = 800;

/**
 * Persists react-hook-form data to localStorage so that accidental refreshes
 * or server-side redirects don't wipe unsaved work.
 *
 * - Saves form values to `localStorage[storageKey]` with an 800ms debounce.
 * - On mount, if a saved draft exists, offers the user a browser confirm dialog
 *   to restore it (or discard it).
 * - Returns `clearDraft()` which should be called after a successful server save.
 */
export function useLocalDraft<T extends FieldValues>(
  storageKey: string,
  watch: UseFormWatch<T>,
  reset: UseFormReset<T>,
  /**
   * Optional: pass the server-loaded defaults so we only offer restore if the
   * saved draft actually differs from what's already loaded.
   */
  serverDefaults?: DefaultValues<T>
) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasOfferedRestore = useRef(false);

  // On mount: check for a saved draft and offer to restore it.
  useEffect(() => {
    if (hasOfferedRestore.current) return;
    hasOfferedRestore.current = true;

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;

      const saved = JSON.parse(raw) as T;

      // If server defaults were provided and they match the saved draft
      // (e.g. we just saved and reloaded), don't bother prompting.
      if (serverDefaults) {
        const savedStr = JSON.stringify(saved);
        const defaultStr = JSON.stringify(serverDefaults);
        if (savedStr === defaultStr) {
          localStorage.removeItem(storageKey);
          return;
        }
      }

      const restore = window.confirm(
        'You have an unsaved draft for this case. Would you like to restore it?\n\nClick OK to restore, or Cancel to discard it.'
      );

      if (restore) {
        reset(saved as DefaultValues<T>);
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch {
      // Corrupt storage — silently ignore.
      localStorage.removeItem(storageKey);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Subscribe to all form changes and debounce-write to localStorage.
  useEffect(() => {
    const subscription = watch((values) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        try {
          localStorage.setItem(storageKey, JSON.stringify(values));
        } catch {
          // Storage quota exceeded — fail silently.
        }
      }, DEBOUNCE_MS);
    });

    return () => {
      subscription.unsubscribe();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [storageKey, watch]);

  /** Call this after a successful server save to remove the local draft. */
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [storageKey]);

  return { clearDraft };
}
