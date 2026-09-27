"use client";

import { useEffect, useState, useCallback } from "react";
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

export default function PlanPage() {
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
        setError("Failed to load 12-Week Plan.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

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
        setBannerError("Failed to create cycle.");
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
        setBannerError("Failed to start cycle.");
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
        <div className="h-24 rounded-2xl bg-slate-200" />
        <div className="h-64 rounded-2xl bg-slate-200" />
        <div className="h-64 rounded-2xl bg-slate-200" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
        <h3 className="font-bold">Error loading plan</h3>
        <p className="mt-1 text-sm">{error}</p>
        <button
          onClick={fetchPlanData}
          className="mt-4 rounded-lg bg-rose-700 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-800 transition"
        >
          Retry
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

      {/* Cycle Bar */}
      <CycleBar
        cycle={cycle}
        onCreateCycle={handleCreateCycle}
        onStartCycle={handleStartCycle}
      />

      {cycle && (
        <>
          {/* Goals Header */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
                12-Week Goals ({activeGoals.length}/3)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Focus on the vital few: 2–3 stretch goals that move your 3-year vision.
              </p>
            </div>

            <div className="relative group">
              <button
                type="button"
                disabled={isMaxGoals}
                onClick={() => setShowGoalModal(true)}
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                + Add Goal
              </button>
              {isMaxGoals && (
                <div className="pointer-events-none absolute right-0 top-full mt-2 hidden rounded-md bg-slate-900 px-3 py-1.5 text-xs text-white shadow-lg group-hover:block whitespace-nowrap z-20">
                  Max 3 active goals — the vital few.
                </div>
              )}
            </div>
          </div>

          {/* Active Goals */}
          <div className="space-y-4">
            {activeGoals.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                No active goals yet. Click &ldquo;+ Add Goal&rdquo; to define your first 12-week goal with its lag target and why.
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
            <div className="pt-6 border-t border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Dropped Goals ({droppedGoals.length})
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
