"use client";

import Link from "next/link";
import type { NextRitual, CycleDto } from "@/lib/contracts";
import { useSettings } from "@/context/SettingsContext";
import { t } from "@/lib/i18n";

interface NextRitualCardProps {
  nextRitual: NextRitual;
  cycle: CycleDto | null;
  currentWeekNumber: number;
  onStartCycle?: () => void;
  isStarting?: boolean;
}

export default function NextRitualCard({
  nextRitual,
  cycle,
  currentWeekNumber,
  onStartCycle,
  isStarting,
}: NextRitualCardProps) {
  const { locale } = useSettings();

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="inline-block text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
            Next Ritual
          </span>
          <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
            {getTitle(nextRitual, currentWeekNumber)}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {getDescription(nextRitual, currentWeekNumber)}
          </p>
        </div>

        <div className="shrink-0">
          {nextRitual === "create_cycle" && (
            <Link
              href="/plan"
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-slate-800 transition dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              {t(locale, "ritual.create_cycle")}
            </Link>
          )}

          {nextRitual === "start_cycle" && (
            <button
              onClick={onStartCycle}
              disabled={isStarting || !cycle}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-emerald-500 disabled:opacity-50 transition"
            >
              {isStarting ? "Starting..." : t(locale, "ritual.start_cycle")}
            </button>
          )}

          {nextRitual === "plan_week" && (
            <Link
              href="/week"
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-slate-800 transition dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              {t(locale, "ritual.plan_week", { n: currentWeekNumber })}
            </Link>
          )}

          {nextRitual === "close_last_week" && (
            <Link
              href="/week?close=1"
              className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-amber-500 transition"
            >
              {t(locale, "ritual.close_last_week", { n: Math.max(1, currentWeekNumber - 1) })}
            </Link>
          )}

          {nextRitual === "execute_today" && (
            <Link
              href="/today"
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-slate-800 transition dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              {t(locale, "ritual.execute_today")}
            </Link>
          )}

          {nextRitual === "review_mode" && (
            <div className="rounded-lg bg-purple-50 border border-purple-200 px-4 py-2 text-sm font-medium text-purple-700 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-300">
              {t(locale, "ritual.review_mode")}
            </div>
          )}

          {nextRitual === "await_week_end" && (
            <div className="rounded-lg bg-slate-100 border border-slate-200 px-4 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
              {t(locale, "ritual.await_week_end")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getTitle(ritual: NextRitual, week: number): string {
  switch (ritual) {
    case "create_cycle":
      return "Begin your 12-week journey";
    case "start_cycle":
      return "Plan is ready — start the year";
    case "plan_week":
      return `Plan Week ${week}`;
    case "close_last_week":
      return `Close Week ${Math.max(1, week - 1)}`;
    case "execute_today":
      return "Execute today";
    case "review_mode":
      return "Week 13 — the year is complete";
    case "await_week_end":
      return "Week closed";
  }
}

function getDescription(ritual: NextRitual, week: number): string {
  switch (ritual) {
    case "create_cycle":
      return "Define your 2–3 goals and vital tactics to establish the active cycle.";
    case "start_cycle":
      return "Activate the cycle to start day 1 and commence execution tracking.";
    case "plan_week":
      return "Rebuild your weekly plan fresh from the 12-Week Plan (~15 minutes).";
    case "close_last_week":
      return `Review Week ${Math.max(1, week - 1)} execution score, log lag numbers, and close.`;
    case "execute_today":
      return "Review today's tactics and mark completed achievements.";
    case "review_mode":
      return "Celebrate, review, reload. The full review wizard is available.";
    case "await_week_end":
      return "All tactics for this closed week are finalized. Prepare for the next cycle week.";
  }
}
