"use client";

import React from "react";
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
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="inline-block text-xs font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
            {t(locale, "ritual.next_ritual")}
          </span>
          <h2 className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {getTitle(nextRitual, currentWeekNumber, locale)}
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {getDescription(nextRitual, currentWeekNumber, locale)}
          </p>
        </div>

        <div className="shrink-0">
          {nextRitual === "create_cycle" && (
            <Link
              href="/plan"
              className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-zinc-800 transition dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              {t(locale, "ritual.create_cycle")}
            </Link>
          )}

          {nextRitual === "start_cycle" && (
            <button
              onClick={onStartCycle}
              disabled={isStarting || !cycle}
              className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-zinc-800 disabled:opacity-50 transition dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              {isStarting ? (locale === "vi" ? "Đang bắt đầu..." : "Starting...") : t(locale, "ritual.start_cycle")}
            </button>
          )}

          {nextRitual === "plan_week" && (
            <Link
              href="/week"
              className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-zinc-800 transition dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              {t(locale, "ritual.plan_week", { n: currentWeekNumber })}
            </Link>
          )}

          {nextRitual === "close_last_week" && (
            <Link
              href={`/week?week=${Math.max(1, currentWeekNumber - 1)}&close=1`}
              className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-zinc-800 transition dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              {getTitle(nextRitual, currentWeekNumber, locale)}
            </Link>
          )}

          {nextRitual === "execute_today" && (
            <Link
              href="/today"
              className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-zinc-800 transition dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              {t(locale, "ritual.execute_today")}
            </Link>
          )}

          {nextRitual === "review_mode" && (
            <div className="rounded-lg bg-zinc-100 border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100">
              {t(locale, "ritual.review_mode")}
            </div>
          )}

          {nextRitual === "await_week_end" && (
            <div className="rounded-lg bg-zinc-100 border border-zinc-200 px-4 py-2 text-sm text-zinc-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300">
              {t(locale, "ritual.await_week_end")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getTitle(ritual: NextRitual, week: number, locale: string): string {
  if (locale === "vi") {
    switch (ritual) {
      case "create_cycle":
        return "Bắt đầu hành trình 12 tuần của bạn";
      case "start_cycle":
        return "Kế hoạch đã sẵn sàng — bắt đầu năm mới";
      case "plan_week":
        return `Lập kế hoạch Tuần ${week}`;
      case "close_last_week":
        return `Chốt Tuần ${Math.max(1, week - 1)}`;
      case "execute_today":
        return "Thực thi hôm nay";
      case "review_mode":
        return "Tuần 13 — năm đã hoàn thành";
      case "await_week_end":
        return "Tuần đã chốt";
    }
  }

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

function getDescription(ritual: NextRitual, week: number, locale: string): string {
  if (locale === "vi") {
    switch (ritual) {
      case "create_cycle":
        return "Xác định 1–3 mục tiêu và các hành động chiến lược để kích hoạt chu kỳ.";
      case "start_cycle":
        return "Kích hoạt chu kỳ để bắt đầu ngày đầu tiên và theo dõi thực thi.";
      case "plan_week":
        return "Tái thiết lập kế hoạch tuần mới từ Kế hoạch 12 tuần (~15 phút).";
      case "close_last_week":
        return `Xem lại điểm số thực thi Tuần ${Math.max(1, week - 1)}, ghi nhận số liệu kết quả và đóng tuần.`;
      case "execute_today":
        return "Xem các hành động hôm nay và đánh dấu thành tựu đã hoàn thành.";
      case "review_mode":
        return "Ăn mừng, nhìn lại, khởi động lại. Mở toàn bộ trình hướng dẫn đánh giá.";
      case "await_week_end":
        return "Mọi hành động trong tuần đã được khóa. Chuẩn bị cho tuần tiếp theo.";
    }
  }

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
