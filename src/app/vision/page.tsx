"use client";

import { useEffect, useState } from "react";
import type { VisionDto } from "@/lib/contracts";
import { apiFetch, ClientApiError } from "@/components/common/api";
import { VisionEditor } from "@/components/vision/VisionEditor";
import { useI18n } from "@/context/SettingsContext";

export default function VisionPage() {
  const { t } = useI18n();
  const [vision, setVision] = useState<VisionDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVision = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<{ vision: VisionDto | null }>("/api/vision");
      setVision(res.vision);
    } catch (err) {
      if (err instanceof ClientApiError) {
        setError(err.message);
      } else {
        setError(t("common.error"));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVision();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          {t("nav.vision")}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Động cơ cảm xúc kết nối ước mơ dài hạn với hành động thực thi hàng ngày.
        </p>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="space-y-4">
          <div className="h-56 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 p-6 text-center text-rose-800 dark:text-rose-200">
          <p className="font-semibold">Không thể tải tầm nhìn</p>
          <p className="mt-1 text-sm">{error}</p>
          <button
            type="button"
            onClick={fetchVision}
            className="mt-4 rounded-md bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-xs font-semibold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
          >
            {t("common.retry")}
          </button>
        </div>
      ) : (
        <VisionEditor initialVision={vision} />
      )}
    </div>
  );
}
