"use client";

interface DiagnosisBannerProps {
  diagnosis: "STRATEGY_PROBLEM" | "EXECUTION_PROBLEM" | null;
}

export function DiagnosisBanner({ diagnosis }: DiagnosisBannerProps) {
  if (!diagnosis) return null;

  if (diagnosis === "STRATEGY_PROBLEM") {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white font-bold text-xs">
            !
          </div>
          <div>
            <p className="font-semibold text-xs uppercase tracking-wider text-amber-800">
              Strategy Problem
            </p>
            <p className="mt-1 text-sm font-medium">
              You&apos;re executing, but the lag isn&apos;t moving. The strategy is wrong — change the tactics, not the effort.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-rose-900 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white font-bold text-xs">
          !
        </div>
        <div>
          <p className="font-semibold text-xs uppercase tracking-wider text-rose-800">
            Execution Problem
          </p>
          <p className="mt-1 text-sm font-medium">
            Execution is the bottleneck. Shrink the plan to what you will actually do — process control beats motivation.
          </p>
        </div>
      </div>
    </div>
  );
}
