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
      setError("Name is required and weekly target must be an integer ≥ 1.");
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
        setError("Failed to update lead measure.");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Removes its logged history too.")) {
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
        setError("Failed to delete lead measure.");
      }
      setActionLoading(false);
    }
  };

  const currentCount = thisWeek ?? 0;
  const isTargetMet = currentCount >= weeklyTarget;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs transition hover:border-slate-300">
      {error && (
        <div className="mb-2 rounded bg-rose-50 p-2 text-xs text-rose-700">{error}</div>
      )}

      {isEditing ? (
        <form onSubmit={handleEditSubmit} className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="flex-1 min-w-[140px] rounded border border-slate-300 px-2.5 py-1 text-xs text-slate-900 focus:border-slate-800 focus:outline-none"
            placeholder="Measure name"
          />
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500">Target/wk:</span>
            <input
              type="number"
              min="1"
              value={editTarget}
              onChange={(e) => setEditTarget(e.target.value)}
              className="w-16 rounded border border-slate-300 px-2 py-1 text-xs text-slate-900 focus:border-slate-800 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1">
            <button
              type="submit"
              disabled={actionLoading}
              className="rounded bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setEditName(name);
                setEditTarget(String(weeklyTarget));
              }}
              className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-slate-900">{name}</span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                    isTargetMet
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {thisWeek !== null ? `${thisWeek} / ${weeklyTarget}` : `0 / ${weeklyTarget}`}
                  <span className="ml-1 font-normal text-[10px] text-slate-500">this wk</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Target: {weeklyTarget}x / week</p>
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
                    title={`Week ${w}: ${val} / ${weeklyTarget}`}
                    className="relative flex h-full w-2 items-end justify-center rounded-t bg-slate-100"
                  >
                    {hasValue && val > 0 && (
                      <div
                        className={`w-full rounded-t ${
                          val >= weeklyTarget ? "bg-emerald-500" : "bg-slate-400"
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
                className="rounded bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white shadow-xs hover:bg-slate-800"
              >
                +log
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                title="Edit lead measure"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={actionLoading}
                className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                title="Remove lead measure"
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
