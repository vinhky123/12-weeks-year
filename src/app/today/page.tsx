"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import type { TodayDto, CompletionResultDto, WeekPlanItemDto } from "@/lib/contracts";
import { apiFetch, ClientApiError } from "@/components/common/api";
import PrincipleLine from "@/components/today/PrincipleLine";
import DaySection from "@/components/today/DaySection";
import ProjectedScoreBar from "@/components/today/ProjectedScoreBar";
import { useSettings } from "@/context/SettingsContext";
import { t } from "@/lib/i18n";

/** Earlier-day items still unfinished when Today loads; they keep their section until the next load. */
function unfinishedEarlierIds(today: TodayDto): ReadonlySet<number> {
  return new Set(
    today.days
      .filter((day) => day.dayOfWeek < today.dayIndexToday)
      .flatMap((day) => day.items)
      .filter((item) => item.done < item.plannedCount)
      .map((item) => item.id),
  );
}

export default function TodayPage() {
  const { locale } = useSettings();
  const [data, setData] = useState<TodayDto | null>(null);
  const [earlierItemIds, setEarlierItemIds] = useState<ReadonlySet<number>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [mutatingItemId, setMutatingItemId] = useState<number | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mutationPendingRef = useRef(false);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => () => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
  }, []);

  const fetchToday = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<TodayDto>("/api/today");
      setEarlierItemIds(unfinishedEarlierIds(res));
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
    if (!data || mutationPendingRef.current || item.tacticId === null || item.done >= item.plannedCount) return;

    mutationPendingRef.current = true;
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
      mutationPendingRef.current = false;
      setMutatingItemId(null);
    }
  };

  const handleDecrement = async (item: WeekPlanItemDto) => {
    if (!data || mutationPendingRef.current || item.tacticId === null || item.done <= 0) return;

    mutationPendingRef.current = true;
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
      mutationPendingRef.current = false;
      setMutatingItemId(null);
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
      <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
        <h3 className="font-bold">{locale === "vi" ? "Lỗi tải trang Hôm nay" : "Error loading today view"}</h3>
        <p className="mt-1 text-sm">{error}</p>
        <button
          onClick={fetchToday}
          className="mt-4 min-h-10 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {t(locale, "action.retry")}
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-center shadow-xs sm:p-12 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {t(locale, "today.no_active_week")}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
          {t(locale, "today.no_active_desc")}
        </p>
        <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Link
            href="/week"
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {t(locale, "today.plan_this_week")}
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            {t(locale, "today.go_to_dashboard")}
          </Link>
        </div>
      </div>
    );
  }

  const { date, weekNumber, weekLabel, dayIndexToday, days, planStatus, projectedScore, dailyPrinciple } = data;
  const isClosed = planStatus === "closed";
  const todayDay = days.find((day) => day.dayOfWeek === dayIndexToday) ?? {
    dayOfWeek: dayIndexToday,
    date,
    items: [],
  };
  const earlierDays = days
    .filter((day) => day.dayOfWeek < dayIndexToday)
    .map((day) => ({ ...day, items: day.items.filter((item) => earlierItemIds.has(item.id)) }))
    .filter((day) => day.items.length > 0);
  const restDays = days
    .filter((day) => day.dayOfWeek !== dayIndexToday)
    .map((day) => ({
      ...day,
      items: day.dayOfWeek < dayIndexToday
        ? day.items.filter((item) => !earlierItemIds.has(item.id))
        : day.items,
    }))
    .filter((day) => day.dayOfWeek > dayIndexToday || day.items.length > 0);
  const displayDate = new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00`));
  const headerWeekDay = locale === "vi"
    ? `Tuần ${weekNumber} · Ngày ${dayIndexToday + 1}`
    : `${weekLabel ?? `Week ${weekNumber}`} · Day ${dayIndexToday + 1}`;

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div role="alert" className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-sm rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white shadow-lg sm:inset-x-auto sm:right-6 sm:mx-0 dark:bg-zinc-100 dark:text-zinc-900">
          {toastMessage}
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        {mutatingItemId !== null ? (locale === "vi" ? "Đang lưu thay đổi." : "Saving change.") : ""}
      </p>

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

      <header className="flex flex-col gap-3 border-b border-zinc-200 pb-5 sm:flex-row sm:items-end sm:justify-between dark:border-zinc-800">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {t(locale, "today.subtitle")}
          </span>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">{t(locale, "nav.today")}</h1>
          <p className="mt-1 text-sm font-medium capitalize text-zinc-600 dark:text-zinc-400">{displayDate}</p>
        </div>
        <Link href={`/week?week=${weekNumber}`} className="inline-flex min-h-10 items-center self-start rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 hover:border-teal-600 hover:text-teal-700 sm:self-auto dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-teal-400 dark:hover:text-teal-300">
          {headerWeekDay}
        </Link>
      </header>

      <section aria-labelledby="today-work-heading" className="space-y-3">
        <h2 id="today-work-heading" className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{locale === "vi" ? "Việc hôm nay" : "Today’s work"}</h2>
        <DaySection
          dayOfWeek={todayDay.dayOfWeek}
          date={todayDay.date}
          items={todayDay.items}
          isToday
          isClosed={isClosed}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
          mutatingItemId={mutatingItemId}
          sectionId={`today-day-${todayDay.dayOfWeek}`}
        />
      </section>

      <section aria-labelledby="earlier-work-heading" className="space-y-3">
        <div>
          <h2 id="earlier-work-heading" className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{locale === "vi" ? "Chưa xong từ đầu tuần" : "Earlier this week"}</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{locale === "vi" ? "Việc chưa hoàn thành từ những ngày trước." : "Unfinished earlier work."}</p>
        </div>
        {earlierDays.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">{locale === "vi" ? "Không có việc nào còn dang dở." : "No unfinished earlier work."}</p>
        ) : earlierDays.map((day) => (
          <DaySection
            key={day.dayOfWeek}
            dayOfWeek={day.dayOfWeek}
            date={day.date}
            items={day.items}
            isToday={false}
            isClosed={isClosed}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
            mutatingItemId={mutatingItemId}
            sectionId={`earlier-day-${day.dayOfWeek}`}
          />
        ))}
      </section>

      <details className="rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/40">
        <summary role="button" className="flex min-h-12 cursor-pointer items-center justify-between rounded-xl px-4 py-3 text-base font-bold text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800">
          <span>{locale === "vi" ? "Phần còn lại của tuần" : "Rest of week"}</span>
          <span aria-hidden="true" className="text-sm font-medium text-zinc-500">{restDays.length}</span>
        </summary>
        <div className="space-y-3 px-3 pb-3">
          {restDays.length === 0 ? (
            <p className="p-3 text-sm text-zinc-500 dark:text-zinc-400">{locale === "vi" ? "Không còn việc nào khác trong tuần." : "No other work this week."}</p>
          ) : restDays.map((day) => (
            <DaySection
              key={day.dayOfWeek}
              dayOfWeek={day.dayOfWeek}
              date={day.date}
              items={day.items}
              isToday={false}
              isClosed={isClosed}
              onIncrement={handleIncrement}
              onDecrement={handleDecrement}
              mutatingItemId={mutatingItemId}
              sectionId={`rest-day-${day.dayOfWeek}`}
            />
          ))}
        </div>
      </details>

      <ProjectedScoreBar score={projectedScore} isClosed={isClosed} />
      {dailyPrinciple && <PrincipleLine principle={dailyPrinciple} />}
    </div>
  );
}
