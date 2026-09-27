"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ActiveCycleInfoDto } from "@/lib/contracts";
import { apiFetch, ClientApiError } from "@/components/common/api";
import { WamView } from "@/components/wam/WamView";

export default function WamPage() {
  const [activeCycleInfo, setActiveCycleInfo] = useState<ActiveCycleInfoDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadActiveCycle() {
      try {
        setLoading(true);
        setError(null);
        setNotFound(false);
        const res = await apiFetch<ActiveCycleInfoDto>("/api/cycles/active");
        setActiveCycleInfo(res);
      } catch (err) {
        if (err instanceof ClientApiError && err.status === 404) {
          setNotFound(true);
        } else if (err instanceof ClientApiError) {
          setError(err.message);
        } else {
          setError("Failed to load active cycle.");
        }
      } finally {
        setLoading(false);
      }
    }
    loadActiveCycle();
  }, []);

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">WAM</h1>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Weekly Accountability Meeting
            </span>
          </div>

          {activeCycleInfo && (
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
              {activeCycleInfo.cycle.name} · W{activeCycleInfo.weekNumber}
            </span>
          )}
        </div>

        {/* Verbatim Page Intro */}
        <p className="mt-2 text-xs font-medium text-slate-600">
          Accountability is not consequences — it&apos;s ownership. Report to yourself like you&apos;d report to a peer.
        </p>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="space-y-4">
          <div className="h-12 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-64 animate-pulse rounded-xl bg-slate-200" />
        </div>
      ) : notFound ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
          <h2 className="text-base font-bold text-slate-900">No active cycle</h2>
          <p className="mt-1 text-sm text-slate-500">
            Create and start a cycle first to begin your weekly accountability meetings.
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
          <p className="font-semibold">Unable to load WAM</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      ) : activeCycleInfo ? (
        <WamView
          cycleId={activeCycleInfo.cycle.id}
          initialWeek={Math.min(12, Math.max(1, activeCycleInfo.weekNumber))}
        />
      ) : null}
    </div>
  );
}
