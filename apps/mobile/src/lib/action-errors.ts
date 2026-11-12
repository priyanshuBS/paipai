import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useSnackbar } from '@/components/snackbar';
import { ApiError } from './api';

/**
 * Error handler for fire-and-forget actions (delete, undo, duplicate, toggles).
 * Turns a failed request into a short message instead of an unhandled promise
 * rejection; if the item is gone (404, e.g. deleted on the website) the lists
 * refresh so it disappears.
 */
export function useActionErrorHandler() {
  const qc = useQueryClient();
  const snack = useSnackbar();
  return useCallback(
    (err: unknown, fallback = 'Something went wrong. Please try again.') => {
      if (err instanceof ApiError && err.status === 404) {
        snack({ message: 'That item no longer exists. Refreshed the list.', tone: 'error' });
        void qc.invalidateQueries({ queryKey: ['transactions'] });
        void qc.invalidateQueries({ queryKey: ['analytics'] });
        void qc.invalidateQueries({ queryKey: ['budgets'] });
        void qc.invalidateQueries({ queryKey: ['recurring'] });
        return;
      }
      if (err instanceof ApiError && err.status === 0) {
        snack({
          message: 'You seem to be offline. Please try again when connected.',
          tone: 'error',
        });
        return;
      }
      snack({
        message: err instanceof ApiError && err.message ? err.message : fallback,
        tone: 'error',
      });
    },
    [qc, snack],
  );
}
