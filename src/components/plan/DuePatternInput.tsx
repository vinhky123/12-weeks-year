"use client";

import type { DuePattern } from "@/lib/contracts";

interface DuePatternInputProps {
  value: DuePattern;
  onChange: (value: DuePattern) => void;
  disabled?: boolean;
}

export default function DuePatternInput({
  value,
  onChange,
  disabled = false,
}: DuePatternInputProps) {
  const isEveryWeek = value.type === "EVERY_WEEK";

  const handleTypeChange = (type: "EVERY_WEEK" | "SPECIFIC_WEEKS") => {
    if (type === "EVERY_WEEK") {
      onChange({ type: "EVERY_WEEK", timesPerWeek: 3 });
    } else {
      onChange({ type: "SPECIFIC_WEEKS", weeks: [1] });
    }
  };

  const handleTimesChange = (n: number) => {
    const clamped = Math.max(1, Math.min(7, n));
    onChange({ type: "EVERY_WEEK", timesPerWeek: clamped });
  };

  const toggleWeek = (weekNum: number) => {
    if (value.type !== "SPECIFIC_WEEKS") return;
    const exists = value.weeks.includes(weekNum);
    let nextWeeks: number[];
    if (exists) {
      nextWeeks = value.weeks.filter((w) => w !== weekNum);
      if (nextWeeks.length === 0) nextWeeks = [weekNum]; // minimum 1 week
    } else {
      nextWeeks = [...value.weeks, weekNum].sort((a, b) => a - b);
    }
    onChange({ type: "SPECIFIC_WEEKS", weeks: nextWeeks });
  };

  return (
    <div className="space-y-3">
      {/* Pattern Type Toggle */}
      <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-1">
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleTypeChange("EVERY_WEEK")}
          className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
            isEveryWeek
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Every week &times; N
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleTypeChange("SPECIFIC_WEEKS")}
          className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
            !isEveryWeek
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Specific weeks
        </button>
      </div>

      {/* Pattern details */}
      {isEveryWeek ? (
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-600 font-medium">Frequency:</span>
          <div className="flex items-center rounded-lg border border-slate-200 bg-white">
            <button
              type="button"
              disabled={disabled || value.timesPerWeek <= 1}
              onClick={() => handleTimesChange(value.timesPerWeek - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-l text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30"
            >
              &minus;
            </button>
            <span className="w-16 text-center text-xs font-bold text-slate-900">
              {value.timesPerWeek}&times; / week
            </span>
            <button
              type="button"
              disabled={disabled || value.timesPerWeek >= 7}
              onClick={() => handleTimesChange(value.timesPerWeek + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-r border-l border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30"
            >
              +
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <span className="text-xs text-slate-600 font-medium block">
            Select due weeks (1–12):
          </span>
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => {
              const selected = value.weeks.includes(w);
              return (
                <button
                  key={w}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleWeek(w)}
                  className={`rounded-md py-1 text-xs font-bold transition ${
                    selected
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  W{w}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
