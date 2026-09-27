"use client";

import type { WarningDto } from "@/lib/contracts";

interface WarningsPanelProps {
  warnings: WarningDto[];
  blockCount: number;
  onApplyDefaults?: () => void;
  applyingDefaults?: boolean;
}

export function WarningsPanel({
  warnings,
  blockCount,
  onApplyDefaults,
  applyingDefaults = false,
}: WarningsPanelProps) {
  if (warnings.length === 0 && blockCount > 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 px-4 py-3 text-xs font-medium text-zinc-800 dark:text-zinc-200 shadow-xs">
        <svg className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span>Tuần mẫu hoàn chỉnh — các khối thời gian theo phương pháp đã được thiết lập đầy đủ.</span>
      </div>
    );
  }

  if (warnings.length === 0) return null;

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/70 p-4 shadow-xs">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <span className="font-semibold text-xs uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
            Gợi ý Tuần Mẫu ({warnings.length})
          </span>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Phương pháp đề xuất các tỷ lệ này nhằm bảo vệ sự tập trung cao độ của bạn.
          </p>
        </div>

        {onApplyDefaults && (
          <button
            type="button"
            onClick={onApplyDefaults}
            disabled={applyingDefaults}
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-zinc-900 dark:bg-zinc-100 px-3.5 py-1.5 text-xs font-semibold text-white dark:text-zinc-900 shadow-xs hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50"
          >
            {applyingDefaults ? "Đang áp dụng..." : "Bắt đầu với mẫu mặc định của sách"}
          </button>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {warnings.map((w, idx) => (
          <div
            key={`${w.field}-${idx}`}
            className="flex items-start gap-2 text-xs text-zinc-800 dark:text-zinc-200"
          >
            <span className="mt-0.5 font-bold text-amber-500">•</span>
            <span className="font-medium">{w.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
