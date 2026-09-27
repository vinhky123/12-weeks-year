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
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs"
                : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
            }`}
          >
            <span>T{w}</span>
            {isCurrent && (
              <span
                className={`text-[9px] font-normal ${
                  isSelected ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-400 dark:text-zinc-500"
                }`}
              >
                hiện tại
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
