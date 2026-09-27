"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { HistoryEntryDto, InsightsDto } from "@/lib/contracts";
import { apiFetch, ClientApiError } from "@/components/common/api";
import { useSettings } from "@/context/SettingsContext";
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
  const { t } = useSettings();
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
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
            {t("history.title")}
          </h1>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {t("history.subtitle")}
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
              <div className="h-44 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
              <div className="h-44 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
              <p className="font-semibold">{t("history.load_error")}</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          ) : activeTab === "cycles" ? (
            cycles.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-12 text-center shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {t("history.empty_title")}
                </h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {t("history.empty_desc")}
                </p>
                <div className="mt-5">
                  <Link
                    href="/plan"
                    className="inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition"
                  >
                    {t("history.go_to_plan")}
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
