"use client";

import { useState } from "react";
import { apiFetch, ClientApiError } from "@/components/common/api";
import { useSettings } from "@/context/SettingsContext";

interface ImportModalProps {
  isOpen: boolean;
  fileName: string;
  fileSizeBytes: number;
  payload: unknown;
  onClose: () => void;
  onSuccess: (counts: Record<string, number>) => void;
}

export function ImportModal({
  isOpen,
  fileName,
  fileSizeBytes,
  payload,
  onClose,
  onSuccess,
}: ImportModalProps) {
  const { t, locale } = useSettings();
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleImport = async () => {
    try {
      setImporting(true);
      setError(null);

      const res = await apiFetch<{ ok: boolean; counts: Record<string, number> }>(
        "/api/import",
        {
          method: "POST",
          body: JSON.stringify({ payload, confirm: true }),
        }
      );

      onSuccess(res.counts);
    } catch (err: unknown) {
      if (err instanceof ClientApiError) {
        setError(err.message);
      } else {
        setError(locale === "vi" ? "Không thể nhập bản sao lưu." : "Failed to import backup.");
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
          {t("settings.import_modal_title")}
        </h3>

        <div className="mt-2 rounded-md bg-amber-50 p-3.5 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <p className="font-semibold">
            {t("settings.import_modal_warning")}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-md bg-zinc-100 p-2.5 text-xs dark:bg-zinc-800">
          <span className="truncate font-mono font-medium text-zinc-800 dark:text-zinc-200">
            {fileName}
          </span>
          <span className="shrink-0 text-zinc-500 dark:text-zinc-400">
            {(fileSizeBytes / 1024).toFixed(1)} KB
          </span>
        </div>

        {error && (
          <div className="mt-3 rounded-md bg-rose-50 p-2.5 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2.5">
          <button
            type="button"
            disabled={importing}
            onClick={onClose}
            className="rounded-md border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 transition"
          >
            {t("action.cancel")}
          </button>
          <button
            type="button"
            disabled={importing}
            onClick={handleImport}
            className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50 transition"
          >
            {importing ? (locale === "vi" ? "Đang nhập..." : "Importing...") : (locale === "vi" ? "Nhập ngay" : "Import now")}
          </button>
        </div>
      </div>
    </div>
  );
}
