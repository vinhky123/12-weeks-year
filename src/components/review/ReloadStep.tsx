"use client";

import { useState } from "react";
import Link from "next/link";
import type { NextCycleCreate, GoalDto } from "@/lib/contracts";

interface ReloadStepProps {
  cycleId: number;
  cycleName: string;
  isArchived: boolean;
  goals: GoalDto[];
  onReload: (data: NextCycleCreate) => Promise<{ id: number; name: string } | null>;
  onArchive: () => Promise<void>;
}

export function ReloadStep({
  cycleName,
  isArchived,
  goals,
  onReload,
  onArchive,
}: ReloadStepProps) {
  // Unachieved goals default checked
  const [selectedGoalIds, setSelectedGoalIds] = useState<number[]>(
    goals.filter((g) => g.status !== "achieved").slice(0, 3).map((g) => g.id)
  );

  const [nextName, setNextName] = useState("");
  const [nextStartDate, setNextStartDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsArchiveFirst, setNeedsArchiveFirst] = useState(false);
  const [createdCycle, setCreatedCycle] = useState<{ id: number; name: string } | null>(null);

  const handleToggleGoal = (id: number) => {
    if (selectedGoalIds.includes(id)) {
      setSelectedGoalIds(selectedGoalIds.filter((gid) => gid !== id));
    } else {
      if (selectedGoalIds.length >= 3) {
        setError("Chỉ cho phép chuyển giao tối đa 3 mục tiêu — tập trung vào số ít quan trọng.");
        return;
      }
      setError(null);
      setSelectedGoalIds([...selectedGoalIds, id]);
    }
  };

  const handleReloadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNeedsArchiveFirst(false);

    try {
      const res = await onReload({
        name: nextName.trim() || undefined,
        startDate: nextStartDate.trim() || undefined,
        carryoverGoalIds: selectedGoalIds,
      });
      if (res) {
        setCreatedCycle(res);
      }
    } catch (err: any) {
      if (err?.message?.includes("Archive this cycle first") || err?.status === 409) {
        setNeedsArchiveFirst(true);
      }
      setError(err?.message || "Không thể khởi động chu kỳ tiếp theo.");
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveAndRetry = async () => {
    setLoading(true);
    setError(null);
    try {
      await onArchive();
      setNeedsArchiveFirst(false);
      // Auto-retry reload
      const res = await onReload({
        name: nextName.trim() || undefined,
        startDate: nextStartDate.trim() || undefined,
        carryoverGoalIds: selectedGoalIds,
      });
      if (res) {
        setCreatedCycle(res);
      }
    } catch (err: any) {
      setError(err?.message || "Không thể lưu trữ và khởi động chu kỳ tiếp theo.");
    } finally {
      setLoading(false);
    }
  };

  if (createdCycle) {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center shadow-md space-y-4 text-zinc-900 dark:text-zinc-100">
        <span className="text-4xl">🚀</span>
        <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">Năm Mới Của Bạn Bắt Đầu</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
          <strong>{createdCycle.name}</strong> đã được tạo ở chế độ lập kế hoạch. Các mục tiêu chuyển giao đã sẵn sàng; hãy xây dựng các chiến thuật mới trong Trình tạo kế hoạch.
        </p>
        <div className="pt-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-zinc-900 dark:bg-zinc-100 px-6 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 shadow-xs hover:bg-zinc-800 dark:hover:bg-zinc-200 transition"
          >
            Mở bảng điều khiển
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Bước 6: Tái khởi động</h3>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Khép lại chu kỳ {cycleName}, lưu trữ dữ liệu và chuyển các mục tiêu quan trọng sang 12 tuần tiếp theo.
        </p>
      </div>

      {/* Verbatim Warning */}
      <div className="rounded-lg border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/20 p-4 text-xs text-amber-900 dark:text-amber-200 font-medium">
        <strong className="block text-amber-950 dark:text-amber-100 font-bold mb-0.5">Lưu ý quan trọng:</strong>
        Lưu trữ sẽ đóng băng chu kỳ này vĩnh viễn — bao gồm điểm số, bản đánh giá và ảnh chụp tầm nhìn.
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 p-4 text-xs font-medium text-rose-800 dark:text-rose-200 space-y-2">
          <p>{error}</p>
          {needsArchiveFirst && (
            <button
              type="button"
              onClick={handleArchiveAndRetry}
              disabled={loading}
              className="rounded-md bg-zinc-900 dark:bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
            >
              {loading ? "Đang lưu trữ..." : "Lưu trữ ngay & tiếp tục"}
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleReloadSubmit} className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs space-y-5">
        {/* Next Cycle Info */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide mb-1">
              Tên chu kỳ tiếp theo (tùy chọn)
            </label>
            <input
              type="text"
              value={nextName}
              onChange={(e) => setNextName(e.target.value)}
              placeholder="VD: Quý 1 2027 — Bứt phá"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-zinc-900 dark:focus:border-zinc-100 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide mb-1">
              Ngày bắt đầu (thứ Hai, tùy chọn)
            </label>
            <input
              type="date"
              value={nextStartDate}
              onChange={(e) => setNextStartDate(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2 text-xs text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-100 focus:outline-none"
            />
          </div>
        </div>

        {/* Carryover Goals Picker */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">
              Chuyển tiếp mục tiêu ({selectedGoalIds.length}/3)
            </label>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
              Chiến thuật sẽ được thiết lập mới, không sao chép — làm mới kế hoạch, không mang gánh nặng cũ.
            </span>
          </div>

          {goals.length === 0 ? (
            <p className="text-xs italic text-zinc-400 dark:text-zinc-500">Không có mục tiêu nào để chuyển tiếp.</p>
          ) : (
            <div className="space-y-2">
              {goals.map((g) => {
                const checked = selectedGoalIds.includes(g.id);
                return (
                  <label
                    key={g.id}
                    className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition ${
                      checked
                        ? "border-zinc-800 dark:border-zinc-200 bg-zinc-50 dark:bg-zinc-800/60"
                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleGoal(g.id)}
                      className="mt-0.5 rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-zinc-800"
                    />
                    <div className="flex-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">{g.title}</span>
                        <span
                          className={`rounded px-1.5 py-0.2 text-[10px] font-semibold uppercase ${
                            g.status === "achieved"
                              ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                          }`}
                        >
                          {g.status === "achieved" ? "Đã đạt" : "Đang thực hiện"}
                        </span>
                      </div>
                      <p className="text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Kết quả: {g.lagMetricName} ({g.lagStart} → {g.lagTarget} {g.lagUnit})
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-zinc-900 dark:bg-zinc-100 px-5 py-2.5 text-xs font-semibold text-white dark:text-zinc-900 shadow-xs hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition"
          >
            {loading ? "Đang khởi tạo chu kỳ tiếp theo..." : "Lưu trữ chu kỳ này & Bắt đầu chu kỳ mới"}
          </button>
        </div>
      </form>
    </div>
  );
}
