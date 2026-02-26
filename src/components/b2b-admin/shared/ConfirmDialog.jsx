// ---------------------------------------------------------------------------
// ConfirmDialog - Styled confirmation modal replacing native window.confirm.
// Uses Radix AlertDialog primitives with dark-theme styling.
// ---------------------------------------------------------------------------

import React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({
  open,
  onOpenChange,
  title = 'Are you sure?',
  description = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'destructive', // 'destructive' | 'default'
  onConfirm,
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            {variant === 'destructive' && (
              <div className="shrink-0 mt-0.5 w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-4.5 h-4.5 text-red-400" />
              </div>
            )}
            <div>
              <AlertDialogTitle className="text-white text-base">
                {title}
              </AlertDialogTitle>
              {description && (
                <AlertDialogDescription className="text-zinc-400 text-sm mt-1.5">
                  {description}
                </AlertDialogDescription>
              )}
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-2">
          <AlertDialogCancel className="bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700 hover:text-white">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={
              variant === 'destructive'
                ? 'bg-red-600 text-white hover:bg-red-500 border-0'
                : 'bg-cyan-600 text-white hover:bg-cyan-500 border-0'
            }
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
