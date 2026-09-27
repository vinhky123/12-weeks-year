"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { HistoryEntryDto, InsightsDto } from "@/lib/contracts";
import { apiFetch, ClientApiError } from "@/components/common/api";
import { HistoryTabs } from "@/components/history/HistoryTabs";
import { CycleCard } from "@/components/history/CycleCard";
import { CycleDetail } from "@/components/history/CycleDetail";
import { InsightsPanel } from "@/components/history/InsightsPanel";

export default function HistoryPage({
  searchParams,
}: {
  searchParams?: Promise<{ id?: string; tab?: string }>;
}) {
  const router = useRouter();
  const resolvedParams = searchParams ? use(searchParams) : undefined;
  const cycleIdParam = resolvedParams?.id ? Number(resolvedParams.id) : null;
  const tabParam = resolvedParams?.tab === "insights" ? "insights" : "cycles";

  const [activeTab, setActiveTab] = useState<"cycles" | "insights">(tabParam);
  const [cycles, setCycles] = useState<HistoryEntryDto[]>([]);
  const [insights, setInsights] = useState<InsightsDto | null>(null);
  const [detailData, setDetailData] = useState<any | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync tab with URL
  useEffect(() => {
    setActiveTab(tabParam);
  }, [tabParam]);

  // Load data based on view
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        if (cycleIdParam) {
          // Fetch cycle detail
          const detailRes = await apiFetch<any>(`/api/history/${cycleIdParam}`);
          setDetailData(detailRes);
        } else {
          setDetailData(null);
          if (activeTab === "cycles") {
            const listRes = await apiFetch<HistoryEntryDto[]>("/api/history");
            setCycles(listRes);
          } else {
            const insightsRes = await apiFetch<InsightsDto>("/api/insights");
            setInsights(insightsRes);
          }
        }
      } catch (err) {
        if (err instanceof ClientApiError) {
          setError(err.message);
        } else {
          setError("Failed to load history data.");
        }
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [cycleIdParam, activeTab]);

  const handleTabChange = (tab: "cycles" | "insights") => {
    setActiveTab(tab);
    router.push(`/history?tab=${tab}`);
  };

  const handleSelectCycle = (id: number) => {
    router.push(`/history?id=${id}`);
  };

  const handleBackToList = () => {
    router.push(`/history?tab=${activeTab}`);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      {!cycleIdParam && (
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">History</h1>
          <p className="mt-1 text-xs text-slate-500">
            Four years a year — each one leaves a record.
          </p>
        </div>
      )}

      {/* Detail View */}
      {cycleIdParam && detailData ? (
        <CycleDetail detail={detailData} onBack={handleBackToList} />
      ) : (
        <>
          {/* Tab Navigation */}
          <HistoryTabs activeTab={activeTab} onTabChange={handleTabChange} />

          {/* Tab Content */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="h-44 animate-pulse rounded-xl bg-slate-200" />
              <div className="h-44 animate-pulse rounded-xl bg-slate-200" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800">
              <p className="font-semibold">Unable to load history</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          ) : activeTab === "cycles" ? (
            cycles.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
                <h2 className="text-base font-bold text-slate-900">
                  Your first 12 weeks will live here.
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Create and start your first 12-week cycle to begin building your record.
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
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {cycles.map((cycle) => (
                  <CycleCard
                    key={cycle.id}
                    cycle={cycle}
                    onClick={() => handleSelectCycle(cycle.id)}
                  />
                ))}
              </div>
            )
          ) : insights ? (
            <InsightsPanel insights={insights} />
          ) : null}
        </>
      )}
    </div>
  );
}
