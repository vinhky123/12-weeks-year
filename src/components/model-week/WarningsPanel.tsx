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
      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-xs font-medium text-emerald-800 shadow-xs">
        <svg className="h-4 w-4 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span>Model week complete — the book&apos;s quantities are in place.</span>
      </div>
    );
  }

  if (warnings.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 shadow-xs">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <span className="font-semibold text-xs uppercase tracking-wider text-amber-900">
            Model Week Nudges ({warnings.length})
          </span>
          <p className="mt-0.5 text-xs text-amber-700">
            The book validates these quantities as intentional recommendations to protect your focus.
          </p>
        </div>

        {onApplyDefaults && (
          <button
            type="button"
            onClick={onApplyDefaults}
            disabled={applyingDefaults}
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-amber-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-950 disabled:opacity-50"
          >
            {applyingDefaults ? "Applying..." : "Start with the book's defaults"}
          </button>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {warnings.map((w, idx) => (
          <div
            key={`${w.field}-${idx}`}
            className="flex items-start gap-2 text-xs text-amber-900"
          >
            <span className="mt-0.5 font-bold text-amber-600">•</span>
            <span className="font-medium">{w.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
