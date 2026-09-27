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
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 p-4">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-baseline">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Chỉ số kết quả (Kết quả cuối)
          </span>
          <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
            {lagMetricName}: {lagStart} → {lagTarget} {lagUnit}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Hiện tại: </span>
            <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
              {hasLagValue ? `${latestLag} ${lagUnit}` : "—"}
            </span>
          </div>
          <Link
            href="/week?close=1"
            className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline"
          >
            Cập nhật kết quả khi đóng tuần →
          </Link>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3">
        <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1">
          <span>Tiến độ hướng tới mục tiêu</span>
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
            {hasLagValue ? `${progressPct}%` : "—"}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Weekly History Series */}
      {!hasLagValue ? (
        <p className="mt-3 text-xs italic text-zinc-400 dark:text-zinc-500">
          Ghi nhận giá trị kết quả đầu tiên khi đóng tuần.
        </p>
      ) : validPoints.length === 0 ? (
        <p className="mt-3 text-xs italic text-zinc-400 dark:text-zinc-500">Chưa có bản ghi tuần nào được lưu.</p>
      ) : (
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pt-2">
          <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">Lịch sử:</span>
          {validPoints.map((pt) => (
            <div
              key={pt.week}
              className="flex items-center gap-1 rounded bg-white dark:bg-zinc-800 px-2 py-0.5 border border-zinc-200 dark:border-zinc-700 text-xs shadow-xs"
            >
              <span className="font-semibold text-zinc-500 dark:text-zinc-400">T{pt.week}:</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-100">
                {pt.value} {lagUnit}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
