"use client";

import { useState } from "react";
import type {
  WeekPlanDetailDto,
  GoalDto,
  CloseWeek,
} from "@/lib/contracts";
import ScoreVerdict from "./ScoreVerdict";

interface CloseWeekModalProps {
  isOpen: boolean;
  onClose: () => void;
  planDetail: WeekPlanDetailDto;
  activeGoals: GoalDto[];
  currentCycleWeek: number;
  onCloseSubmit: (data: CloseWeek) => Promise<WeekPlanDetailDto>;
  onNavigateWeek: (week: number) => void;
}

export default function CloseWeekModal({
  isOpen,
  onClose,
  planDetail,
  activeGoals,
  currentCycleWeek,
  onCloseSubmit,
  onNavigateWeek,
}: CloseWeekModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [lagInputs, setLagInputs] = useState<Record<number, string>>({});
  const [lagErrors, setLagErrors] = useState<Record<number, string>>({});
  const [reflection, setReflection] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [closedResult, setClosedResult] = useState<WeekPlanDetailDto | null>(null);

  if (!isOpen) return null;

  const { plan, score } = planDetail;

  const handleLagChange = (goalId: number, val: string) => {
    setLagInputs((prev) => ({ ...prev, [goalId]: val }));
    if (val.trim() !== "" && isNaN(Number(val))) {
      setLagErrors((prev) => ({ ...prev, [goalId]: "Must be a valid number" }));
    } else {
      setLagErrors((prev) => {
        const next = { ...prev };
        delete next[goalId];
        return next;
      });
    }
  };

  const handleContinueFromLag = () => {
    // Validate lag values
    const errors: Record<number, string> = {};
    for (const [goalIdStr, val] of Object.entries(lagInputs)) {
      if (val.trim() !== "" && isNaN(Number(val))) {
        errors[Number(goalIdStr)] = "Must be a valid number";
      }
    }

    if (Object.keys(errors).length > 0) {
      setLagErrors(errors);
      return;
    }

    setLagErrors({});
    setStep(3);
  };

  const handleFinalClose = async () => {
    try {
      setSubmitting(true);
      setServerError(null);

      const lagValues: { goalId: number; value: number }[] = [];
      for (const [goalIdStr, val] of Object.entries(lagInputs)) {
        if (val.trim() !== "" && !isNaN(Number(val))) {
          lagValues.push({
            goalId: Number(goalIdStr),
            value: Number(val),
          });
        }
      }

      const payload: CloseWeek = {
        reflection: reflection.trim() || undefined,
        lagValues: lagValues.length > 0 ? lagValues : undefined,
      };

      const result = await onCloseSubmit(payload);
      setClosedResult(result);
      setStep(4);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError("Failed to close week.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const nextWeekNumber = plan.weekNumber + 1;
  const canPlanNextWeek = nextWeekNumber <= currentCycleWeek + 1 && nextWeekNumber <= 12;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-6">
        {/* Header & Step Indicator */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Close Week Ritual &middot; Week {plan.weekNumber}
            </span>
            <h3 className="text-lg font-bold text-slate-900">
              {step === 1 && "Step 1: Confront the Truth"}
              {step === 2 && "Step 2: Log Lag Numbers"}
              {step === 3 && "Step 3: Reflection & Freeze"}
              {step === 4 && "Week Closed Successfully"}
            </h3>
          </div>

          {step < 4 && (
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-2 w-2 rounded-full transition ${
                    step === s
                      ? "bg-slate-900 w-5"
                      : step > s
                      ? "bg-emerald-500"
                      : "bg-slate-200"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {serverError && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium">
            {serverError}
          </div>
        )}

        {/* STEP 1: The Score */}
        {step === 1 && (
          <div className="space-y-6">
            <ScoreVerdict score={score} />

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition"
              >
                Continue to Lag Values &rarr;
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Lag Values */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Log progress on your lag measures for each goal. Leave empty to skip.
            </p>

            <div className="space-y-3">
              {activeGoals.map((g) => (
                <div
                  key={g.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-1"
                >
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-bold text-slate-800">{g.title}</span>
                    <span className="text-slate-400 font-medium">
                      Target: {g.lagTarget} {g.lagUnit}
                    </span>
                  </div>
                  <label className="block text-[11px] text-slate-500">
                    {g.lagMetricName} ({g.lagUnit}): {g.lagStart} &rarr; {g.lagTarget} &middot; this week:
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder={`e.g. ${g.lagTarget}`}
                    value={lagInputs[g.id] ?? ""}
                    onChange={(e) => handleLagChange(g.id, e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden"
                  />
                  {lagErrors[g.id] && (
                    <p className="text-[11px] text-rose-600 font-medium">
                      {lagErrors[g.id]}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                &larr; Back to Score
              </button>
              <button
                type="button"
                onClick={handleContinueFromLag}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition"
              >
                Continue to Reflection &rarr;
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Reflection & Freeze */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                One-Line Weekly Reflection (Optional)
              </label>
              <textarea
                rows={3}
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="One line: what worked, what slipped, what changes next week?"
                className="w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-hidden"
                disabled={submitting}
              />
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-2.5">
                <span className="text-lg">🔒</span>
                <div>
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                    Freeze Warning
                  </h4>
                  <p className="mt-0.5 text-xs text-amber-800 font-medium leading-relaxed">
                    Closing freezes week {plan.weekNumber} forever — completions can no longer change.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={submitting}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                &larr; Back
              </button>
              <button
                type="button"
                onClick={handleFinalClose}
                disabled={submitting}
                className="rounded-xl bg-amber-600 px-6 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-500 disabled:opacity-50 transition"
              >
                {submitting ? "Closing Week..." : `Close Week ${plan.weekNumber}`}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Success */}
        {step === 4 && (
          <div className="py-4 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-2xl font-bold">
              ✓
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-slate-900">
                {closedResult?.score
                  ? `Week ${plan.weekNumber} closed at ${closedResult.score.scorePct}%.`
                  : `Week ${plan.weekNumber} closed.`}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Score finalized. Achievements are permanently recorded.
              </p>
            </div>

            <div className="pt-4 flex items-center justify-center gap-3">
              {canPlanNextWeek ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateWeek(nextWeekNumber);
                  }}
                  className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-slate-800 transition"
                >
                  Plan week {nextWeekNumber} &rarr;
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-slate-800 transition"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
