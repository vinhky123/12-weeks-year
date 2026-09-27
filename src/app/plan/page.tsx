"use client";

import React, { useEffect, useState, useCallback } from "react";
import type {
  CycleDto,
  CycleDetailDto,
  ActiveCycleInfoDto,
  GoalCreate,
  TacticCreate,
} from "@/lib/contracts";
import { apiFetch, ClientApiError } from "@/components/common/api";
import CycleBar from "@/components/plan/CycleBar";
import GoalCard from "@/components/plan/GoalCard";
import GoalModal from "@/components/plan/GoalModal";
import { CommitmentCard } from "@/components/plan/CommitmentCard";
import { useSettings } from "@/context/SettingsContext";

export default function PlanPage() {
  const { locale } = useSettings();
  const [cycle, setCycle] = useState<CycleDto | null>(null);
  const [detail, setDetail] = useState<CycleDetailDto | null>(null);
  const [currentWeekNumber, setCurrentWeekNumber] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const fetchPlanData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setBannerError(null);

      let targetCycleId: number | null = null;
      let activeWeek = 1;

      // 1. Try to get active cycle
      try {
        const activeRes = await apiFetch<ActiveCycleInfoDto>("/api/cycles/active");
        targetCycleId = activeRes.cycle.id;
        activeWeek = activeRes.weekNumber;
        setCycle(activeRes.cycle);
      } catch (err: unknown) {
        if (err instanceof ClientApiError && err.status === 404) {
          // No active cycle, look for planning cycles
          const allCycles = await apiFetch<CycleDto[]>("/api/cycles");
          const planning = allCycles.find((c) => c.status === "planning") ?? allCycles[0];
          if (planning) {
            targetCycleId = planning.id;
            setCycle(planning);
          } else {
            setCycle(null);
            setDetail(null);
            return;
          }
        } else {
          throw err;
        }
      }

      setCurrentWeekNumber(activeWeek);

      // 2. Fetch cycle detail
      if (targetCycleId) {
        const detailRes = await apiFetch<CycleDetailDto>(`/api/cycles/${targetCycleId}`);
        setDetail(detailRes);
      }
    } catch (err: unknown) {
      if (err instanceof ClientApiError) {
        setError(err.message);
      } else {
        setError(locale === "vi" ? "Không thể tải Kế hoạch 12 tuần." : "Failed to load 12-Week Plan.");
      }
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    fetchPlanData();
  }, [fetchPlanData]);

  const handleCreateCycle = async (name: string, startDate?: string) => {
    try {
      const created = await apiFetch<CycleDto>("/api/cycles", {
        method: "POST",
        body: JSON.stringify({ name, startDate }),
      });
      setCycle(created);
      await fetchPlanData();
    } catch (err: unknown) {
      if (err instanceof ClientApiError) {
        setBannerError(err.message);
      } else {
        setBannerError(locale === "vi" ? "Không thể tạo chu kỳ." : "Failed to create cycle.");
      }
    }
  };

  const handleStartCycle = async (id: number) => {
    try {
      await apiFetch<CycleDto>(`/api/cycles/${id}/start`, {
        method: "POST",
      });
      await fetchPlanData();
    } catch (err: unknown) {
      if (err instanceof ClientApiError) {
        setBannerError(err.message);
      } else {
        setBannerError(locale === "vi" ? "Không thể bắt đầu chu kỳ." : "Failed to start cycle.");
      }
    }
  };

  const handleAddGoal = async (data: GoalCreate) => {
    if (!cycle) return;
    try {
      await apiFetch(`/api/cycles/${cycle.id}/goals`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      await fetchPlanData();
    } catch (err: unknown) {
      if (err instanceof ClientApiError) {
        setBannerError(err.message);
      }
      throw err;
    }
  };

  const handleDropGoal = async (goalId: number) => {
    try {
      await apiFetch(`/api/goals/${goalId}`, {
        method: "DELETE",
      });
      await fetchPlanData();
    } catch (err: unknown) {
      if (err instanceof ClientApiError) {
        setBannerError(err.message);
      }
    }
  };

  const handleAddTactic = async (goalId: number, data: TacticCreate) => {
    try {
      await apiFetch(`/api/goals/${goalId}/tactics`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      await fetchPlanData();
    } catch (err: unknown) {
      if (err instanceof ClientApiError) {
        setBannerError(err.message);
      }
      throw err;
    }
  };

  const handleDeactivateTactic = async (tacticId: number) => {
    try {
      await apiFetch(`/api/tactics/${tacticId}?fromWeek=${currentWeekNumber}`, {
        method: "DELETE",
      });
      await fetchPlanData();
    } catch (err: unknown) {
      if (err instanceof ClientApiError) {
        setBannerError(err.message);
      }
    }
  };

  const handleUpdateTacticText = async (tacticId: number, text: string) => {
    try {
      await apiFetch(`/api/tactics/${tacticId}`, {
        method: "PATCH",
        body: JSON.stringify({ text }),
      });
      await fetchPlanData();
    } catch (err: unknown) {
      if (err instanceof ClientApiError) {
        setBannerError(err.message);
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-64 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-64 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
        <h3 className="font-bold">{locale === "vi" ? "Lỗi tải kế hoạch" : "Error loading plan"}</h3>
        <p className="mt-1 text-sm">{error}</p>
        <button
          onClick={fetchPlanData}
          className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 transition dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {locale === "vi" ? "Thử lại" : "Retry"}
        </button>
      </div>
    );
  }

  const goals = detail?.goals ?? [];
  const activeGoals = goals.filter((g) => g.status === "active");
  const droppedGoals = goals.filter((g) => g.status === "dropped");
  const isMaxGoals = activeGoals.length >= 3;

  return (
    <div className="space-y-6">
      {bannerError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800 flex items-center justify-between dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
          <p className="text-sm font-medium">{bannerError}</p>
          <button
            onClick={() => setBannerError(null)}
            className="text-xs font-bold text-rose-600 hover:text-rose-800 dark:text-rose-400"
          >
            {locale === "vi" ? "Đóng" : "Dismiss"}
          </button>
        </div>
      )}

      {/* Cycle Bar */}
      <CycleBar
        cycle={cycle}
        onCreateCycle={handleCreateCycle}
        onStartCycle={handleStartCycle}
      />

      {/* Commitment Card */}
      {cycle && (
        <CommitmentCard
          cycleId={cycle.id}
          cycleStatus={cycle.status}
        />
      )}

      {cycle && (
        <>
          {/* Goals Header */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
                12-Week Goals ({activeGoals.length}/3)
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5 dark:text-zinc-400">
                {locale === "vi"
                  ? "Tập trung vào số ít quan trọng: 2–3 mục tiêu bứt phá để thúc đẩy tầm nhìn 3 năm."
                  : "Focus on the vital few: 2–3 stretch goals that move your 3-year vision."}
              </p>
            </div>

            <div className="relative group no-print">
              <button
                type="button"
                disabled={isMaxGoals}
                onClick={() => setShowGoalModal(true)}
                className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                + Add Goal
              </button>
              {isMaxGoals && (
                <div className="pointer-events-none absolute right-0 top-full mt-2 hidden rounded-md bg-zinc-900 px-3 py-1.5 text-xs text-white shadow-lg group-hover:block whitespace-nowrap z-20 dark:bg-zinc-100 dark:text-zinc-900">
                  {locale === "vi"
                    ? "Tối đa 3 mục tiêu hoạt động — tập trung vào số ít quan trọng."
                    : "Max 3 active goals — the vital few."}
                </div>
              )}
            </div>
          </div>

          {/* Active Goals */}
          <div className="space-y-4">
            {activeGoals.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                {locale === "vi"
                  ? "Chưa có mục tiêu nào đang hoạt động. Nhấn “+ Add Goal” để tạo mục tiêu 12 tuần đầu tiên cùng chỉ số kết quả và lý do vì sao."
                  : "No active goals yet. Click “+ Add Goal” to define your first 12-week goal with its lag target and why."}
              </div>
            ) : (
              activeGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  currentWeekNumber={currentWeekNumber}
                  onDropGoal={handleDropGoal}
                  onAddTactic={handleAddTactic}
                  onDeactivateTactic={handleDeactivateTactic}
                  onUpdateTacticText={handleUpdateTacticText}
                />
              ))
            )}
          </div>

          {/* Dropped Goals Section */}
          {droppedGoals.length > 0 && (
            <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 dark:text-zinc-500">
                {locale === "vi" ? `Mục tiêu đã hủy (${droppedGoals.length})` : `Dropped Goals (${droppedGoals.length})`}
              </h3>
              <div className="space-y-3">
                {droppedGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    currentWeekNumber={currentWeekNumber}
                    onDropGoal={handleDropGoal}
                    onAddTactic={handleAddTactic}
                    onDeactivateTactic={handleDeactivateTactic}
                    onUpdateTacticText={handleUpdateTacticText}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Goal Modal */}
      <GoalModal
        isOpen={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        onSubmit={handleAddGoal}
      />
    </div>
  );
}
