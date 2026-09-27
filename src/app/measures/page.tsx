"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { MeasuresOverviewDto, ScoreBand } from "@/lib/contracts";
import { apiFetch, ClientApiError } from "@/components/common/api";
import { useI18n } from "@/context/SettingsContext";
import { getBandBadgeStyles, getBenchmarkLine } from "@/components/common/scoreUtils";
import { ScoreTrendChart } from "@/components/measures/ScoreTrendChart";
import { GoalMeasuresSection } from "@/components/measures/GoalMeasuresSection";

export default function MeasuresPage() {
  const { locale, t } = useI18n();
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
        setError(t("common.error"));
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
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {t("nav.measures")}
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Chỉ số kết quả (lag) và chỉ số dẫn dắt (lead) — ghi điểm, đối diện với sự thật.
            </p>
          </div>

          {data && (
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-zinc-900 dark:bg-zinc-100 px-3 py-1 text-xs font-semibold text-white dark:text-zinc-900">
                Tuần {data.currentWeek} / 12
              </span>
              {data.averageScore !== null && (
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${
                    getBandBadgeStyles(getBandFromScore(data.averageScore)).bg
                  } ${getBandBadgeStyles(getBandFromScore(data.averageScore)).text} ${
                    getBandBadgeStyles(getBandFromScore(data.averageScore)).border
                  }`}
                >
                  TB {data.averageScore}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* Verbatim benchmark banner */}
        <div className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 shadow-xs">
          <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            <strong className="text-zinc-900 dark:text-zinc-100">{getBenchmarkLine(locale)}</strong>
          </p>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="space-y-6">
          <div className="h-56 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-64 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
        </div>
      ) : notFound ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-12 text-center shadow-xs">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Chưa có dữ liệu đo lường</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Hãy tạo một chu kỳ trước để theo dõi điểm thực thi, chỉ số dẫn dắt và tiến độ kết quả.
          </p>
          <div className="mt-5">
            <Link
              href="/plan"
              className="inline-flex items-center rounded-lg bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
            >
              Đi tới Kế hoạch 12 tuần →
            </Link>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 p-6 text-center text-rose-800 dark:text-rose-200">
          <p className="font-semibold">Không thể tải dữ liệu đo lường</p>
          <p className="mt-1 text-sm">{error}</p>
          <button
            type="button"
            onClick={fetchMeasures}
            className="mt-4 rounded-lg bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-xs font-semibold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
          >
            {t("common.retry")}
          </button>
        </div>
      ) : data ? (
        <div className="space-y-8">
          {/* Score Trend Chart */}
          <ScoreTrendChart weeks={data.weeks} currentWeek={data.currentWeek} />

          {/* Goals and Measures Sections */}
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Mục tiêu &amp; Chỉ số đo lường</h2>
            {data.goals.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Chưa có mục tiêu nào trong chu kỳ này.</p>
                <Link href="/plan" className="mt-2 inline-block text-xs font-semibold text-zinc-900 dark:text-zinc-100 underline">
                  Thêm mục tiêu trong Trình tạo kế hoạch →
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
