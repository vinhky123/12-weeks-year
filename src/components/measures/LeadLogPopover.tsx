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
      setError("Vui lòng nhập một số hợp lệ (≥ 0).");
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
        setError("Không thể lưu giá trị.");
      }
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xl text-zinc-900 dark:text-zinc-100">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Ghi nhận hoạt động dẫn dắt</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded p-1"
          >
            ✕
          </button>
        </div>

        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Hoạt động Tuần {currentWeek} cho <strong className="text-zinc-800 dark:text-zinc-200">{leadMeasureName}</strong>
        </p>

        {error && (
          <p className="mt-2 rounded border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 p-2 text-xs font-medium text-rose-700 dark:text-rose-300">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Số lần đã hoàn thành</label>
            <input
              type="number"
              min="0"
              step="any"
              autoFocus
              value={val}
              onChange={(e) => setVal(e.target.value)}
              placeholder="VD: 3"
              className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-100 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-zinc-900 dark:bg-zinc-100 px-4 py-1.5 text-xs font-semibold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50"
            >
              {saving ? "Đang lưu..." : "Ghi nhận"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
