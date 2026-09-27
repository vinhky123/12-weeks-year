"use client";

import { useEffect, useState, useCallback } from "react";
import type { BackupMetaDto } from "@/lib/contracts";
import { apiFetch } from "@/components/common/api";

export function BackupsList({ refreshTrigger }: { refreshTrigger?: number }) {
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
      setError("Failed to load automatic checkpoints.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups, refreshTrigger]);

  return (
    <div className="mt-6 border-t border-slate-100 pt-6 dark:border-slate-800">
      <div className="flex items-baseline justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Automatic Backups
        </h4>
        <button
          type="button"
          onClick={fetchBackups}
          className="text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        >
          Refresh
        </button>
      </div>

      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        A checkpoint is saved automatically every time you close a week. The newest 5 are kept.
      </p>

      {loading && (
        <div className="mt-3 space-y-2">
          <div className="h-9 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          <div className="h-9 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        </div>
      )}

      {error && !loading && (
        <div className="mt-3 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      )}

      {!loading && !error && backups.length === 0 && (
        <div className="mt-3 rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
          No checkpoints yet — close a week first.
        </div>
      )}

      {!loading && backups.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/50 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900/50">
          {backups.map((b) => (
            <li
              key={b.file}
              className="flex items-center justify-between px-3.5 py-2.5 text-xs"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="truncate font-mono font-medium text-slate-800 dark:text-slate-200">
                  {b.file}
                </span>
                <span className="shrink-0 rounded bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  {(b.sizeBytes / 1024).toFixed(1)} KB
                </span>
              </div>
              <time
                dateTime={b.createdAt}
                className="shrink-0 text-[11px] text-slate-400 dark:text-slate-500"
              >
                {new Date(b.createdAt).toLocaleString(undefined, {
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
