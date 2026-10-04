"use client";

import { useSettings } from "@/context/SettingsContext";

interface StepIndicatorProps {
  currentStep: number;
  completedSteps: ReadonlySet<number>;
  pending?: boolean;
  onStepClick?: (step: number) => void;
}

export function StepIndicator({ currentStep, completedSteps, pending = false, onStepClick }: StepIndicatorProps) {
  const { t } = useSettings();
  return (
    <div className="flex items-center justify-between overflow-x-auto pb-2" aria-label={t("review.progress_label")}>
      {Array.from({ length: 6 }, (_, index) => {
        const stepNum = index + 1;
        const label = t(`review.step${stepNum}`);
        const isCurrent = stepNum === currentStep;
        const isCompleted = completedSteps.has(stepNum);
        const canVisit = Boolean(onStepClick) && (stepNum === 1 || isCompleted || isCurrent);
        return (
          <div key={stepNum} className="flex items-center">
            <button type="button" aria-current={isCurrent ? "step" : undefined} disabled={pending || !canVisit} onClick={() => onStepClick?.(stepNum)} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${isCurrent ? "bg-zinc-900 text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-900" : isCompleted ? "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800" : "cursor-not-allowed text-zinc-400 dark:text-zinc-600"}`}>
              <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${isCurrent ? "bg-white font-bold text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100" : isCompleted ? "bg-zinc-200 font-bold text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200" : "bg-zinc-200 text-zinc-500 dark:bg-zinc-800"}`}>{isCompleted ? "✓" : stepNum}</span>
              <span className="hidden whitespace-nowrap sm:inline">{label}</span>
            </button>
            {index < 5 && <div className={`mx-1 h-0.5 w-3 sm:w-6 ${isCompleted ? "bg-zinc-900 dark:bg-zinc-100" : "bg-zinc-200 dark:bg-zinc-800"}`} />}
          </div>
        );
      })}
    </div>
  );
}
