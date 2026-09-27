"use client";

import { useEffect, useState } from "react";
import type { VisionDto } from "@/lib/contracts";
import { apiFetch, ClientApiError } from "@/components/common/api";
import { VisionEditor } from "@/components/vision/VisionEditor";

export default function VisionPage() {
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
        setError("Failed to load vision.");
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Vision</h1>
            <p className="mt-1 text-sm text-slate-500">
              The emotional engine connecting long-term dreams to daily execution.
            </p>
          </div>
        </div>

        {/* Empty state prompt banner if no vision yet */}
        {!loading && (!vision || (!vision.longTerm && !vision.threeYear && !vision.cycleConnection)) && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-amber-900 shadow-sm">
            <p className="text-sm font-semibold">Start with what if — not how.</p>
            <p className="mt-1 text-xs text-amber-800">
              A compelling vision creates the emotional fuel to persist through the valley of execution.
              Don&apos;t worry about how you&apos;ll achieve it yet — clarify the destination first.
            </p>
          </div>
        )}
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="space-y-4">
          <div className="h-40 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-40 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-40 animate-pulse rounded-xl bg-slate-200" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800">
          <p className="font-semibold">Unable to load vision</p>
          <p className="mt-1 text-sm">{error}</p>
          <button
            type="button"
            onClick={fetchVision}
            className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      ) : (
        <VisionEditor initialVision={vision} />
      )}
    </div>
  );
}
