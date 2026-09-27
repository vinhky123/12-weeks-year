"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
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

function WeekPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const queryWeek = searchParams.get("week");
  const queryClose = searchParams.get("close");

  const [activeCycle, setActiveCycle] = useState<ActiveCycleInfoDto | null>(null);
  const [cycleDetail, setCycleDetail] = useState<CycleDetailDto | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [planDetail, setPlanDetail] = useState<WeekPlanDetailDto | null>(null);
  const [isNotGenerated, setIsNotGenerated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(queryClose === "1");

  // Fetch active cycle info
  const fetchActiveCycle = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<ActiveCycleInfoDto>("/api/cycles/active");
      setActiveCycle(res);

      const targetWeek = queryWeek ? parseInt(queryWeek, 10) : res.weekNumber;
      setSelectedWeek(isNaN(targetWeek) ? 1 : Math.max(1, Math.min(12, targetWeek)));

      // Also get goals for the cycle
      const detailRes = await apiFetch<CycleDetailDto>(`/api/cycles/${res.cycle.id}`);
      setCycleDetail(detailRes);
    } catch (err: unknown) {
      if (err instanceof ClientApiError && err.status === 404) {
        setActiveCycle(null);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load active cycle.");
      }
    } finally {
      setLoading(false);
    }
  }, [queryWeek]);

  // Fetch week plan details whenever activeCycle or selectedWeek changes
  const fetchWeekPlan = useCallback(async (cycleId: number, weekNum: number) => {
    try {
      setLoading(true);
      setIsNotGenerated(false);
      setBannerError(null);
      const res = await apiFetch<WeekPlanDetailDto>(
        `/api/cycles/${cycleId}/weeks/${weekNum}`,
      );
      setPlanDetail(res);
    } catch (err: unknown) {
      if (err instanceof ClientApiError && err.status === 404) {
        setIsNotGenerated(true);
        setPlanDetail(null);
      } else if (err instanceof Error) {
        setBannerError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveCycle();
  }, [fetchActiveCycle]);

  useEffect(() => {
    if (activeCycle) {
      fetchWeekPlan(activeCycle.cycle.id, selectedWeek);
    }
  }, [activeCycle, selectedWeek, fetchWeekPlan]);

  useEffect(() => {
    if (queryClose === "1" && planDetail && planDetail.plan.status === "draft") {
      setShowCloseModal(true);
    }
  }, [queryClose, planDetail]);

  const handleGenerate = async () => {
    if (!activeCycle) return;
    try {
      setGenerating(true);
      setBannerError(null);
      const res = await apiFetch<WeekPlanDetailDto>(
        `/api/cycles/${activeCycle.cycle.id}/weeks/${selectedWeek}/generate`,
        { method: "POST" },
      );
      setPlanDetail(res);
      setIsNotGenerated(false);
    } catch (err: unknown) {
      if (err instanceof ClientApiError) {
        setBannerError(err.message);
      } else {
        setBannerError("Failed to generate weekly plan.");
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleMoveDay = async (itemId: number, dayOfWeek: number) => {
    if (!planDetail) return;
    try {
      const res = await apiFetch<WeekPlanDetailDto>(
        `/api/week-plans/${planDetail.plan.id}/items/${itemId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ dayOfWeek }),
        },
      );
      setPlanDetail(res);
    } catch (err: unknown) {
      if (err instanceof ClientApiError) {
        setBannerError(err.message);
      }
    }
  };

  const handleRename = async (itemId: number, label: string) => {
    if (!planDetail) return;
    try {
      const res = await apiFetch<WeekPlanDetailDto>(
        `/api/week-plans/${planDetail.plan.id}/items/${itemId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ label }),
        },
      );
      setPlanDetail(res);
    } catch (err: unknown) {
      if (err instanceof ClientApiError) {
        setBannerError(err.message);
      }
    }
  };

  const handleRemove = async (itemId: number) => {
    if (!planDetail) return;
    try {
      const res = await apiFetch<WeekPlanDetailDto>(
        `/api/week-plans/${planDetail.plan.id}/items/${itemId}`,
        {
          method: "DELETE",
        },
      );
      setPlanDetail(res);
    } catch (err: unknown) {
      if (err instanceof ClientApiError) {
        setBannerError(err.message);
      }
    }
  };

  const handleAddItem = async (label: string, dayOfWeek: number) => {
    if (!planDetail) return;
    try {
      const res = await apiFetch<WeekPlanDetailDto>(
        `/api/week-plans/${planDetail.plan.id}/items`,
        {
          method: "POST",
          body: JSON.stringify({
            label,
            dayOfWeek,
            confirmPlanRevision: true,
          }),
        },
      );
      setPlanDetail(res);
    } catch (err: unknown) {
      if (err instanceof ClientApiError) {
        setBannerError(err.message);
      }
      throw err;
    }
  };

  const handleCloseSubmit = async (data: CloseWeek): Promise<WeekPlanDetailDto> => {
    if (!planDetail) throw new Error("No active week plan");
    const res = await apiFetch<WeekPlanDetailDto>(
      `/api/week-plans/${planDetail.plan.id}/close`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
    setPlanDetail(res);
    return res;
  };

  const handleWeekChange = (w: number) => {
    setSelectedWeek(w);
    router.push(`/week?week=${w}`);
  };

  if (loading && !planDetail && !isNotGenerated && !activeCycle) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-16 rounded-xl bg-slate-200" />
        <div className="h-64 rounded-xl bg-slate-200" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
        <h3 className="font-bold">Error loading weekly plan</h3>
        <p className="mt-1 text-sm">{error}</p>
        <button
          onClick={fetchActiveCycle}
          className="mt-4 rounded-lg bg-rose-700 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-800 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!activeCycle) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
        <h1 className="text-2xl font-bold text-slate-900">
          No active cycle found.
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
          Weekly plans are generated from an active 12-week cycle. Create and start a cycle first.
        </p>
        <div className="mt-6">
          <Link
            href="/plan"
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-slate-800 transition"
          >
            Create a cycle first &rarr;
          </Link>
        </div>
      </div>
    );
  }

  const isClosed = planDetail?.plan.status === "closed";
  const score = planDetail?.score;
  const bandStyles = getBandBadgeStyles(score?.band);

  return (
    <div className="space-y-6">
      {bannerError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 flex items-center justify-between">
          <p className="text-sm font-medium">{bannerError}</p>
          <button
            onClick={() => setBannerError(null)}
            className="text-xs font-bold text-rose-600 hover:text-rose-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Week Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {activeCycle.cycle.name}
            </span>
            {planDetail && (
              <span
                className={`rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                  isClosed
                    ? "bg-slate-900 text-white"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {planDetail.plan.status}
              </span>
            )}
            {score && (
              <span
                className={`rounded px-2 py-0.5 text-[11px] font-bold border ${bandStyles.bg} ${bandStyles.text} ${bandStyles.border}`}
              >
                {score.scorePct}% {score.band}
              </span>
            )}
          </div>

          <div className="mt-1 flex items-baseline gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Week {selectedWeek}
            </h1>
            {planDetail && (
              <span className="text-xs font-medium text-slate-500">
                {planDetail.weekStart} &rarr; {planDetail.weekEnd}
              </span>
            )}
          </div>
        </div>

        {/* Week Switcher & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Week Selector 1-12 */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              disabled={selectedWeek <= 1}
              onClick={() => handleWeekChange(selectedWeek - 1)}
              className="px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded disabled:opacity-30"
              title="Previous Week"
            >
              ◀
            </button>
            <span className="px-2 text-xs font-bold text-slate-800">
              Week {selectedWeek} of 12
            </span>
            <button
              type="button"
              disabled={selectedWeek >= 12}
              onClick={() => handleWeekChange(selectedWeek + 1)}
              className="px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded disabled:opacity-30"
              title="Next Week"
            >
              ▶
            </button>
          </div>

          {/* Action buttons */}
          {planDetail && !isClosed && (
            <>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                + Add Task
              </button>

              <button
                type="button"
                onClick={() => setShowCloseModal(true)}
                className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-500 transition"
              >
                Close week {selectedWeek}
              </button>
            </>
          )}
        </div>
      </header>

      {/* Closed Banner */}
      {isClosed && (
        <div className="rounded-xl border border-slate-200 bg-slate-100 p-4 text-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span>🔒</span>
            <span>Week {selectedWeek} is closed — the score is final.</span>
          </div>
          {score && (
            <span className="text-xs font-bold text-slate-600">
              Final score: {score.scorePct}% ({score.completed}/{score.due})
            </span>
          )}
        </div>
      )}

      {/* Generate State */}
      {isNotGenerated ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl">
            📅
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Generated fresh from your 12-Week Plan — never copy-pasted.
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
              This week&rsquo;s plan is generated from your 12-Week Plan — every tactic due this week becomes an item. It takes ~15 minutes.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50 transition"
          >
            {generating ? "Generating..." : `Generate week ${selectedWeek}`}
          </button>
        </div>
      ) : planDetail ? (
        /* 7-Day Board */
        <WeekBoard
          weekStart={planDetail.weekStart}
          items={planDetail.items}
          isClosed={isClosed}
          onMoveDay={handleMoveDay}
          onRename={handleRename}
          onRemove={handleRemove}
        />
      ) : null}

      {/* Add Item Modal */}
      {planDetail && !isClosed && (
        <AddItemModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddItem}
        />
      )}

      {/* Close Week Modal */}
      {planDetail && (
        <CloseWeekModal
          isOpen={showCloseModal}
          onClose={() => setShowCloseModal(false)}
          planDetail={planDetail}
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
          <div className="h-16 rounded-xl bg-slate-200" />
          <div className="h-64 rounded-xl bg-slate-200" />
        </div>
      }
    >
      <WeekPageInner />
    </Suspense>
  );
}
