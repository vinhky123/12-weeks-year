"use client";

import { useSettings } from "@/context/SettingsContext";

interface ReviewData {
  results: {
    goalId: number;
    title?: string;
    percentComplete?: number | null;
    avgScore?: number | null;
    grade: number;
    note?: string;
  }[];
  qol: {
    area: string;
    rating: number;
    anchor1?: string;
    anchor10?: string;
  }[];
  disciplines: {
    name: string;
    rating: number;
  }[];
  breakthroughs: string | null;
  nextCycleNotes: string | null;
  updatedAt: string;
}

interface ReviewSectionProps {
  review: ReviewData | null;
}

export function ReviewSection({ review }: ReviewSectionProps) {
  const { locale } = useSettings();

  if (!review) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 p-6 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
        <p className="text-xs italic text-zinc-500 dark:text-zinc-400">
          {locale === "vi"
            ? "Chưa có đánh giá nào được lưu — năm kết thúc mà không có bài đánh giá."
            : "No review saved — the year closed without a retrospective."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs space-y-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
        <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
          {locale === "vi" ? "Đánh giá nhìn lại 12 tuần" : "12-Week Retrospective"}
        </h3>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          {locale === "vi" ? "Hoàn thành ngày" : "Completed on"}{" "}
          {new Date(review.updatedAt).toLocaleDateString(locale === "vi" ? "vi-VN" : undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>

      {/* 1. Results */}
      <div>
        <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-3">
          {locale === "vi" ? "Kết quả & Điểm mục tiêu" : "Results & Goal Grades"}
        </h4>
        <div className="space-y-2">
          {review.results.map((r, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-zinc-100 bg-zinc-50/60 p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 dark:border-zinc-800 dark:bg-zinc-800/40"
            >
              <div>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                  {r.title || (locale === "vi" ? `Mục tiêu #${r.goalId}` : `Goal #${r.goalId}`)}
                </span>
                {r.note && <p className="text-zinc-500 dark:text-zinc-400 italic mt-0.5">{r.note}</p>}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {r.percentComplete !== null && r.percentComplete !== undefined && (
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {locale === "vi" ? "Chỉ số kết quả:" : "Lag:"} {r.percentComplete}%
                  </span>
                )}
                <span className="rounded bg-zinc-900 px-2 py-0.5 font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                  {locale === "vi" ? "Điểm:" : "Grade:"} {r.grade}/10
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Quality of Life */}
      <div>
        <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-3">
          {locale === "vi" ? "Đánh giá chất lượng sống" : "Quality of Life Ratings"}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {review.qol.map((item, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-zinc-100 bg-zinc-50/60 p-3 text-xs space-y-1 dark:border-zinc-800 dark:bg-zinc-800/40"
            >
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{item.area}</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{item.rating}/10</span>
              </div>
              {(item.anchor1 || item.anchor10) && (
                <div className="text-[11px] text-zinc-400 dark:text-zinc-500">
                  {item.anchor1 && <div>1: {item.anchor1}</div>}
                  {item.anchor10 && <div>10: {item.anchor10}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Disciplines */}
      <div>
        <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-3">
          {locale === "vi" ? "Kỷ luật thực thi" : "Execution Disciplines"}
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {review.disciplines.map((d, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-zinc-100 bg-zinc-50/60 p-2.5 text-center text-xs dark:border-zinc-800 dark:bg-zinc-800/40"
            >
              <div className="font-semibold text-zinc-700 dark:text-zinc-300 truncate">{d.name}</div>
              <div className="mt-1 font-black text-zinc-900 dark:text-zinc-100 text-sm">{d.rating}/10</div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Breakthroughs & Next Cycle */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-zinc-100 dark:border-zinc-800 pt-4">
        <div>
          <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
            {locale === "vi" ? "Đột phá" : "Breakthroughs"}
          </h4>
          <p className="rounded-lg bg-zinc-50 p-3 text-xs text-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-200 whitespace-pre-wrap">
            {review.breakthroughs || <span className="italic text-zinc-400 dark:text-zinc-500">{locale === "vi" ? "Chưa ghi nhận." : "None recorded."}</span>}
          </p>
        </div>

        <div>
          <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1">
            {locale === "vi" ? "Ghi chú chu kỳ tiếp theo" : "Next Cycle Notes"}
          </h4>
          <p className="rounded-lg bg-zinc-50 p-3 text-xs text-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-200 whitespace-pre-wrap">
            {review.nextCycleNotes || <span className="italic text-zinc-400 dark:text-zinc-500">{locale === "vi" ? "Chưa ghi nhận." : "None recorded."}</span>}
          </p>
        </div>
      </div>
    </div>
  );
}
