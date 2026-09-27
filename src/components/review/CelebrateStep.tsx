"use client";

import type { CelebrationDto } from "@/lib/contracts";

interface CelebrateStepProps {
  celebration: CelebrationDto;
}

export function CelebrateStep({ celebration }: CelebrateStepProps) {
  const { cycleName, bestWeek, averageScore, goalsCompleted, goalsTotal } = celebration;

  return (
    <div className="space-y-6 text-center py-4">
      {/* Celebration Header */}
      <div className="space-y-2">
        <span className="inline-block text-3xl animate-bounce">🎉</span>
        <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
          Ăn mừng trước khi bạn phân tích.
        </h2>
        <p className="mx-auto max-w-lg text-xs text-zinc-500 dark:text-zinc-400">
          Hầu hết mọi người vội vã lao vào mổ xẻ những thất bại hoặc lên kế hoạch cày cuốc tiếp theo. Hãy dừng lại và ghi nhận những gì bạn đã thực thi trong chu kỳ {cycleName}.
        </p>
      </div>

      {/* Wins Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2">
        {/* Best Week */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 p-5 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
            Đỉnh cao thực thi
          </span>
          <div className="mt-2 text-2xl font-black text-zinc-900 dark:text-zinc-100">
            {bestWeek ? `${bestWeek.scorePct}%` : "—"}
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {bestWeek ? `Tuần ${bestWeek.week} là tuần tốt nhất của bạn` : "Chưa có dữ liệu tuần"}
          </p>
        </div>

        {/* Average Score */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 p-5 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
            Điểm trung bình 12 tuần
          </span>
          <div className="mt-2 text-2xl font-black text-zinc-900 dark:text-zinc-100">
            {averageScore !== null ? `${averageScore}%` : "—"}
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {celebration.scoredWeeks} tuần đã thực thi
          </p>
        </div>

        {/* Goals Achieved */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 p-5 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
            Mục tiêu đã hoàn thành
          </span>
          <div className="mt-2 text-2xl font-black text-zinc-900 dark:text-zinc-100">
            {goalsCompleted} / {goalsTotal}
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {goalsTotal > 0 ? `${Math.round((goalsCompleted / goalsTotal) * 100)}% tỷ lệ hoàn thành` : "Không có mục tiêu"}
          </p>
        </div>
      </div>

      {/* Book Reflection Quote */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 text-xs italic text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto shadow-xs">
        &ldquo;Thành công không phải là sự hoàn hảo — mà là tính kỷ luật của hành động nhất quán. Từng phần trăm cao hơn mức cơ sở đều là sự tăng trưởng kép.&rdquo;
      </div>
    </div>
  );
}
