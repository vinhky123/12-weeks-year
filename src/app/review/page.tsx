"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import type { ActiveCycleInfoDto, CelebrationDto, CycleDetailDto, CycleDto, CycleReviewDto, CycleScoresDto, GoalDto } from "@/lib/contracts";
import { apiFetch, ClientApiError } from "@/components/common/api";
import { ReviewWizard } from "@/components/review/ReviewWizard";
import { useSettings } from "@/context/SettingsContext";

export default function ReviewPage({ searchParams }: { searchParams?: Promise<{ id?: string }> }) {
  const resolvedParams = searchParams ? use(searchParams) : undefined;
  const rawId = resolvedParams?.id;
  const cycleIdParam = rawId && /^\d+$/.test(rawId) && Number(rawId) > 0 ? Number(rawId) : null;
  const invalidId = rawId !== undefined && cycleIdParam === null;
  const { t } = useSettings();
  const [cycle, setCycle] = useState<CycleDto | null>(null);
  const [currentWeekNumber, setCurrentWeekNumber] = useState(13);
  const [celebration, setCelebration] = useState<CelebrationDto | null>(null);
  const [review, setReview] = useState<CycleReviewDto | null>(null);
  const [goals, setGoals] = useState<GoalDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    const clearData = () => { setCycle(null); setCelebration(null); setReview(null); setGoals([]); };
    async function loadReviewData() {
      setLoading(true); setError(null); setNotFound(false); clearData();
      if (invalidId) { setNotFound(true); setLoading(false); return; }
      try {
        let targetCycle: CycleDto | null = null;
        let weekNum = 13;
        if (cycleIdParam) {
          const all = await apiFetch<CycleDto[]>("/api/cycles");
          targetCycle = all.find((candidate) => candidate.id === cycleIdParam) ?? null;
        } else {
          try {
            const active = await apiFetch<ActiveCycleInfoDto>("/api/cycles/active");
            targetCycle = active.cycle; weekNum = active.weekNumber;
          } catch (loadError) {
            if (!(loadError instanceof ClientApiError) || loadError.status !== 404) throw loadError;
            const all = await apiFetch<CycleDto[]>("/api/cycles");
            targetCycle = all[0] ?? null;
          }
        }
        if (!current) return;
        if (!targetCycle) { setNotFound(true); return; }
        const requests: [Promise<CelebrationDto>, Promise<{ review: CycleReviewDto | null }>, Promise<CycleDetailDto>, Promise<CycleScoresDto> | null] = [
          apiFetch(`/api/cycles/${targetCycle.id}/review/celebration`),
          apiFetch(`/api/cycles/${targetCycle.id}/review`),
          apiFetch(`/api/cycles/${targetCycle.id}`),
          cycleIdParam ? apiFetch(`/api/cycles/${targetCycle.id}/scores`) : null,
        ];
        const [celebrationResult, reviewResult, detailResult, scoresResult] = await Promise.all(requests);
        if (!current) return;
        setCycle(targetCycle); setCurrentWeekNumber(scoresResult?.currentWeek ?? weekNum);
        setCelebration(celebrationResult); setReview(reviewResult.review); setGoals(detailResult.goals);
      } catch (loadError) {
        if (!current) return;
        setError(loadError instanceof ClientApiError ? loadError.message : t("review.load_error_detail"));
      } finally { if (current) setLoading(false); }
    }
    void loadReviewData();
    return () => { current = false; };
  }, [cycleIdParam, invalidId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div><h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{t("review.title")}</h1><p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{t("review.subtitle")}</p></div>
        {cycle && <span className="shrink-0 rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">{cycle.name}</span>}
      </div>
      {loading ? <div className="space-y-4"><div className="h-10 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" /><div className="h-64 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" /></div>
        : notFound ? <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center shadow-xs dark:border-zinc-700 dark:bg-zinc-900"><h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{t("review.no_cycle")}</h2><p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t("review.no_cycle_detail")}</p><div className="mt-5"><Link href="/plan" className="inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">{t("review.go_plan")}</Link></div></div>
        : error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200"><p className="font-semibold">{t("review.load_error")}</p><p className="mt-1 text-sm">{error}</p></div>
        : cycle && celebration ? <ReviewWizard key={cycle.id} cycle={cycle} celebration={celebration} initialReview={review} goals={goals} currentWeekNumber={currentWeekNumber} /> : null}
    </div>
  );
}
