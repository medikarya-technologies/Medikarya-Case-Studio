'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { UseFormWatch, UseFormReset, FieldValues, DefaultValues } from 'react-hook-form';

const DEBOUNCE_MS = 800;
// Only save to localStorage if at least one meaningful field is filled
// (prevents blank form state from overwriting a real draft)
const MEANINGFUL_FIELDS = ['title', 'patient_details'];

function hasMeaningfulContent(values: Record<string, unknown>): boolean {
  const title = values?.title;
  if (typeof title === 'string' && title.trim().length > 0) return true;
  const pd = values?.patient_details as Record<string, unknown> | undefined;
  if (pd?.patient_name && typeof pd.patient_name === 'string' && pd.patient_name.trim().length > 0) return true;
  return false;
}

/**
 * Persists react-hook-form data to localStorage so that accidental refreshes
 * or server-side redirects don't wipe unsaved work.
 *
 * - Saves form values to `localStorage[storageKey]` with an 800ms debounce,
 *   BUT ONLY if meaningful content exists (prevents blank form from overwriting a real draft).
 * - On mount, if a saved draft exists it silently pre-loads it — no blocking confirm dialog.
 * - Returns `clearDraft()` which should be called only when the case is fully submitted
 *   (NOT on intermediate saves — data should persist between steps).
 */
export function useLocalDraft<T extends FieldValues>(
  storageKey: string,
  watch: UseFormWatch<T>,
  reset: UseFormReset<T>
) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRestored = useRef(false);

  // On mount: silently restore any saved draft (no blocking confirm dialog).
  // We use a ref guard so this only runs once per mount, even in StrictMode.
  useEffect(() => {
    if (hasRestored.current) return;
    hasRestored.current = true;

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;

      const saved = JSON.parse(raw) as T;

      // Only restore if the draft actually has content worth keeping
      if (!hasMeaningfulContent(saved as Record<string, unknown>)) {
        localStorage.removeItem(storageKey);
        return;
      }

      // Silently pre-populate the form — no disruptive dialog
      reset(saved as DefaultValues<T>);
    } catch {
      localStorage.removeItem(storageKey);
    }
  // storageKey is stable (constant string per page mount)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Subscribe to all form changes and debounce-write to localStorage.
  // Only write if the form has meaningful content — prevents blank state
  // from overwriting a real draft when the component re-mounts.
  useEffect(() => {
    const subscription = watch((values) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        try {
          // Guard: don't overwrite a good draft with an empty form
          if (!hasMeaningfulContent(values as Record<string, unknown>)) return;
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

  /**
   * Call this ONLY after the case is fully submitted (status = submitted).
   * Do NOT call on intermediate "Save Draft" clicks — the draft should
   * persist in localStorage between steps and sessions.
   */
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [storageKey]);

  return { clearDraft };
}
