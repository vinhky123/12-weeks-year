"use client";

import React from "react";
import type { WeekScoreDto } from "@/lib/contracts";
import {
  BENCHMARK_LINE,
  ACHIEVEMENTS_LINE,
  REVISE_PLAN_GUIDANCE,
  getBandBadgeStyles,
} from "@/components/common/scoreUtils";
import { useSettings } from "@/context/SettingsContext";

interface ScoreVerdictProps {
  score: WeekScoreDto | null;
}

export default function ScoreVerdict({ score }: ScoreVerdictProps) {
  const { locale } = useSettings();

  if (!score) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {locale === "vi"
            ? "Không có việc nào đến hạn tuần này — không có điểm số. Tuần vẫn có thể chốt."
            : "Nothing was due this week — no score. The week still closes."}
        </p>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          {locale === "vi" ? "Điểm số đo lường thành tựu, không đo nỗ lực hay ý định." : ACHIEVEMENTS_LINE}
        </p>
      </div>
    );
  }

  const bandStyles = getBandBadgeStyles(score.band);

  const getCloseVerdict = () => {
    switch (score.band) {
      case "ON_TRACK":
        return locale === "vi" ? "Đang thực hiện ở mức cao." : "Executing at a high level.";
      case "AT_RISK":
        return locale === "vi" ? "Mục tiêu có rủi ro." : "Goals at risk.";
      case "REVISE_PLAN":
        return locale === "vi" ? "Hãy điều chỉnh kế hoạch — đây là chẩn đoán, không phán xét." : "Revise the plan — this is diagnosis, not judgment.";
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 text-center shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <div className="text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          <span className={bandStyles.text}>{score.scorePct}%</span>
        </div>
        <div className="mt-2 flex items-center justify-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${bandStyles.bg} ${bandStyles.text} ${bandStyles.border}`}
          >
            <span className={`h-2 w-2 rounded-full ${bandStyles.dot}`} />
            {getCloseVerdict()}
          </span>
        </div>
        <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
          {locale === "vi"
            ? `Đã hoàn thành ${score.completed}/${score.due} hành động đến hạn tuần này`
            : `${score.completed} of ${score.due} due tactics completed this week`}
        </p>
      </div>

      <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
        <p className="font-semibold text-zinc-800 dark:text-zinc-200">
          {locale === "vi"
            ? "85% thực thi hàng tuần là chuẩn — dưới 65%, hãy điều chỉnh kế hoạch."
            : BENCHMARK_LINE}
        </p>
        <p className="text-zinc-500 italic dark:text-zinc-400">
          {locale === "vi"
            ? "Điểm số đo lường thành tựu, không đo nỗ lực hay ý định."
            : ACHIEVEMENTS_LINE}
        </p>
        {score.band === "REVISE_PLAN" && (
          <p className="mt-2 font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300">
            {locale === "vi" ? "Hai tuần dưới 65%? Cắt giảm hành động chỉ còn số ít cốt lõi mà bạn thực sự sẽ làm." : REVISE_PLAN_GUIDANCE}
          </p>
        )}
      </div>
    </div>
  );
}
