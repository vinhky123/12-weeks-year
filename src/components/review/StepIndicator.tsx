"use client";

const STEPS = [
  "Celebrate",
  "Results",
  "Quality of Life",
  "Disciplines",
  "Breakthroughs",
  "Reload",
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
                  ? "bg-slate-900 text-white shadow-xs"
                  : isCompleted
                  ? "text-slate-700 hover:bg-slate-100"
                  : "text-slate-400 cursor-not-allowed"
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                  isCurrent
                    ? "bg-white text-slate-900 font-bold"
                    : isCompleted
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {isCompleted ? "✓" : stepNum}
              </span>
              <span className="whitespace-nowrap hidden sm:inline">{label}</span>
            </button>
            {idx < STEPS.length - 1 && (
              <div
                className={`mx-1 h-0.5 w-3 sm:w-6 ${
                  isCompleted ? "bg-emerald-400" : "bg-slate-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
