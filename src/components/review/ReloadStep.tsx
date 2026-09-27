"use client";

import { useState } from "react";
import Link from "next/link";
import type { NextCycleCreate, GoalDto } from "@/lib/contracts";

interface ReloadStepProps {
  cycleId: number;
  cycleName: string;
  isArchived: boolean;
  goals: GoalDto[];
  onReload: (data: NextCycleCreate) => Promise<{ id: number; name: string } | null>;
  onArchive: () => Promise<void>;
}

export function ReloadStep({
  cycleName,
  isArchived,
  goals,
  onReload,
  onArchive,
}: ReloadStepProps) {
  // Unachieved goals default checked
  const [selectedGoalIds, setSelectedGoalIds] = useState<number[]>(
    goals.filter((g) => g.status !== "achieved").slice(0, 3).map((g) => g.id)
  );

  const [nextName, setNextName] = useState("");
  const [nextStartDate, setNextStartDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsArchiveFirst, setNeedsArchiveFirst] = useState(false);
  const [createdCycle, setCreatedCycle] = useState<{ id: number; name: string } | null>(null);

  const handleToggleGoal = (id: number) => {
    if (selectedGoalIds.includes(id)) {
      setSelectedGoalIds(selectedGoalIds.filter((gid) => gid !== id));
    } else {
      if (selectedGoalIds.length >= 3) {
        setError("Maximum 3 carryover goals allowed — the vital few.");
        return;
      }
      setError(null);
      setSelectedGoalIds([...selectedGoalIds, id]);
    }
  };

  const handleReloadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNeedsArchiveFirst(false);

    try {
      const res = await onReload({
        name: nextName.trim() || undefined,
        startDate: nextStartDate.trim() || undefined,
        carryoverGoalIds: selectedGoalIds,
      });
      if (res) {
        setCreatedCycle(res);
      }
    } catch (err: any) {
      if (err?.message?.includes("Archive this cycle first") || err?.status === 409) {
        setNeedsArchiveFirst(true);
      }
      setError(err?.message || "Failed to start next cycle.");
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveAndRetry = async () => {
    setLoading(true);
    setError(null);
    try {
      await onArchive();
      setNeedsArchiveFirst(false);
      // Auto-retry reload
      const res = await onReload({
        name: nextName.trim() || undefined,
        startDate: nextStartDate.trim() || undefined,
        carryoverGoalIds: selectedGoalIds,
      });
      if (res) {
        setCreatedCycle(res);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to archive and start next cycle.");
    } finally {
      setLoading(false);
    }
  };

  if (createdCycle) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-md space-y-4">
        <span className="text-4xl">🚀</span>
        <h3 className="text-2xl font-black text-slate-900">Your New Year Begins</h3>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          <strong>{createdCycle.name}</strong> is now created in planning mode. Your carried goals are ready; build fresh tactics in the Plan Builder.
        </p>
        <div className="pt-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-slate-800 transition"
          >
            Open dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900">Step 6: Reload</h3>
        <p className="mt-1 text-xs text-slate-500">
          Close out {cycleName}, archive its record, and carry your vital goals into the next 12 weeks.
        </p>
      </div>

      {/* Verbatim Warning */}
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 font-medium">
        <strong className="block text-amber-950 font-bold mb-0.5">Warning:</strong>
        Archiving freezes this cycle forever — its scores, its review, its vision snapshot.
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800 space-y-2">
          <p>{error}</p>
          {needsArchiveFirst && (
            <button
              type="button"
              onClick={handleArchiveAndRetry}
              disabled={loading}
              className="rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-800"
            >
              {loading ? "Archiving..." : "Archive now & continue"}
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleReloadSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
        {/* Next Cycle Info */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
              Next Cycle Name (optional)
            </label>
            <input
              type="text"
              value={nextName}
              onChange={(e) => setNextName(e.target.value)}
              placeholder="e.g. Q1 2027 — Scaling"
              className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
              Start Date (optional Monday)
            </label>
            <input
              type="date"
              value={nextStartDate}
              onChange={(e) => setNextStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-slate-800 focus:outline-none"
            />
          </div>
        </div>

        {/* Carryover Goals Picker */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
              Carry Forward Goals ({selectedGoalIds.length}/3)
            </label>
            <span className="text-[11px] text-slate-400">
              Tactics are re-derived, not copied — reload the plan, not the baggage.
            </span>
          </div>

          {goals.length === 0 ? (
            <p className="text-xs italic text-slate-400">No goals to carry forward.</p>
          ) : (
            <div className="space-y-2">
              {goals.map((g) => {
                const checked = selectedGoalIds.includes(g.id);
                return (
                  <label
                    key={g.id}
                    className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition ${
                      checked
                        ? "border-slate-800 bg-slate-50/80"
                        : "border-slate-200 bg-white hover:bg-slate-50/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleGoal(g.id)}
                      className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-800"
                    />
                    <div className="flex-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{g.title}</span>
                        <span
                          className={`rounded px-1.5 py-0.2 text-[10px] font-semibold uppercase ${
                            g.status === "achieved"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {g.status}
                        </span>
                      </div>
                      <p className="text-slate-500 mt-0.5">
                        Lag: {g.lagMetricName} ({g.lagStart} → {g.lagTarget} {g.lagUnit})
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50 transition"
          >
            {loading ? "Starting Next Cycle..." : "Archive this cycle & create the next"}
          </button>
        </div>
      </form>
    </div>
  );
}
