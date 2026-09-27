"use client";

import { useState } from "react";
import type { CycleDto } from "@/lib/contracts";

interface CycleBarProps {
  cycle: CycleDto | null;
  onCreateCycle: (name: string, startDate?: string) => Promise<void>;
  onStartCycle: (id: number) => Promise<void>;
}

export default function CycleBar({
  cycle,
  onCreateCycle,
  onStartCycle,
}: CycleBarProps) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setCreating(true);
      setError(null);
      await onCreateCycle(name.trim(), startDate || undefined);
      setName("");
      setStartDate("");
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Failed to create cycle.");
    } finally {
      setCreating(false);
    }
  };

  const handleStart = async () => {
    if (!cycle) return;
    try {
      setStarting(true);
      setError(null);
      await onStartCycle(cycle.id);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Failed to start cycle.");
    } finally {
      setStarting(false);
    }
  };

  if (!cycle) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">A year is 12 weeks.</h2>
          <p className="mt-1 text-sm text-slate-600">
            A year is 12 weeks. Pick up to 3 goals, add the daily/weekly actions that produce them, then start the year.
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 pt-2">
          <div className="flex-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Cycle Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q4 2026 Focus"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden"
              disabled={creating}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Start Date (Optional, defaults to next Monday)
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden"
              disabled={creating}
            />
          </div>

          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50 transition shrink-0"
          >
            {creating ? "Creating..." : "Create cycle"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-900">{cycle.name}</h2>
            <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-slate-700">
              {cycle.status}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Starts: <span className="font-semibold text-slate-700">{cycle.startDate}</span> &middot; 12 weeks of execution + week 13 review
          </p>
        </div>

        {cycle.status === "planning" && (
          <button
            type="button"
            onClick={handleStart}
            disabled={starting}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-emerald-500 disabled:opacity-50 transition shrink-0"
          >
            {starting ? "Starting..." : "Start the year"}
          </button>
        )}
      </div>
    </div>
  );
}
