"use client";

import type { MeasuresOverviewDto } from "@/lib/contracts";
import { useI18n } from "@/context/SettingsContext";

type Diagnosis = MeasuresOverviewDto["goals"][number]["diagnosis"];

interface DiagnosisBannerProps {
  diagnosis: Diagnosis;
  lagMetricName: string;
  lagUnit: string;
}

export function DiagnosisBanner({ diagnosis, lagMetricName, lagUnit }: DiagnosisBannerProps) {
  const { t } = useI18n();
  const copyByStatus = {
    INSUFFICIENT_DATA: ["measures.diagnosis.insufficient_title", "measures.diagnosis.insufficient_body"],
    REVIEW: ["measures.diagnosis.review_title", "measures.diagnosis.review_body"],
    EXECUTION_CONCERN: ["measures.diagnosis.execution_title", "measures.diagnosis.execution_body"],
    STRATEGY_CONCERN: ["measures.diagnosis.strategy_title", "measures.diagnosis.strategy_body"],
  } as const;
  const [titleKey, bodyKey] = copyByStatus[diagnosis.status];
  const tone =
    diagnosis.status === "STRATEGY_CONCERN"
      ? "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/20 dark:text-amber-200"
      : diagnosis.status === "EXECUTION_CONCERN"
        ? "border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-800/60 dark:bg-rose-950/20 dark:text-rose-200"
        : "border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-200";
  const executionEvidence = diagnosis.execution
    .map(({ week, scorePct }) => t("measures.diagnosis.execution_item", { week, score: scorePct }))
    .join(" · ");
  const lagEvidence = diagnosis.lag
    .map(({ week, value }) => t("measures.diagnosis.lag_item", { week, value, unit: lagUnit }))
    .join(" · ");

  return (
    <div role="status" className={`rounded-xl border p-4 shadow-sm ${tone}`}>
      <p className="font-semibold text-xs uppercase tracking-wider">{t(titleKey)}</p>
      <p className="mt-1 text-sm">{t(bodyKey)}</p>
      {executionEvidence && (
        <p className="mt-3 text-xs">
          <span className="font-semibold">{t("measures.diagnosis.execution_evidence", { items: executionEvidence })}</span>
        </p>
      )}
      {lagEvidence && (
        <p className="mt-1 text-xs">
          {t("measures.diagnosis.lag_evidence", { metric: lagMetricName, items: lagEvidence })}
        </p>
      )}
    </div>
  );
}
