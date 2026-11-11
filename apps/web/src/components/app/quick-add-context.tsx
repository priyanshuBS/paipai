'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Transaction, TransactionType } from '@paipai/shared/schemas';
import { QuickAddDialog } from './quick-add-dialog';

interface QuickAddState {
  open: boolean;
  type: TransactionType;
  editing: Transaction | null;
}

interface QuickAddApi {
  openAdd: (type?: TransactionType) => void;
  openEdit: (t: Transaction) => void;
}

const Ctx = createContext<QuickAddApi | null>(null);

export function useQuickAdd(): QuickAddApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useQuickAdd must be used inside <QuickAddProvider>');
  return v;
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

export function QuickAddProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<QuickAddState>({
    open: false,
    type: 'expense',
    editing: null,
  });

  const openAdd = useCallback(
    (type: TransactionType = 'expense') => setState({ open: true, type, editing: null }),
    [],
  );
  const openEdit = useCallback(
    (t: Transaction) => setState({ open: true, type: t.type, editing: t }),
    [],
  );

  // Keyboard shortcut: "N" opens Quick Add from anywhere in the app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() !== 'n' ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        isTypingTarget(e.target)
      )
        return;
      if (document.querySelector('[role="dialog"]')) return;
      e.preventDefault();
      openAdd('expense');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openAdd]);

  const api = useMemo(() => ({ openAdd, openEdit }), [openAdd, openEdit]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <QuickAddDialog
        open={state.open}
        initialType={state.type}
        editing={state.editing}
        onOpenChange={(open) => setState((s) => ({ ...s, open }))}
      />
    </Ctx.Provider>
  );
}
