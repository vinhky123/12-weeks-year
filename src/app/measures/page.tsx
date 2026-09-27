"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { MeasuresOverviewDto, ScoreBand } from "@/lib/contracts";
import { apiFetch, ClientApiError } from "@/components/common/api";
import { getBandBadgeStyles, BENCHMARK_LINE } from "@/components/common/scoreUtils";
import { ScoreTrendChart } from "@/components/measures/ScoreTrendChart";
import { GoalMeasuresSection } from "@/components/measures/GoalMeasuresSection";

export default function MeasuresPage() {
  const [data, setData] = useState<MeasuresOverviewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMeasures = async () => {
    try {
      setLoading(true);
      setError(null);
      setNotFound(false);
      const res = await apiFetch<MeasuresOverviewDto>("/api/measures");
      setData(res);
    } catch (err) {
      if (err instanceof ClientApiError) {
        if (err.status === 404) {
          setNotFound(true);
        } else {
          setError(err.message);
        }
      } else {
        setError("Failed to load measures data.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeasures();
  }, []);

  const getBandFromScore = (score: number | null): ScoreBand | null => {
    if (score === null) return null;
    if (score >= 85) return "ON_TRACK";
    if (score >= 65) return "AT_RISK";
    return "REVISE_PLAN";
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-baseline">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Measures</h1>
            <p className="mt-1 text-sm text-slate-500">
              Lag and lead indicators — keeping score, confronting the truth.
            </p>
          </div>

          {data && (
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                Week {data.currentWeek} of 12
              </span>
              {data.averageScore !== null && (
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${
                    getBandBadgeStyles(getBandFromScore(data.averageScore)).bg
                  } ${getBandBadgeStyles(getBandFromScore(data.averageScore)).text} ${
                    getBandBadgeStyles(getBandFromScore(data.averageScore)).border
                  }`}
                >
                  Avg {data.averageScore}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* Verbatim benchmark banner */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <p className="text-xs font-medium text-slate-700">
            <strong className="text-slate-900">{BENCHMARK_LINE}</strong>
          </p>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="space-y-6">
          <div className="h-56 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-64 animate-pulse rounded-xl bg-slate-200" />
        </div>
      ) : notFound ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
          <h2 className="text-base font-bold text-slate-900">Nothing to measure yet</h2>
          <p className="mt-1 text-sm text-slate-500">
            Create a cycle first to track execution scores, lead indicators, and lag progress.
          </p>
          <div className="mt-5">
            <Link
              href="/plan"
              className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Go to 12-Week Plan →
            </Link>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800">
          <p className="font-semibold">Unable to load measures</p>
          <p className="mt-1 text-sm">{error}</p>
          <button
            type="button"
            onClick={fetchMeasures}
            className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      ) : data ? (
        <div className="space-y-8">
          {/* Score Trend Chart */}
          <ScoreTrendChart weeks={data.weeks} currentWeek={data.currentWeek} />

          {/* Goals and Measures Sections */}
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-900">Goals &amp; Indicators</h2>
            {data.goals.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
                <p className="text-sm text-slate-500">No active goals found in this cycle.</p>
                <Link href="/plan" className="mt-2 inline-block text-xs font-semibold text-slate-900 underline">
                  Add goals in the Plan Builder →
                </Link>
              </div>
            ) : (
              data.goals.map((goalData) => (
                <GoalMeasuresSection
                  key={goalData.goal.id}
                  goalData={goalData}
                  currentWeek={data.currentWeek}
                />
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
