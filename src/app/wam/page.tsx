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
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Họp WAM</h1>
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Phiên giải trình trách nhiệm hàng tuần
            </span>
          </div>

          {activeCycleInfo && (
            <span className="rounded-full bg-zinc-900 dark:bg-zinc-100 px-3 py-1 text-xs font-semibold text-white dark:text-zinc-900">
              {activeCycleInfo.cycle.name} · T{activeCycleInfo.weekNumber}
            </span>
          )}
        </div>

        {/* Verbatim Page Intro */}
        <p className="mt-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Trách nhiệm không phải là chịu phạt — đó là quyền làm chủ. Hãy tự giải trình với chính mình như cách bạn báo cáo trước một cộng sự đáng tin cậy.
        </p>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="space-y-4">
          <div className="h-12 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-64 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
        </div>
      ) : notFound ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-12 text-center shadow-xs">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Không có chu kỳ nào đang hoạt động</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Hãy tạo và bắt đầu một chu kỳ trước để thực hiện các phiên giải trình trách nhiệm hàng tuần.
          </p>
          <div className="mt-5">
            <Link
              href="/plan"
              className="inline-flex items-center rounded-lg bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
            >
              Đi tới Kế hoạch 12 tuần →
            </Link>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 p-6 text-center text-rose-800 dark:text-rose-200">
          <p className="font-semibold">Không thể tải dữ liệu WAM</p>
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
