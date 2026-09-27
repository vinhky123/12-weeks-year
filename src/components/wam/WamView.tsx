"use client";

import { useEffect, useState, useCallback } from "react";
import type { WamReportDto, WamSave } from "@/lib/contracts";
import { apiFetch, ClientApiError } from "@/components/common/api";
import { WeekPicker } from "./WeekPicker";
import { AutoReport } from "./AutoReport";
import { WamField } from "./WamField";

interface WamViewProps {
  cycleId: number;
  initialWeek: number;
}

export function WamView({ cycleId, initialWeek }: WamViewProps) {
  const [selectedWeek, setSelectedWeek] = useState(initialWeek);
  const [data, setData] = useState<WamReportDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User input states
  const [blockers, setBlockers] = useState("");
  const [whatWorked, setWhatWorked] = useState("");
  const [encouragement, setEncouragement] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchWamReport = useCallback(
    async (weekNum: number) => {
      try {
        setLoading(true);
        setError(null);
        const res = await apiFetch<WamReportDto>(
          `/api/cycles/${cycleId}/wam/${weekNum}`
        );
        setData(res);
        setBlockers(res.report?.blockers ?? "");
        setWhatWorked(res.report?.whatWorked ?? "");
        setEncouragement(res.report?.encouragement ?? "");
      } catch (err) {
        if (err instanceof ClientApiError) {
          setError(err.message);
        } else {
          setError("Failed to load WAM report.");
        }
      } finally {
        setLoading(false);
      }
    },
    [cycleId]
  );

  useEffect(() => {
    fetchWamReport(selectedWeek);
  }, [fetchWamReport, selectedWeek]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    const payload: WamSave = {
      blockers: blockers.trim() || undefined,
      whatWorked: whatWorked.trim() || undefined,
      encouragement: encouragement.trim() || undefined,
    };

    try {
      const res = await apiFetch<WamReportDto>(
        `/api/cycles/${cycleId}/wam/${selectedWeek}`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        }
      );
      setData(res);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      if (err instanceof ClientApiError) {
        setError(err.message);
      } else {
        setError("Failed to save report.");
      }
    } finally {
      setSaving(false);
    }
  };

  const formatLastSaved = (isoString?: string) => {
    if (!isoString) return null;
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return null;
    }
  };

  const exportUrl = `/api/cycles/${cycleId}/wam/${selectedWeek}/export`;

  return (
    <div className="space-y-6">
      {/* Week Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Select Week
          </span>
          <p className="text-xs text-slate-400">Review your past self-accountability reports or write this week&apos;s.</p>
        </div>
        <WeekPicker
          selectedWeek={selectedWeek}
          currentWeek={initialWeek}
          onSelectWeek={setSelectedWeek}
          disabled={loading || saving}
        />
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <div className="h-48 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-48 animate-pulse rounded-xl bg-slate-200" />
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* 1. Auto Report Component (Muted card) */}
          <AutoReport auto={data.auto} />

          {/* 2. User Input Section (White card) */}
          <form onSubmit={handleSave} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-baseline justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Your Honest Assessment</h3>
                <p className="text-xs text-slate-500">
                  No blame, no rationalization. Confront the reality of your execution.
                </p>
              </div>

              {data.report?.updatedAt && (
                <span className="text-[11px] text-slate-400">
                  Last saved: {formatLastSaved(data.report.updatedAt)}
                </span>
              )}
            </div>

            <WamField
              label="Blockers"
              placeholder="What's in the way? Name it without excuses."
              value={blockers}
              onChange={setBlockers}
              rows={2}
            />

            <WamField
              label="What worked"
              placeholder="Which actions produced results this week?"
              value={whatWorked}
              onChange={setWhatWorked}
              rows={2}
            />

            <WamField
              label="Encouragement / focus"
              placeholder="One line your future self needs to read."
              value={encouragement}
              onChange={setEncouragement}
              rows={2}
            />

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <a
                href={exportUrl}
                download
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export as Markdown
              </a>

              <div className="flex items-center gap-3">
                {saveSuccess && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Saved
                  </span>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50 transition"
                >
                  {saving ? "Saving..." : "Save report"}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
