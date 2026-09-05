'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { UseFormWatch, UseFormReset, FieldValues, DefaultValues } from 'react-hook-form';

const DEBOUNCE_MS = 600;

function hasMeaningfulContent(obj: unknown): boolean {
  if (!obj) return false;
  if (typeof obj === 'string') {
    const stripped = obj.replace(/<[^>]*>/g, '').trim();
    return stripped.length > 0;
  }
  if (typeof obj === 'number') {
    return !isNaN(obj);
  }
  if (Array.isArray(obj)) {
    return obj.some((item) => hasMeaningfulContent(item));
  }
  if (typeof obj === 'object') {
    return Object.entries(obj).some(([key, val]) => {
      // Ignore static default enum values
      if (key === 'specialty' || key === 'difficulty') return false;
      return hasMeaningfulContent(val);
    });
  }
  return false;
}

/**
 * Persists react-hook-form data to localStorage so that accidental refreshes,
 * tab switches, or server-side redirects don't wipe unsaved work.
 */
export function useLocalDraft<T extends FieldValues>(
  storageKey: string,
  watch: UseFormWatch<T>,
  reset: UseFormReset<T>,
  options?: {
    currentStep?: number;
    onRestoreStep?: (step: number) => void;
  }
) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRestored = useRef(false);
  const isClearedRef = useRef(false);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const currentStep = options?.currentStep;
  const onRestoreStep = options?.onRestoreStep;

  // On mount: silently restore any saved draft and step number
  useEffect(() => {
    if (hasRestored.current) return;
    hasRestored.current = true;

    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as T;
        if (hasMeaningfulContent(saved)) {
          reset(saved as DefaultValues<T>);
          setHasRestoredDraft(true);
        } else {
          localStorage.removeItem(storageKey);
          localStorage.removeItem(`${storageKey}_step`);
        }
      }

      const savedStepRaw = localStorage.getItem(`${storageKey}_step`);
      if (savedStepRaw && onRestoreStep) {
        const stepNum = parseInt(savedStepRaw, 10);
        if (stepNum >= 1 && stepNum <= 7) {
          onRestoreStep(stepNum);
        }
      }
    } catch {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(`${storageKey}_step`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Persist current step whenever it changes
  useEffect(() => {
    if (isClearedRef.current) return;
    if (currentStep && currentStep >= 1) {
      try {
        localStorage.setItem(`${storageKey}_step`, String(currentStep));
      } catch {
        // ignore
      }
    }
  }, [storageKey, currentStep]);

  // Subscribe to all form changes and debounce-write to localStorage
  useEffect(() => {
    const subscription = watch((values) => {
      if (isClearedRef.current) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        if (isClearedRef.current) return;
        try {
          if (!hasMeaningfulContent(values)) return;
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
   * Immediately clears the draft from localStorage and cancels all active save timers.
   */
  const clearDraft = useCallback(() => {
    isClearedRef.current = true;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    try {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(`${storageKey}_step`);
    } catch {
      // ignore
    }
    setHasRestoredDraft(false);
  }, [storageKey]);

  return { clearDraft, hasRestoredDraft, setHasRestoredDraft };
}
