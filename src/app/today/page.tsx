"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { TodayDto, CompletionResultDto, WeekPlanItemDto } from "@/lib/contracts";
import { apiFetch, ClientApiError } from "@/components/common/api";
import PrincipleLine from "@/components/today/PrincipleLine";
import DaySection from "@/components/today/DaySection";
import ProjectedScoreBar from "@/components/today/ProjectedScoreBar";
import { useSettings } from "@/context/SettingsContext";
import { t } from "@/lib/i18n";

const EN_DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const VI_DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

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
        setError(locale === "vi" ? "Không thể tải trang Hôm nay." : "Failed to load today view.");
      }
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    fetchToday();
  }, [fetchToday]);

  const handleIncrement = async (item: WeekPlanItemDto) => {
    if (!data) return;

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
      setData(prevData);
      if (err instanceof ClientApiError) {
        showToast(err.message);
      } else {
        showToast(locale === "vi" ? "Không thể ghi nhận hoàn thành." : "Failed to record completion.");
      }
    } finally {
      setMutatingItemId(null);
    }
  };

  const handleDecrement = async (item: WeekPlanItemDto) => {
    if (!data) return;

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
      setData(prevData);
      if (err instanceof ClientApiError) {
        showToast(err.message);
      } else {
        showToast(locale === "vi" ? "Không thể hủy hoàn thành." : "Failed to remove completion.");
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
        <div className="h-16 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-12 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-64 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
        <h3 className="font-bold">{locale === "vi" ? "Lỗi tải trang Hôm nay" : "Error loading today view"}</h3>
        <p className="mt-1 text-sm">{error}</p>
        <button
          onClick={fetchToday}
          className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 transition dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {t(locale, "action.retry")}
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {t(locale, "today.no_active_week")}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
          {t(locale, "today.no_active_desc")}
        </p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <Link
            href="/week"
            className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-zinc-800 transition dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {t(locale, "today.plan_this_week")}
          </Link>
          <Link
            href="/"
            className="rounded-md border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            {t(locale, "today.go_to_dashboard")}
          </Link>
        </div>
      </div>
    );
  }

  const { date, weekNumber, weekLabel, dayIndexToday, days, planStatus, projectedScore, dailyPrinciple } = data;
  const isClosed = planStatus === "closed";
  const dayLabels = locale === "vi" ? VI_DAY_LABELS : EN_DAY_LABELS;

  return (
    <div className="space-y-6">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white shadow-lg animate-bounce dark:bg-zinc-100 dark:text-zinc-900">
          <span>⚠️</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Week Closed Banner */}
      {isClosed && (
        <div className="rounded-lg border border-zinc-300 bg-zinc-100 p-4 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
          <div className="flex items-center gap-2 font-bold">
            <span>🔒</span>
            <span>
              {t(locale, "today.week_closed_title", { n: weekNumber })}
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            {t(locale, "today.week_closed_desc")}
          </p>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {t(locale, "today.subtitle")}
          </span>
          <div className="mt-1 flex items-baseline gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
              {t(locale, "nav.today")}
            </h1>
            <span className="text-lg font-bold text-zinc-600 dark:text-zinc-400">
              {weekLabel ?? (locale === "vi" ? `Tuần ${weekNumber}` : `Week ${weekNumber}`)}
            </span>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-xs text-zinc-400 block font-medium uppercase dark:text-zinc-500">
            {locale === "vi" ? "Ngày" : "Date"}
          </span>
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{date}</span>
        </div>
      </header>

      {/* Daily Principle */}
      {dailyPrinciple && <PrincipleLine principle={dailyPrinciple} />}

      {/* Week Strip (7 Days) */}
      <div className="flex items-center gap-1.5 overflow-x-auto rounded-lg border border-zinc-200 bg-white p-2 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
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
                  ? "bg-zinc-900 text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-900"
                  : "hover:bg-zinc-100 text-zinc-700 dark:hover:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider">
                {dayLabels[d.dayOfWeek]}
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
