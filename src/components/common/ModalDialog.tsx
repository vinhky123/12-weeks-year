"use client";

import React, { useEffect, useId, useRef } from "react";
import { useSettings } from "@/context/SettingsContext";

export type ModalDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  busy?: boolean;
  children: React.ReactNode;
  className?: string;
};

export default function ModalDialog({
  open,
  onClose,
  title,
  busy = false,
  children,
  className = "",
}: ModalDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const { locale } = useSettings();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      returnFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      return;
    }

    if (!open && dialog.open) {
      dialog.close();
      const returnFocus = returnFocusRef.current;
      returnFocusRef.current = null;
      requestAnimationFrame(() => returnFocus?.focus());
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className={`modal-dialog m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-hidden rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 ${className}`}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-zinc-200 px-5 py-4 sm:px-6 dark:border-zinc-700">
          <h2 id={titleId} className="text-lg font-semibold tracking-tight">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label={locale === "vi" ? "Đóng hộp thoại" : "Close dialog"}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-2xl leading-none text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:focus-visible:ring-teal-400 dark:focus-visible:ring-offset-zinc-900"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">{children}</div>
      </div>
    </dialog>
  );
}
