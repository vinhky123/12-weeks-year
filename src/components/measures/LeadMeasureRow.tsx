"use client";

import { useState } from "react";
import type { LeadMeasureDto } from "@/lib/contracts";
import { LeadLogPopover } from "./LeadLogPopover";
import { apiFetch, ClientApiError } from "@/components/common/api";

interface LeadMeasureRowProps {
  id: number;
  name: string;
  weeklyTarget: number;
  thisWeek: number | null;
  series: { week: number; value: number }[];
  currentWeek: number;
  onUpdate: (id: number, updated: { name: string; weeklyTarget: number }) => void;
  onDelete: (id: number) => void;
  onLogSuccess: (leadMeasureId: number, weekNumber: number, value: number) => void;
}

export function LeadMeasureRow({
  id,
  name,
  weeklyTarget,
  thisWeek,
  series,
  currentWeek,
  onUpdate,
  onDelete,
  onLogSuccess,
}: LeadMeasureRowProps) {
  const [showLogModal, setShowLogModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editTarget, setEditTarget] = useState(String(weeklyTarget));
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetNum = parseInt(editTarget, 10);
    if (!editName.trim() || isNaN(targetNum) || targetNum < 1) {
      setError("Tên là bắt buộc và mục tiêu tuần phải là số nguyên ≥ 1.");
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      const res = await apiFetch<LeadMeasureDto>(`/api/lead-measures/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editName.trim(), weeklyTarget: targetNum }),
      });
      onUpdate(id, { name: res.name, weeklyTarget: res.weeklyTarget });
      setIsEditing(false);
    } catch (err) {
      if (err instanceof ClientApiError) {
        setError(err.message);
      } else {
        setError("Không thể cập nhật chỉ số dẫn dắt.");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Thao tác này cũng sẽ xóa toàn bộ lịch sử đã ghi nhận.")) {
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      await apiFetch<{ ok: boolean }>(`/api/lead-measures/${id}`, {
        method: "DELETE",
      });
      onDelete(id);
    } catch (err) {
      if (err instanceof ClientApiError) {
        setError(err.message);
      } else {
        setError("Không thể xóa chỉ số dẫn dắt.");
      }
      setActionLoading(false);
    }
  };

  const currentCount = thisWeek ?? 0;
  const isTargetMet = currentCount >= weeklyTarget;

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 shadow-xs transition hover:border-zinc-300 dark:hover:border-zinc-700">
      {error && (
        <div className="mb-2 rounded border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 p-2 text-xs text-rose-700 dark:text-rose-300">{error}</div>
      )}

      {isEditing ? (
        <form onSubmit={handleEditSubmit} className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="flex-1 min-w-[140px] rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1 text-xs text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-100 focus:outline-none"
            placeholder="Tên chỉ số"
          />
          <div className="flex items-center gap-1">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Mục tiêu/tuần:</span>
            <input
              type="number"
              min="1"
              value={editTarget}
              onChange={(e) => setEditTarget(e.target.value)}
              className="w-16 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-100 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1">
            <button
              type="submit"
              disabled={actionLoading}
              className="rounded bg-zinc-900 dark:bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
            >
              Lưu
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setEditName(name);
                setEditTarget(String(weeklyTarget));
              }}
              className="rounded border border-zinc-300 dark:border-zinc-700 px-2 py-1 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Hủy
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{name}</span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                    isTargetMet
                      ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {thisWeek !== null ? `${thisWeek} / ${weeklyTarget}` : `0 / ${weeklyTarget}`}
                  <span className="ml-1 font-normal text-[10px] opacity-75">tuần này</span>
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Mục tiêu: {weeklyTarget} lần / tuần</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Sparkline mini bars across 12 weeks */}
            <div className="flex items-end gap-1 h-6">
              {Array.from({ length: 12 }, (_, i) => {
                const w = i + 1;
                const match = series.find((s) => s.week === w);
                const val = match?.value ?? (w === currentWeek && thisWeek !== null ? thisWeek : 0);
                const hasValue = match !== undefined || (w === currentWeek && thisWeek !== null);
                const barHeight = Math.min(100, Math.round((val / weeklyTarget) * 100));

                return (
                  <div
                    key={w}
                    title={`Tuần ${w}: ${val} / ${weeklyTarget}`}
                    className="relative flex h-full w-2 items-end justify-center rounded-t bg-zinc-100 dark:bg-zinc-800"
                  >
                    {hasValue && val > 0 && (
                      <div
                        className={`w-full rounded-t ${
                          val >= weeklyTarget ? "bg-zinc-900 dark:bg-zinc-100" : "bg-zinc-400 dark:bg-zinc-500"
                        }`}
                        style={{ height: `${Math.max(20, barHeight)}%` }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowLogModal(true)}
                className="rounded bg-zinc-900 dark:bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-white dark:text-zinc-900 shadow-xs hover:bg-zinc-800 dark:hover:bg-zinc-200"
              >
                +ghi nhận
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-300"
                title="Chỉnh sửa chỉ số"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={actionLoading}
                className="rounded p-1 text-zinc-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400"
                title="Xóa chỉ số"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {showLogModal && (
        <LeadLogPopover
          leadMeasureId={id}
          leadMeasureName={name}
          currentWeek={currentWeek}
          currentValue={thisWeek}
          onLogged={onLogSuccess}
          onClose={() => setShowLogModal(false)}
        />
      )}
    </div>
  );
}
