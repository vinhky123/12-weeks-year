"use client";

const STEPS = [
  "Ăn mừng",
  "Kết quả",
  "Chất lượng sống",
  "Kỷ luật",
  "Đột phá",
  "Tái khởi động",
];

interface StepIndicatorProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function StepIndicator({ currentStep, onStepClick }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between overflow-x-auto pb-2">
      {STEPS.map((label, idx) => {
        const stepNum = idx + 1;
        const isCurrent = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;

        return (
          <div key={label} className="flex items-center">
            <button
              type="button"
              disabled={!onStepClick || stepNum > currentStep}
              onClick={() => onStepClick?.(stepNum)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                isCurrent
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs"
                  : isCompleted
                  ? "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  : "text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                  isCurrent
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-bold"
                    : isCompleted
                    ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold"
                    : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
                }`}
              >
                {isCompleted ? "✓" : stepNum}
              </span>
              <span className="whitespace-nowrap hidden sm:inline">{label}</span>
            </button>
            {idx < STEPS.length - 1 && (
              <div
                className={`mx-1 h-0.5 w-3 sm:w-6 ${
                  isCompleted ? "bg-zinc-900 dark:bg-zinc-100" : "bg-zinc-200 dark:bg-zinc-800"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
