"use client";

import React, { useEffect, useRef, useState } from "react";
import type {
  WeekPlanDetailDto,
  GoalDto,
  CloseWeek,
} from "@/lib/contracts";
import ScoreVerdict from "./ScoreVerdict";
import { useSettings } from "@/context/SettingsContext";
import ModalDialog from "@/components/common/ModalDialog";

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
  const { locale } = useSettings();
  const { plan, score } = planDetail;
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [lagInputs, setLagInputs] = useState<Record<number, string>>({});
  const [lagErrors, setLagErrors] = useState<Record<number, string>>({});
  const [reflection, setReflection] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [closedResult, setClosedResult] = useState<WeekPlanDetailDto | null>(null);
  const wasOpenRef = useRef(false);
  const planIdRef = useRef(plan.id);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const focusStepHeadingRef = useRef(false);

  useEffect(() => {
    const freshOpen = isOpen && !wasOpenRef.current;
    const differentPlan = planIdRef.current !== plan.id;

    if (isOpen && (freshOpen || differentPlan)) {
      setStep(1);
      setLagInputs({});
      setLagErrors({});
      setReflection("");
      setSubmitting(false);
      setServerError(null);
      setClosedResult(null);
    }

    wasOpenRef.current = isOpen;
    planIdRef.current = plan.id;
  }, [isOpen, plan.id]);

  useEffect(() => {
    if (!focusStepHeadingRef.current) return;
    focusStepHeadingRef.current = false;
    const frame = requestAnimationFrame(() => stepHeadingRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [step]);

  const goToStep = (nextStep: 1 | 2 | 3 | 4) => {
    focusStepHeadingRef.current = true;
    setStep(nextStep);
  };

  const numberError = locale === "vi"
    ? "Hãy nhập một số hợp lệ, dùng dấu chấm cho phần thập phân."
    : "Enter a valid number, using a dot for decimals.";
  const isValidLagValue = (value: string) => value.trim() === "" || Number.isFinite(Number(value));

  const handleLagChange = (goalId: number, val: string) => {
    setLagInputs((prev) => ({ ...prev, [goalId]: val }));
    if (!isValidLagValue(val)) {
      setLagErrors((prev) => ({ ...prev, [goalId]: numberError }));
    } else {
      setLagErrors((prev) => {
        const next = { ...prev };
        delete next[goalId];
        return next;
      });
    }
  };

  const handleContinueFromLag = () => {
    const errors: Record<number, string> = {};
    for (const [goalIdStr, val] of Object.entries(lagInputs)) {
      if (!isValidLagValue(val)) {
        errors[Number(goalIdStr)] = numberError;
      }
    }

    if (Object.keys(errors).length > 0) {
      setLagErrors(errors);
      return;
    }

    setLagErrors({});
    goToStep(3);
  };

  const handleFinalClose = async () => {
    if (submitting) return;

    try {
      setSubmitting(true);
      setServerError(null);

      const lagValues: { goalId: number; value: number }[] = [];
      for (const [goalIdStr, val] of Object.entries(lagInputs)) {
        if (val.trim() !== "" && Number.isFinite(Number(val))) {
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
      goToStep(4);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError(locale === "vi" ? "Không thể chốt tuần." : "Failed to close week.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const nextWeekNumber = plan.weekNumber + 1;
  const canPlanNextWeek = nextWeekNumber <= currentCycleWeek + 1 && nextWeekNumber <= 12;
  const title = locale === "vi" ? `Chốt tuần ${plan.weekNumber}` : `Close week ${plan.weekNumber}`;
  const stepName = locale === "vi"
    ? ["", "Xem lại thực thi", "Cập nhật kết quả", "Suy ngẫm và chốt tuần", "Tuần đã chốt"][step]
    : ["", "Review execution", "Update results", "Reflect and close", "Week closed"][step];
  const cancelLabel = locale === "vi" ? "Hủy" : "Cancel";
  const backLabel = locale === "vi" ? "Quay lại" : "Back";
  const continueLabel = locale === "vi" ? "Tiếp tục" : "Continue";

  return (
    <ModalDialog open={isOpen} onClose={onClose} title={title} busy={submitting}>
      <div className="space-y-5">
        {/* Header & Step Indicator */}
        <div className="flex items-center justify-between gap-4">
          <h3
            ref={stepHeadingRef}
            tabIndex={-1}
            className="text-sm font-semibold text-teal-700 outline-none dark:text-teal-300"
          >
            {stepName}
          </h3>

          {step < 4 && (
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {locale === "vi" ? `Bước ${step}/3` : `Step ${step} of 3`}
            </p>
          )}
        </div>

        {serverError && (
          <div role="alert" className="rounded-md bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300">
            {serverError}
          </div>
        )}

        {/* STEP 1: The Score */}
        {step === 1 && (
          <div className="space-y-6">
            <ScoreVerdict score={score} />

            <div className="flex items-center justify-between gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-10 items-center rounded-md px-4 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => goToStep(2)}
                className="inline-flex min-h-10 items-center rounded-md bg-teal-700 px-5 text-sm font-semibold text-white shadow-xs transition hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
              >
                {continueLabel}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Lag Values */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {locale === "vi"
                ? "Ghi nhận chỉ số kết quả thực tế cho từng mục tiêu tuần này. Có thể để trống nếu không đo."
                : "Log progress on your lag measures for each goal. Leave empty to skip."}
            </p>

            <div className="space-y-3">
              {activeGoals.map((g) => (
                <div
                  key={g.id}
                  className="rounded-md border border-zinc-200 bg-zinc-50/50 p-3.5 space-y-1 dark:border-zinc-800 dark:bg-zinc-800/40"
                >
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">{g.title}</span>
                    <span className="text-zinc-400 font-medium dark:text-zinc-500">
                      {locale === "vi" ? "Mục tiêu:" : "Target:"} {g.lagTarget} {g.lagUnit}
                    </span>
                  </div>
                  <label htmlFor={`close-week-lag-${g.id}`} className="block text-[11px] text-zinc-500 dark:text-zinc-400">
                    {g.lagMetricName} ({g.lagUnit}): {g.lagStart} &rarr; {g.lagTarget} &middot; {locale === "vi" ? "tuần này:" : "this week:"}
                  </label>
                  {/* Text, not type="number": number inputs silently turn "1,5" into 15, and this value is saved for good. */}
                  <input
                    id={`close-week-lag-${g.id}`}
                    type="text"
                    inputMode="decimal"
                    placeholder={`e.g. ${g.lagTarget}`}
                    value={lagInputs[g.id] ?? ""}
                    onChange={(e) => handleLagChange(g.id, e.target.value)}
                    aria-invalid={Boolean(lagErrors[g.id])}
                    className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-teal-600 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  {lagErrors[g.id] && (
                    <p className="text-[11px] text-rose-600 font-medium dark:text-rose-400">
                      {lagErrors[g.id]}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => goToStep(1)}
                  className="inline-flex min-h-10 items-center rounded-md px-4 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 transition dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  {backLabel}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex min-h-10 items-center rounded-md px-4 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 transition dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  {cancelLabel}
                </button>
              </div>
              <button
                type="button"
                onClick={handleContinueFromLag}
                className="inline-flex min-h-10 items-center rounded-md bg-teal-700 px-5 text-sm font-semibold text-white shadow-xs hover:bg-teal-800 transition dark:bg-teal-600 dark:hover:bg-teal-500"
              >
                {continueLabel}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Reflection & Freeze */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label htmlFor="close-week-reflection" className="block text-sm font-semibold text-zinc-700 mb-1 dark:text-zinc-300">
                {locale === "vi" ? "Suy ngẫm tuần" : "Weekly reflection"}
              </label>
              <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">{locale === "vi" ? "Không bắt buộc" : "Optional"}</p>
              <textarea
                id="close-week-reflection"
                rows={3}
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder={
                  locale === "vi"
                    ? "Một dòng ngắn: điều gì hiệu quả, điều gì trục trặc, tuần tới thay đổi gì?"
                    : "One line: what worked, what slipped, what changes next week?"
                }
                className="w-full rounded-md border border-zinc-300 p-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                disabled={submitting}
              />
            </div>

            <div className="rounded-md border border-zinc-300 bg-zinc-100 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <div className="flex items-start gap-2.5">
                <span className="text-lg">🔒</span>
                <div>
                  <p className="mt-0.5 text-xs text-zinc-700 font-medium leading-relaxed dark:text-zinc-300">
                    {locale === "vi"
                      ? `Sau khi chốt, thành tựu của tuần ${plan.weekNumber} sẽ không thể thay đổi.`
                      : `After closing, week ${plan.weekNumber} completions cannot be changed.`}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => goToStep(2)}
                  disabled={submitting}
                  className="inline-flex min-h-10 items-center rounded-md px-4 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 transition dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  {backLabel}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="inline-flex min-h-10 items-center rounded-md px-4 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 transition dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  {cancelLabel}
                </button>
              </div>
              <button
                type="button"
                onClick={handleFinalClose}
                aria-disabled={submitting}
                aria-label={title}
                className="inline-flex min-h-10 items-center rounded-md bg-teal-700 px-6 text-sm font-semibold text-white shadow-xs transition hover:bg-teal-800 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500"
              >
                {submitting
                  ? (locale === "vi" ? "Đang chốt..." : "Closing...")
                  : (locale === "vi" ? `Chốt tuần ${plan.weekNumber}` : `Close week ${plan.weekNumber}`)}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Success confirmation */}
        {step === 4 && closedResult && (
          <div className="space-y-6 text-center py-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-2xl font-bold dark:bg-zinc-800">
              🎉
            </div>

            <div>
              <h4 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
                {locale === "vi" ? `Tuần ${plan.weekNumber} đã chốt` : `Week ${plan.weekNumber} is closed`}
              </h4>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {closedResult.score
                  ? locale === "vi"
                    ? `Điểm cuối cùng: ${closedResult.score.scorePct}%. Điểm kiểm tra tự động đã được lưu.`
                    : `Final score: ${closedResult.score.scorePct}%. An automatic checkpoint was saved.`
                  : locale === "vi"
                    ? "Tuần đã chốt mà không có điểm số. Điểm kiểm tra tự động đã được lưu."
                    : "The week closed with no score. An automatic checkpoint was saved."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              {canPlanNextWeek ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateWeek(nextWeekNumber);
                  }}
                  className="inline-flex min-h-10 w-full items-center justify-center rounded-md bg-teal-700 px-5 text-sm font-semibold text-white shadow-xs hover:bg-teal-800 transition sm:w-auto dark:bg-teal-600 dark:hover:bg-teal-500"
                >
                  {locale === "vi" ? `Lập kế hoạch tuần ${nextWeekNumber}` : `Plan week ${nextWeekNumber}`}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex min-h-10 w-full items-center justify-center rounded-md bg-teal-700 px-5 text-sm font-semibold text-white shadow-xs hover:bg-teal-800 transition sm:w-auto dark:bg-teal-600 dark:hover:bg-teal-500"
                >
                  {locale === "vi" ? "Đóng" : "Done"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </ModalDialog>
  );
}
