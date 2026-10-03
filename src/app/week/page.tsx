"use client";

import React, { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import type {
  ActiveCycleInfoDto,
  WeekPlanDetailDto,
  CycleDetailDto,
  CloseWeek,
} from "@/lib/contracts";
import { apiFetch, ClientApiError } from "@/components/common/api";
import { getBandBadgeStyles } from "@/components/common/scoreUtils";
import WeekBoard from "@/components/week/WeekBoard";
import AddItemModal from "@/components/week/AddItemModal";
import CloseWeekModal from "@/components/week/CloseWeekModal";
import { useSettings } from "@/context/SettingsContext";

function normalizeWeek(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 1 : Math.max(1, Math.min(12, parsed));
}

function weekRange(startDate: string, weekNumber: number): string {
  const start = new Date(`${startDate}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() + (weekNumber - 1) * 7);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return `${start.toISOString().slice(0, 10)} → ${end.toISOString().slice(0, 10)}`;
}

function WeekPageInner() {
  const { locale } = useSettings();
  const searchParams = useSearchParams();
  const router = useRouter();

  const queryWeek = searchParams.get("week");
  const queryClose = searchParams.get("close");

  const [activeCycle, setActiveCycle] = useState<ActiveCycleInfoDto | null>(null);
  const [cycleDetail, setCycleDetail] = useState<CycleDetailDto | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [planDetail, setPlanDetail] = useState<WeekPlanDetailDto | null>(null);
  const [isNotGenerated, setIsNotGenerated] = useState(false);
  const [activeLoading, setActiveLoading] = useState(true);
  const [planLoading, setPlanLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const activeRequestRef = useRef(0);
  const weekRequestRef = useRef(0);
  const previousWeekRef = useRef(selectedWeek);
  const selectionRef = useRef("none:1");

  selectionRef.current = `${activeCycle?.cycle.id ?? "none"}:${selectedWeek}`;

  // Loaders read the latest locale and ?week= so that neither change reloads the cycle.
  const localeRef = useRef(locale);
  const queryWeekRef = useRef(queryWeek);
  useEffect(() => {
    localeRef.current = locale;
    queryWeekRef.current = queryWeek;
  }, [locale, queryWeek]);

  // Fetch active cycle info
  const fetchActiveCycle = useCallback(async () => {
    const requestId = ++activeRequestRef.current;
    ++weekRequestRef.current;
    try {
      setActiveLoading(true);
      setPlanLoading(false);
      setError(null);
      setBannerError(null);
      setGenerating(false);
      setActiveCycle(null);
      setCycleDetail(null);
      setPlanDetail(null);
      setIsNotGenerated(false);
      const res = await apiFetch<ActiveCycleInfoDto>("/api/cycles/active");
      if (requestId !== activeRequestRef.current) return;

      const targetWeek = normalizeWeek(queryWeekRef.current, res.weekNumber);

      const detailRes = await apiFetch<CycleDetailDto>(`/api/cycles/${res.cycle.id}`);
      if (requestId !== activeRequestRef.current) return;
      setActiveCycle(res);
      setSelectedWeek(targetWeek);
      setCycleDetail(detailRes);
    } catch (err: unknown) {
      if (requestId !== activeRequestRef.current) return;
      if (err instanceof ClientApiError && err.status === 404) {
        setActiveCycle(null);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(localeRef.current === "vi" ? "Không thể tải chu kỳ hoạt động." : "Failed to load active cycle.");
      }
    } finally {
      if (requestId === activeRequestRef.current) setActiveLoading(false);
    }
  }, []);

  // Fetch week plan details
  const fetchWeekPlan = useCallback(async (cycleId: number, weekNum: number) => {
    const requestId = ++weekRequestRef.current;
    const selectionKey = `${cycleId}:${weekNum}`;
    try {
      setPlanLoading(true);
      setPlanDetail(null);
      setIsNotGenerated(false);
      setBannerError(null);
      const res = await apiFetch<WeekPlanDetailDto>(
        `/api/cycles/${cycleId}/weeks/${weekNum}`,
      );
      if (requestId !== weekRequestRef.current || selectionRef.current !== selectionKey) return;
      setPlanDetail(res);
    } catch (err: unknown) {
      if (requestId !== weekRequestRef.current || selectionRef.current !== selectionKey) return;
      if (err instanceof ClientApiError && err.status === 404) {
        setIsNotGenerated(true);
        setPlanDetail(null);
      } else if (err instanceof Error) {
        setBannerError(err.message);
      } else {
        setBannerError(localeRef.current === "vi" ? "Không thể tải kế hoạch tuần." : "Could not load the weekly plan.");
      }
    } finally {
      if (requestId === weekRequestRef.current && selectionRef.current === selectionKey) {
        setPlanLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchActiveCycle();
  }, [fetchActiveCycle]);

  useEffect(() => {
    if (activeCycle) {
      void fetchWeekPlan(activeCycle.cycle.id, selectedWeek);
    }
  }, [activeCycle, selectedWeek, fetchWeekPlan]);

  // Follow ?week= changes from the pager or browser history without reloading the cycle.
  useEffect(() => {
    if (activeCycle) setSelectedWeek(normalizeWeek(queryWeek, activeCycle.weekNumber));
  }, [activeCycle, queryWeek]);

  useEffect(() => {
    if (previousWeekRef.current !== selectedWeek) {
      previousWeekRef.current = selectedWeek;
      setShowAddModal(false);
      setShowCloseModal(false);
    }
  }, [selectedWeek]);

  useEffect(() => {
    const queryTargetsSelected = normalizeWeek(queryWeek, selectedWeek) === selectedWeek;
    const planMatchesSelection = Boolean(
      activeCycle
      && planDetail
      && planDetail.plan.cycleId === activeCycle.cycle.id
      && planDetail.plan.weekNumber === selectedWeek,
    );
    if (
      queryClose === "1"
      && queryTargetsSelected
      && planMatchesSelection
      && planDetail?.plan.status === "draft"
      && selectedWeek <= (activeCycle?.weekNumber ?? 0)
    ) {
      setShowCloseModal(true);
    }
  }, [queryClose, queryWeek, planDetail, activeCycle, selectedWeek]);

  const handleGenerate = async () => {
    if (!activeCycle) return;
    const selectionKey = `${activeCycle.cycle.id}:${selectedWeek}`;
    try {
      setGenerating(true);
      setBannerError(null);
      const res = await apiFetch<WeekPlanDetailDto>(
        `/api/cycles/${activeCycle.cycle.id}/weeks/${selectedWeek}/generate`,
        { method: "POST" },
      );
      if (selectionRef.current !== selectionKey) return;
      setPlanDetail(res);
      setIsNotGenerated(false);
    } catch (err: unknown) {
      if (selectionRef.current !== selectionKey) return;
      if (err instanceof ClientApiError) {
        setBannerError(err.message);
      } else {
        setBannerError(locale === "vi" ? "Không thể tạo kế hoạch tuần." : "Failed to generate week plan.");
      }
    } finally {
      if (selectionRef.current === selectionKey) setGenerating(false);
    }
  };

  const actionablePlan = (): WeekPlanDetailDto | null => {
    if (
      !activeCycle
      || !planDetail
      || planDetail.plan.cycleId !== activeCycle.cycle.id
      || planDetail.plan.weekNumber !== selectedWeek
      || normalizeWeek(queryWeek, selectedWeek) !== selectedWeek
    ) {
      return null;
    }
    return planDetail;
  };

  const actionError = (err: unknown, vi: string, en: string, selectionKey: string): Error => {
    const message = err instanceof ClientApiError && err.message ? err.message : locale === "vi" ? vi : en;
    if (selectionRef.current === selectionKey) setBannerError(message);
    return err instanceof Error ? err : new Error(message);
  };

  const handleAddItem = async (label: string, dayOfWeek: number) => {
    const plan = actionablePlan();
    if (!plan) throw new Error(locale === "vi" ? "Kế hoạch tuần đang được tải lại." : "The weekly plan is reloading.");
    const selectionKey = selectionRef.current;
    try {
      const res = await apiFetch<WeekPlanDetailDto>(
        `/api/week-plans/${plan.plan.id}/items`,
        {
          method: "POST",
          body: JSON.stringify({ label, dayOfWeek, confirmPlanRevision: true }),
        },
      );
      if (selectionRef.current === selectionKey) setPlanDetail(res);
    } catch (err: unknown) {
      throw actionError(err, "Không thể thêm công việc. Vui lòng thử lại.", "Could not add the task. Please try again.", selectionKey);
    }
  };

  const handleMoveDay = async (itemId: number, newDay: number) => {
    const plan = actionablePlan();
    if (!plan) throw new Error(locale === "vi" ? "Kế hoạch tuần đang được tải lại." : "The weekly plan is reloading.");
    const selectionKey = selectionRef.current;
    try {
      const res = await apiFetch<WeekPlanDetailDto>(
        `/api/week-plans/${plan.plan.id}/items/${itemId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ dayOfWeek: newDay }),
        },
      );
      if (selectionRef.current === selectionKey) setPlanDetail(res);
    } catch (err: unknown) {
      throw actionError(err, "Không thể chuyển công việc sang ngày khác.", "Could not move the task to another day.", selectionKey);
    }
  };

  const handleRename = async (itemId: number, newLabel: string) => {
    const plan = actionablePlan();
    if (!plan) throw new Error(locale === "vi" ? "Kế hoạch tuần đang được tải lại." : "The weekly plan is reloading.");
    const selectionKey = selectionRef.current;
    try {
      const res = await apiFetch<WeekPlanDetailDto>(
        `/api/week-plans/${plan.plan.id}/items/${itemId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ label: newLabel }),
        },
      );
      if (selectionRef.current === selectionKey) setPlanDetail(res);
    } catch (err: unknown) {
      throw actionError(err, "Không thể đổi tên công việc.", "Could not rename the task.", selectionKey);
    }
  };

  const handleRemove = async (itemId: number) => {
    const plan = actionablePlan();
    if (!plan) throw new Error(locale === "vi" ? "Kế hoạch tuần đang được tải lại." : "The weekly plan is reloading.");
    const selectionKey = selectionRef.current;
    try {
      const res = await apiFetch<WeekPlanDetailDto>(
        `/api/week-plans/${plan.plan.id}/items/${itemId}`,
        {
          method: "DELETE",
        },
      );
      if (selectionRef.current === selectionKey) setPlanDetail(res);
    } catch (err: unknown) {
      throw actionError(err, "Không thể xóa công việc.", "Could not remove the task.", selectionKey);
    }
  };

  const handleCloseSubmit = async (data: CloseWeek): Promise<WeekPlanDetailDto> => {
    const plan = actionablePlan();
    if (!plan) throw new Error(locale === "vi" ? "Kế hoạch tuần đang được tải lại." : "The weekly plan is reloading.");
    const selectionKey = selectionRef.current;
    const res = await apiFetch<WeekPlanDetailDto>(
      `/api/week-plans/${plan.plan.id}/close`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
    if (selectionRef.current === selectionKey) setPlanDetail(res);
    return res;
  };

  const handleWeekChange = (w: number) => {
    ++weekRequestRef.current;
    setShowAddModal(false);
    setShowCloseModal(false);
    setPlanDetail(null);
    setIsNotGenerated(false);
    setBannerError(null);
    setGenerating(false);
    setPlanLoading(true);
    setSelectedWeek(w);
    router.push(`/week?week=${w}`);
  };

  const handleCloseModalDismiss = () => {
    setShowCloseModal(false);
    router.replace(`/week?week=${selectedWeek}`);
  };

  if (activeLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-16 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-64 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
        <h3 className="font-bold">{locale === "vi" ? "Lỗi tải kế hoạch tuần" : "Error loading weekly plan"}</h3>
        <p className="mt-1 text-sm">{error}</p>
        <button
          onClick={fetchActiveCycle}
          className="mt-4 min-h-10 rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {locale === "vi" ? "Thử lại" : "Retry"}
        </button>
      </div>
    );
  }

  if (!activeCycle) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center shadow-xs sm:p-12 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {locale === "vi" ? "Chưa có chu kỳ hoạt động nào." : "No active cycle found."}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
          {locale === "vi"
            ? "Kế hoạch tuần được tạo tự động từ chu kỳ 12 tuần đang hoạt động. Hãy tạo và bắt đầu một chu kỳ trước."
            : "Weekly plans are generated from an active 12-week cycle. Create and start a cycle first."}
        </p>
        <div className="mt-6">
          <Link
            href="/plan"
            className="inline-flex min-h-10 items-center rounded-lg bg-zinc-900 px-5 text-sm font-semibold text-white shadow-xs transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {locale === "vi" ? "Tạo chu kỳ trước →" : "Create a cycle first →"}
          </Link>
        </div>
      </div>
    );
  }

  const queryMatchesSelected = normalizeWeek(queryWeek, selectedWeek) === selectedWeek;
  const currentPlan = queryMatchesSelected
    && planDetail?.plan.cycleId === activeCycle.cycle.id
    && planDetail.plan.weekNumber === selectedWeek
    ? planDetail
    : null;
  const isClosed = currentPlan?.plan.status === "closed";
  const score = currentPlan?.score;
  const bandStyles = getBandBadgeStyles(score?.band);
  const dateRange = currentPlan
    ? `${currentPlan.weekStart} → ${currentPlan.weekEnd}`
    : weekRange(activeCycle.cycle.startDate, selectedWeek);
  const isFutureWeek = selectedWeek > activeCycle.weekNumber;

  return (
    <div className="space-y-6">
      {bannerError && (
        <div role="alert" className="flex flex-col gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 sm:flex-row sm:items-center sm:justify-between dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
          <p className="text-sm font-medium">{bannerError}</p>
          <button
            onClick={() => setBannerError(null)}
            className="min-h-10 self-start rounded-lg px-3 text-sm font-semibold text-rose-700 hover:bg-rose-100 sm:self-auto dark:text-rose-300 dark:hover:bg-rose-900/40"
          >
            {locale === "vi" ? "Đóng" : "Dismiss"}
          </button>
        </div>
      )}

      {/* Week Header */}
      <header className="flex flex-col gap-5 border-b border-zinc-200 pb-5 lg:flex-row lg:items-end lg:justify-between dark:border-zinc-800">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {activeCycle.cycle.name}
            </span>
            {currentPlan && (
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${
                  isClosed
                    ? "bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-teal-50 text-teal-800 ring-1 ring-inset ring-teal-200 dark:bg-teal-950/50 dark:text-teal-200 dark:ring-teal-800"
                }`}
              >
                {isClosed ? (locale === "vi" ? "Đã chốt" : "closed") : (locale === "vi" ? "Bản nháp" : "draft")}
              </span>
            )}
            {score && (
              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                  isClosed
                    ? `${bandStyles.bg} ${bandStyles.text} ${bandStyles.border}`
                    : "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                }`}
              >
                {isClosed
                  ? `${locale === "vi" ? "Điểm chính thức" : "Final score"}: ${score.scorePct}%`
                  : `${locale === "vi" ? "Tiến độ tuần" : "Weekly progress"}: ${score.scorePct}%`}
              </span>
            )}
          </div>

          <div className="mt-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
              {locale === "vi" ? `Tuần ${selectedWeek}` : `Week ${selectedWeek}`}
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{dateRange}</p>
          </div>
        </div>

        {/* Week Switcher & Actions */}
        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
          {/* Week Selector 1-12 */}
          <div className="flex items-center rounded-md border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
            <button
              type="button"
              disabled={selectedWeek <= 1}
              onClick={() => handleWeekChange(selectedWeek - 1)}
              aria-label={locale === "vi" ? "Tuần trước" : "Previous week"}
              className="inline-flex size-10 items-center justify-center rounded text-xs font-bold text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              <span aria-hidden="true" className="text-xl leading-none">‹</span>
            </button>
            <span className="px-2 text-xs font-bold text-zinc-800 dark:text-zinc-200">
              {locale === "vi" ? `Tuần ${selectedWeek} / 12` : `Week ${selectedWeek} of 12`}
            </span>
            <button
              type="button"
              disabled={selectedWeek >= 12}
              onClick={() => handleWeekChange(selectedWeek + 1)}
              aria-label={locale === "vi" ? "Tuần sau" : "Next week"}
              className="inline-flex size-10 items-center justify-center rounded text-xs font-bold text-zinc-600 hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              <span aria-hidden="true" className="text-xl leading-none">›</span>
            </button>
          </div>

          {/* Action buttons */}
          {currentPlan && !isClosed && (
            <>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="min-h-10 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                {locale === "vi" ? "Thêm công việc" : "Add task"}
              </button>

              {!isFutureWeek && (
                <button
                  type="button"
                  onClick={() => setShowCloseModal(true)}
                  className="min-h-10 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white shadow-xs transition hover:bg-teal-800 dark:bg-teal-500 dark:text-zinc-950 dark:hover:bg-teal-400"
                >
                  {locale === "vi" ? `Chốt tuần ${selectedWeek}` : `Close week ${selectedWeek}`}
                </button>
              )}
            </>
          )}
        </div>
      </header>

      {/* Closed Banner */}
      {isClosed && (
        <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-zinc-800 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span>🔒</span>
            <span>{locale === "vi" ? `Tuần ${selectedWeek} đã chốt. Điểm số là chính thức.` : `Week ${selectedWeek} is closed. The score is final.`}</span>
          </div>
          {score && (
            <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
              {locale === "vi" ? "Điểm chính thức:" : "Final score:"} {score.scorePct}% ({score.completed}/{score.due})
            </span>
          )}
        </div>
      )}

      {currentPlan && !isClosed && isFutureWeek && (
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900 dark:border-teal-900/70 dark:bg-teal-950/40 dark:text-teal-100">
          {locale === "vi"
            ? `Bạn có thể chốt tuần ${selectedWeek} khi tuần đó trở thành tuần hiện tại.`
            : `You can close week ${selectedWeek} when it becomes the current week.`}
        </div>
      )}

      {/* Generate State */}
      {planLoading ? (
        <div className="animate-pulse rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 sm:p-10">
          <div className="h-5 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="mt-4 h-28 rounded bg-zinc-100 dark:bg-zinc-800/70" />
        </div>
      ) : isNotGenerated ? (
        <div className="space-y-4 rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center shadow-xs sm:p-12 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-xl dark:bg-zinc-800">
            📅
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {locale === "vi" ? `Tạo kế hoạch cho tuần ${selectedWeek}` : `Generate the plan for week ${selectedWeek}`}
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
              {locale === "vi"
                ? "Các chiến thuật đến hạn trong tuần này sẽ được đưa vào lịch tuần để bạn sắp xếp."
                : "Tactics due this week will be added to the weekly schedule for you to arrange."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="min-h-10 rounded-lg bg-teal-700 px-6 text-sm font-semibold text-white shadow-xs transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-500 dark:text-zinc-950 dark:hover:bg-teal-400"
          >
            {generating
              ? (locale === "vi" ? "Đang tạo…" : "Generating…")
              : (locale === "vi" ? `Tạo tuần ${selectedWeek}` : `Generate week ${selectedWeek}`)}
          </button>
        </div>
      ) : currentPlan ? (
        <WeekBoard
          weekStart={currentPlan.weekStart}
          items={currentPlan.items}
          isClosed={isClosed}
          onMoveDay={handleMoveDay}
          onRename={handleRename}
          onRemove={handleRemove}
        />
      ) : null}

      {/* Add Item Modal */}
      {currentPlan && !isClosed && (
        <AddItemModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddItem}
        />
      )}

      {/* Close Week Modal */}
      {currentPlan && (
        <CloseWeekModal
          isOpen={showCloseModal}
          onClose={handleCloseModalDismiss}
          planDetail={currentPlan}
          activeGoals={cycleDetail?.goals ?? []}
          currentCycleWeek={activeCycle.weekNumber}
          onCloseSubmit={handleCloseSubmit}
          onNavigateWeek={handleWeekChange}
        />
      )}
    </div>
  );
}

export default function WeekPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="h-16 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-64 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        </div>
      }
    >
      <WeekPageInner />
    </Suspense>
  );
}
