"use client";

import { useSettings } from "@/context/SettingsContext";
import type { AppLocale } from "@/lib/contracts";

const LOCALE_OPTIONS: { id: AppLocale; label: string }[] = [
  { id: "en", label: "English" },
  { id: "vi", label: "Tiếng Việt" },
];

export function LanguageSwitch() {
  const { locale, setLocale, t } = useSettings();

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
        {t("settings.language")}
      </h3>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        {locale === "vi"
          ? "Chọn ngôn ngữ hiển thị cho điều hướng, hướng dẫn nghi thức và đánh giá điểm số."
          : "Select your display language for the navigation, ritual guidance, and scoring verdicts."}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {LOCALE_OPTIONS.map((option) => {
          const isSelected = locale === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setLocale(option.id)}
              className={`rounded-md px-4 py-2 text-xs font-semibold transition ${
                isSelected
                  ? "bg-zinc-900 text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
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
