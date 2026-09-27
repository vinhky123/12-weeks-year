"use client";

import type { WamAutoDto } from "@/lib/contracts";
import { getBandBadgeStyles } from "@/components/common/scoreUtils";

interface AutoReportProps {
  auto: WamAutoDto;
}

export function AutoReport({ auto }: AutoReportProps) {
  const { weekScore, averageScore, goals, nextWeekCommitments, weekNumber } = auto;
  const bandStyles = getBandBadgeStyles(weekScore?.band);

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60 p-5 shadow-xs space-y-5">
      {/* Score Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200/60 dark:border-zinc-800 pb-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Ảnh chụp hệ thống · Tuần {weekNumber}
          </span>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Chỉ số trung thực được tự động tổng hợp từ kế hoạch &amp; lượt ghi nhận.</p>
        </div>

        <div className="flex items-center gap-2">
          {weekScore !== null ? (
            <div
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${bandStyles.bg} ${bandStyles.text} ${bandStyles.border}`}
            >
              <span className={`h-2 w-2 rounded-full ${bandStyles.dot}`} />
              <span>Điểm tuần: {weekScore.scorePct}%</span>
            </div>
          ) : (
            <span className="rounded-full bg-zinc-200 dark:bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Điểm tuần: Chưa có
            </span>
          )}

          {averageScore !== null && (
            <span className="rounded-full bg-zinc-200/80 dark:bg-zinc-800/80 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              TB {averageScore}%
            </span>
          )}
        </div>
      </div>

      {/* Results to date */}
      <div>
        <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-800 dark:text-zinc-200 mb-2">
          Kết quả lũy kế đến nay
        </h4>
        {goals.length === 0 ? (
          <p className="text-xs italic text-zinc-400 dark:text-zinc-500">Không có mục tiêu nào trong chu kỳ.</p>
        ) : (
          <div className="space-y-2">
            {goals.map((g, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 text-xs shadow-2xs space-y-1.5"
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{g.title}</span>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Kết quả (Lag): {g.lagLatest !== null ? `${g.lagLatest} ${g.lagUnit}` : "—"}
                  </span>
                </div>

                {g.leadThisWeek.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                    {g.leadThisWeek.map((lead, lIdx) => (
                      <span
                        key={lIdx}
                        className="inline-flex items-center gap-1 rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-600 dark:text-zinc-300"
                      >
                        <span className="font-medium">{lead.name}:</span>
                        <strong className="text-zinc-900 dark:text-zinc-100">
                          {lead.thisWeek !== null ? lead.thisWeek : 0} / {lead.weeklyTarget}
                        </strong>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Commitments for next week */}
      <div>
        <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-800 dark:text-zinc-200 mb-2">
          Cam kết cho tuần tiếp theo
        </h4>
        {nextWeekCommitments.length === 0 ? (
          <p className="text-xs italic text-zinc-400 dark:text-zinc-500">Chưa có chiến thuật nào được lên lịch cho tuần tới.</p>
        ) : (
          <ul className="space-y-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 text-xs">
            {nextWeekCommitments.map((tactic, tIdx) => (
              <li key={tIdx} className="flex items-start gap-2 text-zinc-700 dark:text-zinc-300">
                <span className="text-zinc-400 font-bold">•</span>
                <span>{tactic}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
