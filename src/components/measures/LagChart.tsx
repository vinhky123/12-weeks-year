"use client";

import Link from "next/link";

interface LagChartProps {
  goalTitle: string;
  lagMetricName: string;
  lagUnit: string;
  lagStart: number;
  lagTarget: number;
  latestLag: number | null;
  lagProgress: number | null;
  lagSeries: ({ week: number; value: number } | null)[];
}

export function LagChart({
  goalTitle,
  lagMetricName,
  lagUnit,
  lagStart,
  lagTarget,
  latestLag,
  lagProgress,
  lagSeries,
}: LagChartProps) {
  const hasLagValue = latestLag !== null;
  const progressPct = lagProgress !== null ? Math.min(100, Math.max(0, Math.round(lagProgress))) : 0;

  // Filter existing series points
  const validPoints = lagSeries
    .filter((pt): pt is { week: number; value: number } => pt !== null)
    .sort((a, b) => a.week - b.week);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-baseline">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Lag Indicator (The Result)
          </span>
          <p className="font-bold text-sm text-slate-800">
            {lagMetricName}: {lagStart} → {lagTarget} {lagUnit}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-slate-500">Latest: </span>
            <span className="font-bold text-sm text-slate-900">
              {hasLagValue ? `${latestLag} ${lagUnit}` : "—"}
            </span>
          </div>
          <Link
            href="/week?close=1"
            className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline"
          >
            Log lag at week close →
          </Link>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Progress toward target</span>
          <span className="font-semibold text-slate-700">
            {hasLagValue ? `${progressPct}%` : "—"}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full bg-slate-800 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Weekly History Series */}
      {!hasLagValue ? (
        <p className="mt-3 text-xs italic text-slate-400">
          Log your first lag value at week close.
        </p>
      ) : validPoints.length === 0 ? (
        <p className="mt-3 text-xs italic text-slate-400">No weekly entries recorded yet.</p>
      ) : (
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pt-2">
          <span className="text-[11px] font-medium text-slate-400">History:</span>
          {validPoints.map((pt) => (
            <div
              key={pt.week}
              className="flex items-center gap-1 rounded bg-white px-2 py-0.5 border border-slate-200 text-xs shadow-xs"
            >
              <span className="font-semibold text-slate-500">W{pt.week}:</span>
              <span className="font-bold text-slate-800">
                {pt.value} {lagUnit}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
