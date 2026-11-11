'use client';

import { Dialog as D } from 'radix-ui';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in" />
      <D.Content
        className={cn(
          'fixed z-50 flex max-h-[92dvh] w-full flex-col overflow-hidden bg-surface shadow-2xl focus:outline-none',
          // Bottom sheet on phones, centred card on larger screens
          'inset-x-0 bottom-0 rounded-t-[28px] sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[28px]',
          className,
        )}
      >
        <div className="flex items-center justify-between px-5 pb-2 pt-5">
          <D.Title className="text-lg font-bold">{title}</D.Title>
          <D.Close
            aria-label="Close"
            className="flex size-11 items-center justify-center rounded-full hover:bg-surface-muted"
          >
            <X className="size-5" />
          </D.Close>
        </div>
        {description ? (
          <D.Description className="sr-only">{description}</D.Description>
        ) : (
          <D.Description className="sr-only">{title}</D.Description>
        )}
        <div className="overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </D.Content>
    </D.Portal>
  );
}
