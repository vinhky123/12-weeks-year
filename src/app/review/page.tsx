"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import type {
  CycleDto,
  CycleDetailDto,
  CelebrationDto,
  CycleReviewDto,
  GoalDto,
  ActiveCycleInfoDto,
} from "@/lib/contracts";
import { apiFetch, ClientApiError } from "@/components/common/api";
import { ReviewWizard } from "@/components/review/ReviewWizard";

export default function ReviewPage({
  searchParams,
}: {
  searchParams?: Promise<{ id?: string }>;
}) {
  const resolvedParams = searchParams ? use(searchParams) : undefined;
  const cycleIdParam = resolvedParams?.id ? Number(resolvedParams.id) : null;

  const [cycle, setCycle] = useState<CycleDto | null>(null);
  const [currentWeekNumber, setCurrentWeekNumber] = useState<number>(13);
  const [celebration, setCelebration] = useState<CelebrationDto | null>(null);
  const [review, setReview] = useState<CycleReviewDto | null>(null);
  const [goals, setGoals] = useState<GoalDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReviewData() {
      try {
        setLoading(true);
        setError(null);
        setNotFound(false);

        let targetCycle: CycleDto | null = null;
        let weekNum = 13;

        // 1. Resolve target cycle
        if (cycleIdParam) {
          const all = await apiFetch<CycleDto[]>("/api/cycles");
          targetCycle = all.find((c) => c.id === cycleIdParam) ?? null;
        } else {
          try {
            const activeRes = await apiFetch<ActiveCycleInfoDto>("/api/cycles/active");
            targetCycle = activeRes.cycle;
            weekNum = activeRes.weekNumber;
          } catch (err) {
            if (err instanceof ClientApiError && err.status === 404) {
              // Try finding most recent cycle from history/all
              const all = await apiFetch<CycleDto[]>("/api/cycles");
              targetCycle = all[0] ?? null;
            } else {
              throw err;
            }
          }
        }

        if (!targetCycle) {
          setNotFound(true);
          return;
        }

        setCycle(targetCycle);
        setCurrentWeekNumber(weekNum);

        // 2. Fetch celebration, review, and cycle detail (including goals) concurrently
        const [celRes, revRes, detailRes] = await Promise.all([
          apiFetch<CelebrationDto>(`/api/cycles/${targetCycle.id}/review/celebration`),
          apiFetch<{ review: CycleReviewDto | null }>(`/api/cycles/${targetCycle.id}/review`),
          apiFetch<CycleDetailDto>(`/api/cycles/${targetCycle.id}`),
        ]);

        setCelebration(celRes);
        setReview(revRes.review);
        setGoals(detailRes.goals);
      } catch (err) {
        if (err instanceof ClientApiError) {
          setError(err.message);
        } else {
          setError("Failed to load review wizard.");
        }
      } finally {
        setLoading(false);
      }
    }

    loadReviewData();
  }, [cycleIdParam]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Week 13 Review &amp; Reload
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Close the year with honest measurement, reflection, and celebration before launching the next cycle.
          </p>
        </div>

        {cycle && (
          <span className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
            {cycle.name}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-10 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-64 animate-pulse rounded-xl bg-slate-200" />
        </div>
      ) : notFound ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
          <h2 className="text-base font-bold text-slate-900">No cycle found</h2>
          <p className="mt-1 text-sm text-slate-500">
            Create a cycle first before conducting a 12-week review.
          </p>
          <div className="mt-5">
            <Link
              href="/plan"
              className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Go to 12-Week Plan →
            </Link>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800">
          <p className="font-semibold">Unable to load review</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      ) : cycle && celebration ? (
        <ReviewWizard
          cycle={cycle}
          celebration={celebration}
          initialReview={review}
          goals={goals}
          currentWeekNumber={currentWeekNumber}
        />
      ) : null}
    </div>
  );
}
