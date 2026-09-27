"use client";

import { useSettings } from "@/context/SettingsContext";
import type { Theme } from "@/lib/contracts";

const THEME_OPTIONS: { id: Theme; label: string }[] = [
  { id: "system", label: "System" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

export function ThemeSwitch() {
  const { theme, setTheme } = useSettings();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Appearance</h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Choose your interface theme. System mode automatically matches your device preference.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {THEME_OPTIONS.map((option) => {
          const isSelected = theme === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setTheme(option.id)}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                isSelected
                  ? "bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-900"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
