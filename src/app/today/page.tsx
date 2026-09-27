"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { TodayDto, CompletionResultDto, WeekPlanItemDto } from "@/lib/contracts";
import { apiFetch, ClientApiError } from "@/components/common/api";
import PrincipleLine from "@/components/today/PrincipleLine";
import DaySection from "@/components/today/DaySection";
import ProjectedScoreBar from "@/components/today/ProjectedScoreBar";
import { useSettings } from "@/context/SettingsContext";
import { t } from "@/lib/i18n";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function TodayPage() {
  const { locale } = useSettings();
  const [data, setData] = useState<TodayDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [mutatingItemId, setMutatingItemId] = useState<number | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchToday = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<TodayDto>("/api/today");
      setData(res);
    } catch (err) {
      if (err instanceof ClientApiError) {
        if (err.status === 404) {
          setData(null);
        } else {
          setError(err.message);
        }
      } else {
        setError("Failed to load today view.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchToday();
  }, [fetchToday]);

  const handleIncrement = async (item: WeekPlanItemDto) => {
    if (!data) return;

    // Plan revision items (tacticId === null) are local only in Phase 1
    if (item.tacticId === null) {
      setData((prev) => {
        if (!prev) return prev;
        const newDays = prev.days.map((d) => ({
          ...d,
          items: d.items.map((i) =>
            i.id === item.id ? { ...i, done: Math.min(i.plannedCount, i.done + 1) } : i,
          ),
        }));
        return { ...prev, days: newDays };
      });
      return;
    }

    setMutatingItemId(item.id);

    // Optimistic update
    const prevData = data;
    setData((prev) => {
      if (!prev) return prev;
      const newDays = prev.days.map((d) => ({
        ...d,
        items: d.items.map((i) =>
          i.id === item.id ? { ...i, done: i.done + 1 } : i,
        ),
      }));
      return { ...prev, days: newDays };
    });

    try {
      const res = await apiFetch<CompletionResultDto>("/api/completions", {
        method: "POST",
        body: JSON.stringify({
          tacticId: item.tacticId,
          weekNumber: data.weekNumber,
        }),
      });

      // Update state with confirmed values
      setData((prev) => {
        if (!prev) return prev;
        const newDays = prev.days.map((d) => ({
          ...d,
          items: d.items.map((i) =>
            i.tacticId === item.tacticId ? { ...i, done: res.done } : i,
          ),
        }));
        return {
          ...prev,
          days: newDays,
          projectedScore: res.projectedScore,
        };
      });
    } catch (err) {
      setData(prevData); // Rollback
      if (err instanceof ClientApiError) {
        showToast(err.message);
      } else {
        showToast("Failed to record completion.");
      }
    } finally {
      setMutatingItemId(null);
    }
  };

  const handleDecrement = async (item: WeekPlanItemDto) => {
    if (!data) return;

    // Plan revision items are local only in Phase 1
    if (item.tacticId === null) {
      setData((prev) => {
        if (!prev) return prev;
        const newDays = prev.days.map((d) => ({
          ...d,
          items: d.items.map((i) =>
            i.id === item.id ? { ...i, done: Math.max(0, i.done - 1) } : i,
          ),
        }));
        return { ...prev, days: newDays };
      });
      return;
    }

    setMutatingItemId(item.id);

    // Optimistic update
    const prevData = data;
    setData((prev) => {
      if (!prev) return prev;
      const newDays = prev.days.map((d) => ({
        ...d,
        items: d.items.map((i) =>
          i.id === item.id ? { ...i, done: Math.max(0, i.done - 1) } : i,
        ),
      }));
      return { ...prev, days: newDays };
    });

    try {
      const res = await apiFetch<CompletionResultDto>("/api/completions", {
        method: "DELETE",
        body: JSON.stringify({
          tacticId: item.tacticId,
          weekNumber: data.weekNumber,
        }),
      });

      setData((prev) => {
        if (!prev) return prev;
        const newDays = prev.days.map((d) => ({
          ...d,
          items: d.items.map((i) =>
            i.tacticId === item.tacticId ? { ...i, done: res.done } : i,
          ),
        }));
        return {
          ...prev,
          days: newDays,
          projectedScore: res.projectedScore,
        };
      });
    } catch (err) {
      setData(prevData); // Rollback
      if (err instanceof ClientApiError) {
        showToast(err.message);
      } else {
        showToast("Failed to remove completion.");
      }
    } finally {
      setMutatingItemId(null);
    }
  };

  const scrollToDay = (dayIndex: number) => {
    const el = document.getElementById(`day-section-${dayIndex}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-16 rounded-xl bg-slate-200" />
        <div className="h-12 rounded-xl bg-slate-200" />
        <div className="h-64 rounded-xl bg-slate-200" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
        <h3 className="font-bold">Error loading today view</h3>
        <p className="mt-1 text-sm">{error}</p>
        <button
          onClick={fetchToday}
          className="mt-4 rounded-lg bg-rose-700 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-800 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
        <h1 className="text-2xl font-bold text-slate-900">
          Today lives inside an execution week.
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
          There is no active execution week. Plan this week first to generate daily action items from your 12-Week Plan.
        </p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <Link
            href="/week"
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-slate-800 transition"
          >
            Plan this week
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { date, weekNumber, weekLabel, dayIndexToday, days, planStatus, projectedScore, dailyPrinciple } = data;
  const isClosed = planStatus === "closed";

  return (
    <div className="space-y-6">
      {/* Toast alert for 409 errors */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-rose-900 px-4 py-3 text-sm font-medium text-white shadow-lg animate-bounce">
          <span>⚠️</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Week Closed Banner */}
      {isClosed && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-center gap-2 font-bold">
            <span>🔒</span>
            <span>
              Week {weekNumber} is closed — the score is final. This is diagnosis, not judgment.
            </span>
          </div>
          <p className="mt-1 text-xs text-amber-700">
            Checkboxes are disabled for closed weeks. View completed accomplishments below.
          </p>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Daily Execution &middot; ~5 minutes
          </span>
          <div className="mt-1 flex items-baseline gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              {t(locale, "nav.today")}
            </h1>
            <span className="text-lg font-bold text-slate-600">
              {weekLabel ?? `Week ${weekNumber}`}
            </span>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-xs text-slate-400 block font-medium uppercase">
            Date
          </span>
          <span className="text-sm font-semibold text-slate-700">{date}</span>
        </div>
      </header>

      {/* Daily Principle */}
      {dailyPrinciple && <PrincipleLine principle={dailyPrinciple} />}

      {/* Week Strip (7 Days) */}
      <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xs">
        {days.map((d, index) => {
          const isToday = index === dayIndexToday;
          const completedCount = d.items.filter((i) => i.done >= i.plannedCount).length;
          const totalCount = d.items.length;

          return (
            <button
              key={d.dayOfWeek}
              type="button"
              onClick={() => scrollToDay(d.dayOfWeek)}
              className={`flex-1 min-w-[70px] rounded-lg py-2 px-1 text-center transition ${
                isToday
                  ? "bg-slate-900 text-white shadow-xs"
                  : "hover:bg-slate-100 text-slate-700"
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider">
                {DAY_LABELS[d.dayOfWeek]}
              </div>
              <div className="text-xs font-extrabold mt-0.5">
                {d.date.split("-").slice(1).join("/")}
              </div>
              <div className="text-[9px] mt-1 opacity-80">
                {completedCount}/{totalCount}
              </div>
            </button>
          );
        })}
      </div>

      {/* Day Sections */}
      <div className="space-y-4">
        {days.map((d) => (
          <DaySection
            key={d.dayOfWeek}
            dayOfWeek={d.dayOfWeek}
            date={d.date}
            items={d.items}
            isToday={d.dayOfWeek === dayIndexToday}
            isPast={d.dayOfWeek < dayIndexToday}
            isClosed={isClosed}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
            mutatingItemId={mutatingItemId}
          />
        ))}
      </div>

      {/* Projected Score Footer Bar */}
      <ProjectedScoreBar score={projectedScore} />
    </div>
  );
}
