"use client";

interface WeekPickerProps {
  selectedWeek: number;
  currentWeek: number;
  onSelectWeek: (week: number) => void;
  disabled?: boolean;
}

export function WeekPicker({
  selectedWeek,
  currentWeek,
  onSelectWeek,
  disabled = false,
}: WeekPickerProps) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
      {Array.from({ length: 12 }, (_, i) => {
        const w = i + 1;
        const isSelected = w === selectedWeek;
        const isCurrent = w === currentWeek;

        return (
          <button
            key={w}
            type="button"
            disabled={disabled}
            onClick={() => onSelectWeek(w)}
            className={`flex flex-col items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              isSelected
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
            }`}
          >
            <span>W{w}</span>
            {isCurrent && (
              <span
                className={`text-[9px] font-normal ${
                  isSelected ? "text-slate-300" : "text-slate-400"
                }`}
              >
                current
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
