"use client";

import { useSettings } from "@/context/SettingsContext";
import type { AppLocale } from "@/lib/contracts";

const LOCALE_OPTIONS: { id: AppLocale; label: string }[] = [
  { id: "en", label: "English" },
  { id: "vi", label: "Tiếng Việt" },
];

export function LanguageSwitch() {
  const { locale, setLocale } = useSettings();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Language</h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Select your display language for the navigation, ritual guidance, and scoring verdicts.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {LOCALE_OPTIONS.map((option) => {
          const isSelected = locale === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setLocale(option.id)}
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
