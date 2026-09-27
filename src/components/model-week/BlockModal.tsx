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
      setError("Please select a valid day of the week.");
      return;
    }
    if (isNaN(startMinute) || startMinute < 0 || startMinute > 1439) {
      setError("Please enter a valid time (00:00–23:59).");
      return;
    }
    if (duration < 15 || duration > 480) {
      setError("Duration must be between 15 and 480 minutes.");
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
      setError(err?.message || "Failed to save block.");
      setSaving(false);
    }
  };

  const selectedConfig = BLOCK_TYPE_CONFIG[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-slate-900">
            {isEditing ? "Edit Time Block" : "Add Time Block"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-rose-50 p-2.5 text-xs font-medium text-rose-700">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Block Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700">Block Type</label>
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
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-medium text-slate-900 focus:border-slate-800 focus:outline-none"
            >
              {(Object.keys(BLOCK_TYPE_CONFIG) as BlockType[]).map((t) => (
                <option key={t} value={t}>
                  {BLOCK_TYPE_CONFIG[t].name}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] italic text-slate-500">
              {selectedConfig.hint}
            </p>
          </div>

          {/* Day of Week */}
          <div>
            <label className="block text-xs font-semibold text-slate-700">Day of the Week</label>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-medium text-slate-900 focus:border-slate-800 focus:outline-none"
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
              <label className="block text-xs font-semibold text-slate-700">Start Time</label>
              <input
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-slate-800 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Duration (minutes)
              </label>
              <input
                type="number"
                min="15"
                max="480"
                step="5"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-slate-800 focus:outline-none"
              />
            </div>
          </div>

          {/* Duration Quick Presets */}
          <div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
              Quick Presets:
            </span>
            <div className="mt-1 flex flex-wrap gap-1">
              {DURATION_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setDuration(p)}
                  className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${
                    duration === p
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {p >= 60 ? `${p / 60}h` : `${p}m`}
                </button>
              ))}
            </div>
          </div>

          {/* Label / Activity */}
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Label / Description (Optional)
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Deep work — 12-Week Plan tactics"
              className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-slate-800 focus:outline-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? "Saving..." : isEditing ? "Save changes" : "Add block"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
