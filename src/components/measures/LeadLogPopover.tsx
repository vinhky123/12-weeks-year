"use client";

import { useState } from "react";
import type { LeadLogDto } from "@/lib/contracts";
import { apiFetch, ClientApiError } from "@/components/common/api";

interface LeadLogPopoverProps {
  leadMeasureId: number;
  leadMeasureName: string;
  currentWeek: number;
  currentValue?: number | null;
  onLogged: (leadMeasureId: number, weekNumber: number, value: number) => void;
  onClose: () => void;
}

export function LeadLogPopover({
  leadMeasureId,
  leadMeasureName,
  currentWeek,
  currentValue,
  onLogged,
  onClose,
}: LeadLogPopoverProps) {
  const [val, setVal] = useState<string>(currentValue !== undefined && currentValue !== null ? String(currentValue) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(val);
    if (isNaN(num) || num < 0) {
      setError("Please enter a valid number (≥ 0).");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await apiFetch<LeadLogDto>("/api/lead-logs", {
        method: "POST",
        body: JSON.stringify({
          leadMeasureId,
          weekNumber: currentWeek,
          value: num,
        }),
      });

      onLogged(leadMeasureId, currentWeek, num);
      onClose();
    } catch (err) {
      if (err instanceof ClientApiError) {
        setError(err.message);
      } else {
        setError("Failed to log value.");
      }
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900">Log Lead Activity</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded p-1"
          >
            ✕
          </button>
        </div>

        <p className="mt-1 text-xs text-slate-500">
          Week {currentWeek} activity for <strong className="text-slate-700">{leadMeasureName}</strong>
        </p>

        {error && (
          <p className="mt-2 rounded bg-rose-50 p-2 text-xs font-medium text-rose-700">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">Completed count</label>
            <input
              type="number"
              min="0"
              step="any"
              autoFocus
              value={val}
              onChange={(e) => setVal(e.target.value)}
              placeholder="e.g. 3"
              className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-900 focus:border-slate-800 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Log value"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
