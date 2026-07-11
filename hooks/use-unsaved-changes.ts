'use client';

import { useEffect, useCallback } from 'react';

/** Warn on browser tab close / refresh when there are unsaved changes. */
export function useBeforeUnloadWarning(hasUnsavedChanges: boolean) {
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);
}

/** Returns a confirm guard for in-app navigation (links, back buttons). */
export function useNavigationGuard(hasUnsavedChanges: boolean) {
  const confirmNavigation = useCallback(() => {
    if (!hasUnsavedChanges) return true;
    return window.confirm(
      'You have unsaved changes. Are you sure you want to leave? Your changes may be lost.'
    );
  }, [hasUnsavedChanges]);

  return { confirmNavigation };
}
