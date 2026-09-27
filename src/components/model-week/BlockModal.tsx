"use client";

import { useState } from "react";
import type { BlockType, BlockCreate, BlockTemplateDto } from "@/lib/contracts";
import {
  DAYS,
  BLOCK_TYPE_CONFIG,
  minuteToTimeStr,
  timeStrToMinutes,
} from "./timeUtils";

interface BlockModalProps {
  initialBlock?: BlockTemplateDto | null;
  defaultDayOfWeek?: number;
  onSubmit: (blockData: BlockCreate) => Promise<void>;
  onClose: () => void;
}

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120, 180, 240];

export function BlockModal({
  initialBlock,
  defaultDayOfWeek = 0,
  onSubmit,
  onClose,
}: BlockModalProps) {
  const isEditing = Boolean(initialBlock);

  const [type, setType] = useState<BlockType>(initialBlock?.type ?? "STRATEGIC");
  const [dayOfWeek, setDayOfWeek] = useState<number>(
    initialBlock?.dayOfWeek ?? defaultDayOfWeek
  );
  const [timeStr, setTimeStr] = useState<string>(
    initialBlock ? minuteToTimeStr(initialBlock.startMinute) : "09:00"
  );
  const [duration, setDuration] = useState<number>(
    initialBlock?.durationMinutes ?? 180
  );
  const [label, setLabel] = useState<string>(initialBlock?.label ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const startMinute = timeStrToMinutes(timeStr);

    if (dayOfWeek < 0 || dayOfWeek > 6) {
      setError("Vui lòng chọn ngày hợp lệ trong tuần.");
      return;
    }
    if (isNaN(startMinute) || startMinute < 0 || startMinute > 1439) {
      setError("Vui lòng nhập giờ hợp lệ (00:00–23:59).");
      return;
    }
    if (duration < 15 || duration > 480) {
      setError("Thời lượng phải từ 15 đến 480 phút.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSubmit({
        type,
        dayOfWeek,
        startMinute,
        durationMinutes: duration,
        label: label.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Không thể lưu khung giờ.");
      setSaving(false);
    }
  };

  const selectedConfig = BLOCK_TYPE_CONFIG[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xl text-zinc-900 dark:text-zinc-100">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
            {isEditing ? "Chỉnh sửa khung giờ" : "Thêm khung giờ"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            ✕
          </button>
        </div>

        {error && (
          <p className="mt-3 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 p-2.5 text-xs font-medium text-rose-700 dark:text-rose-300">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Block Type */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Loại khung giờ</label>
            <select
              value={type}
              onChange={(e) => {
                const newType = e.target.value as BlockType;
                setType(newType);
                // Adjust default duration for convenience
                if (newType === "STRATEGIC") setDuration(180);
                else if (newType === "BREAKOUT") setDuration(240);
                else if (newType === "BUFFER") setDuration(45);
                else if (newType === "PLANNING") setDuration(20);
                else if (newType === "WAM") setDuration(30);
              }}
              className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-100 focus:outline-none"
            >
              {(Object.keys(BLOCK_TYPE_CONFIG) as BlockType[]).map((t) => (
                <option key={t} value={t}>
                  {BLOCK_TYPE_CONFIG[t].name}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] italic text-zinc-500 dark:text-zinc-400">
              {selectedConfig.hint}
            </p>
          </div>

          {/* Day of Week */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Ngày trong tuần</label>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-100 focus:outline-none"
            >
              {DAYS.map((name, idx) => (
                <option key={idx} value={idx}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Time & Duration Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Giờ bắt đầu</label>
              <input
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2 text-xs text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-100 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Thời lượng (phút)
              </label>
              <input
                type="number"
                min="15"
                max="480"
                step="5"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2 text-xs text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-100 focus:outline-none"
              />
            </div>
          </div>

          {/* Duration Quick Presets */}
          <div>
            <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Chọn nhanh thời lượng:
            </span>
            <div className="mt-1 flex flex-wrap gap-1">
              {DURATION_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setDuration(p)}
                  className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${
                    duration === p
                      ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  {p >= 60 ? `${p / 60}h` : `${p}m`}
                </button>
              ))}
            </div>
          </div>

          {/* Label / Activity */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Nhãn mô tả (Tùy chọn)
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ví dụ: Công việc sâu — Chiến thuật Kế hoạch 12 Tuần"
              className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2 text-xs text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-100 focus:outline-none placeholder:text-zinc-400"
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-zinc-900 dark:bg-zinc-100 px-4 py-1.5 text-xs font-semibold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50"
            >
              {saving ? "Đang lưu..." : isEditing ? "Lưu thay đổi" : "Thêm khung giờ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
