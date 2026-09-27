"use client";

import { useEffect, useState, useCallback } from "react";
import type { WamReportDto, WamSave } from "@/lib/contracts";
import { apiFetch, ClientApiError } from "@/components/common/api";
import { WeekPicker } from "./WeekPicker";
import { AutoReport } from "./AutoReport";
import { WamField } from "./WamField";

interface WamViewProps {
  cycleId: number;
  initialWeek: number;
}

export function WamView({ cycleId, initialWeek }: WamViewProps) {
  const [selectedWeek, setSelectedWeek] = useState(initialWeek);
  const [data, setData] = useState<WamReportDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User input states
  const [blockers, setBlockers] = useState("");
  const [whatWorked, setWhatWorked] = useState("");
  const [encouragement, setEncouragement] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchWamReport = useCallback(
    async (weekNum: number) => {
      try {
        setLoading(true);
        setError(null);
        const res = await apiFetch<WamReportDto>(
          `/api/cycles/${cycleId}/wam/${weekNum}`
        );
        setData(res);
        setBlockers(res.report?.blockers ?? "");
        setWhatWorked(res.report?.whatWorked ?? "");
        setEncouragement(res.report?.encouragement ?? "");
      } catch (err) {
        if (err instanceof ClientApiError) {
          setError(err.message);
        } else {
          setError("Failed to load WAM report.");
        }
      } finally {
        setLoading(false);
      }
    },
    [cycleId]
  );

  useEffect(() => {
    fetchWamReport(selectedWeek);
  }, [fetchWamReport, selectedWeek]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    const payload: WamSave = {
      blockers: blockers.trim() || undefined,
      whatWorked: whatWorked.trim() || undefined,
      encouragement: encouragement.trim() || undefined,
    };

    try {
      const res = await apiFetch<WamReportDto>(
        `/api/cycles/${cycleId}/wam/${selectedWeek}`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        }
      );
      setData(res);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      if (err instanceof ClientApiError) {
        setError(err.message);
      } else {
        setError("Failed to save report.");
      }
    } finally {
      setSaving(false);
    }
  };

  const formatLastSaved = (isoString?: string) => {
    if (!isoString) return null;
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return null;
    }
  };

  const exportUrl = `/api/cycles/${cycleId}/wam/${selectedWeek}/export`;

  return (
    <div className="space-y-6">
      {/* Week Selector Bar */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Chọn tuần
          </span>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">Xem lại các báo cáo giải trình tự thân đã qua hoặc viết báo cáo tuần này.</p>
        </div>
        <WeekPicker
          selectedWeek={selectedWeek}
          currentWeek={initialWeek}
          onSelectWeek={setSelectedWeek}
          disabled={loading || saving}
        />
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 p-4 text-xs font-medium text-rose-800 dark:text-rose-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <div className="h-48 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-48 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* 1. Auto Report Component (Muted card) */}
          <AutoReport auto={data.auto} />

          {/* 2. User Input Section (White card) */}
          <form onSubmit={handleSave} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-5">
            <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3 flex items-baseline justify-between">
              <div>
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Đánh giá trung thực của bạn</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Không đổ lỗi, không bao biện. Hãy đối diện trực diện với thực tế thực thi của bạn.
                </p>
              </div>

              {data.report?.updatedAt && (
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                  Đã lưu: {formatLastSaved(data.report.updatedAt)}
                </span>
              )}
            </div>

            <WamField
              label="Trở ngại / Rào cản (Blockers)"
              placeholder="Điều gì đang cản trở bạn? Hãy gọi tên chính xác mà không viện cớ."
              value={blockers}
              onChange={setBlockers}
              rows={2}
            />

            <WamField
              label="Những điều đã hiệu quả (What worked)"
              placeholder="Những hành động cụ thể nào đã mang lại kết quả tuần này?"
              value={whatWorked}
              onChange={setWhatWorked}
              rows={2}
            />

            <WamField
              label="Lời khích lệ / Trọng tâm (Encouragement)"
              placeholder="Một thông điệp quan trọng mà phiên bản tương lai của bạn cần đọc."
              value={encouragement}
              onChange={setEncouragement}
              rows={2}
            />

            {/* Action Bar */}
            <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <a
                href={exportUrl}
                download
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 shadow-2xs hover:bg-zinc-50 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100 transition"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Xuất file Markdown
              </a>

              <div className="flex items-center gap-3">
                {saveSuccess && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Đã lưu
                  </span>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-zinc-900 dark:bg-zinc-100 px-5 py-2 text-xs font-semibold text-white dark:text-zinc-900 shadow-xs hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition"
                >
                  {saving ? "Đang lưu..." : "Lưu báo cáo"}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
