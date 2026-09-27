"use client";

import { useEffect, useState, useCallback } from "react";
import type { BackupMetaDto } from "@/lib/contracts";
import { apiFetch } from "@/components/common/api";
import { useSettings } from "@/context/SettingsContext";

export function BackupsList({ refreshTrigger }: { refreshTrigger?: number }) {
  const { t, locale } = useSettings();
  const [backups, setBackups] = useState<BackupMetaDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBackups = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<{ backups: BackupMetaDto[] }>("/api/backups");
      setBackups(res.backups);
    } catch {
      setError(locale === "vi" ? "Không thể tải các bản sao lưu tự động." : "Failed to load automatic checkpoints.");
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups, refreshTrigger]);

  return (
    <div className="mt-6 border-t border-zinc-100 pt-6 dark:border-zinc-800">
      <div className="flex items-baseline justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {t("settings.automatic_backups")}
        </h4>
        <button
          type="button"
          onClick={fetchBackups}
          className="text-[11px] font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition"
        >
          {locale === "vi" ? "Làm mới" : "Refresh"}
        </button>
      </div>

      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        {t("settings.backups_desc")}
      </p>

      {loading && (
        <div className="mt-3 space-y-2">
          <div className="h-9 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-9 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
        </div>
      )}

      {error && !loading && (
        <div className="mt-3 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      )}

      {!loading && !error && backups.length === 0 && (
        <div className="mt-3 rounded-xl border border-dashed border-zinc-200 p-4 text-center text-xs text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
          {t("settings.no_backups")}
        </div>
      )}

      {!loading && backups.length > 0 && (
        <ul className="mt-3 divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-zinc-50/50 dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/50">
          {backups.map((b) => (
            <li
              key={b.file}
              className="flex items-center justify-between px-3.5 py-2.5 text-xs"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="truncate font-mono font-medium text-zinc-800 dark:text-zinc-200">
                  {b.file}
                </span>
                <span className="shrink-0 rounded bg-zinc-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {(b.sizeBytes / 1024).toFixed(1)} KB
                </span>
              </div>
              <time
                dateTime={b.createdAt}
                className="shrink-0 text-[11px] text-zinc-400 dark:text-zinc-500"
              >
                {new Date(b.createdAt).toLocaleString(locale === "vi" ? "vi-VN" : undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
