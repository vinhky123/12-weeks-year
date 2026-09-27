"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { DashboardDto, CycleDto } from "@/lib/contracts";
import { apiFetch, ClientApiError } from "@/components/common/api";
import NextRitualCard from "@/components/dashboard/NextRitualCard";
import ScorePanel from "@/components/dashboard/ScorePanel";
import ScoreHistoryStrip from "@/components/dashboard/ScoreHistoryStrip";
import GoalCard from "@/components/dashboard/GoalCard";
import { ValleyBanner } from "@/components/dashboard/ValleyBanner";
import { useSettings } from "@/context/SettingsContext";
import { t } from "@/lib/i18n";

export default function DashboardPage() {
  const { locale } = useSettings();
  const [data, setData] = useState<DashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<DashboardDto>("/api/dashboard");
      setData(res);
    } catch (err) {
      if (err instanceof ClientApiError) {
        setError(err.message);
      } else {
        setError("Failed to load dashboard. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleStartCycle = async () => {
    if (!data?.cycle) return;
    try {
      setIsStarting(true);
      await apiFetch<CycleDto>(`/api/cycles/${data.cycle.id}/start`, {
        method: "POST",
      });
      await fetchDashboard();
    } catch (err) {
      if (err instanceof ClientApiError) {
        setError(err.message);
      } else {
        setError("Failed to start cycle.");
      }
    } finally {
      setIsStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-16 rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-32 rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-44 rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-28 rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
        <h3 className="font-bold">Error loading dashboard</h3>
        <p className="mt-1 text-sm">{error}</p>
        <button
          onClick={fetchDashboard}
          className="mt-4 rounded-lg bg-rose-700 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-800 transition dark:bg-rose-600 dark:hover:bg-rose-500"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data || data.phase === "no_cycle" || !data.cycle) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          A year is 12 weeks.
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm text-slate-600 dark:text-slate-400">
          Execution, not knowledge, is the gap. Break annualized thinking by creating your first 12-week cycle with 2–3 vital goals and daily/weekly tactics.
        </p>
        <div className="mt-8">
          <Link
            href="/plan"
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-xs hover:bg-slate-800 transition dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            Create your first cycle
          </Link>
        </div>
      </div>
    );
  }

  const { today, cycle, currentWeek, scoreHistory, averageScore, goals, nextRitual, dailyPrinciple, phase } = data;

  return (
    <div className="space-y-6">
      {/* Review mode banner */}
      {phase === "review" && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 text-purple-900 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300">
          <div className="flex items-center gap-2 font-bold">
            <span>🎉</span>
            <span>Week 13 — the year is complete. Celebrate, review, reload.</span>
          </div>
          <p className="mt-1 text-xs text-purple-700 dark:text-purple-400">
            Take time to celebrate what was accomplished.{" "}
            <Link href="/review" className="font-semibold underline">
              Open the Week 13 Review Wizard &rarr;
            </Link>
          </p>
        </div>
      )}

      {/* Header Row */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{cycle.name}</h1>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 uppercase tracking-wide dark:bg-slate-800 dark:text-slate-400">
              {cycle.status}
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              {today.weekLabel ?? `Week ${today.weekNumber}`}
            </span>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              &middot; {t(locale, "misc.days_left", { n: today.daysRemaining })}
            </span>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-xs text-slate-400 block font-medium uppercase dark:text-slate-500">
            Today
          </span>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {today.isoDate}
          </span>
        </div>
      </header>

      {/* Daily Principle Quote */}
      {dailyPrinciple && (
        <div className="rounded-lg bg-slate-100/80 px-4 py-2.5 border border-slate-200/60 text-xs italic text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300">
          &ldquo;{dailyPrinciple}&rdquo;
        </div>
      )}

      {/* Valley of Despair Banner (weeks 3–6 with avg < 70) */}
      <ValleyBanner valleyGuidance={data.valleyGuidance} />

      {/* Next Ritual Callout */}
      <NextRitualCard
        nextRitual={nextRitual}
        cycle={cycle}
        currentWeekNumber={today.weekNumber}
        onStartCycle={handleStartCycle}
        isStarting={isStarting}
      />

      {/* Score Panel */}
      <ScorePanel
        currentWeekNumber={today.weekNumber}
        currentScore={currentWeek?.score ?? null}
        averageScore={averageScore}
      />

      {/* 12-Week History Strip */}
      <ScoreHistoryStrip
        scoreHistory={scoreHistory}
        currentWeekNumber={today.weekNumber}
      />

      {/* Goals Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Goals ({goals.length}/3)
          </h2>
          <Link
            href="/plan"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition dark:text-slate-400 dark:hover:text-slate-200"
          >
            Edit 12-Week Plan &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {goals.map((goal) => (
            <GoalCard key={goal.id} {...goal} />
          ))}
        </div>
      </section>
    </div>
  );
}
