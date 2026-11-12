'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { ApiError } from './api';

/**
 * Error handler for fire-and-forget actions (delete, undo, duplicate, toggles).
 * Without it a failed request becomes an unhandled promise rejection. With it,
 * the user gets a short message, and if the item turned out to be gone (404,
 * e.g. deleted in another tab or on the phone) the lists refresh so it
 * disappears instead of failing again.
 */
export function useActionErrorHandler() {
  const qc = useQueryClient();
  return useCallback(
    (err: unknown, fallback = 'Something went wrong. Please try again.') => {
      if (err instanceof ApiError && err.status === 404) {
        toast.error('That item no longer exists. The list has been refreshed.');
        void qc.invalidateQueries({ queryKey: ['transactions'] });
        void qc.invalidateQueries({ queryKey: ['analytics'] });
        void qc.invalidateQueries({ queryKey: ['budgets'] });
        void qc.invalidateQueries({ queryKey: ['recurring'] });
        return;
      }
      if (err instanceof ApiError && err.status === 0) {
        toast.error('You seem to be offline. Please try again when connected.');
        return;
      }
      toast.error(err instanceof ApiError && err.message ? err.message : fallback);
    },
    [qc],
  );
}
