"use client";

import { useSettings } from "@/context/SettingsContext";
import type { Theme } from "@/lib/contracts";

export function ThemeSwitch() {
  const { theme, setTheme, t, locale } = useSettings();

  const themeOptions: { id: Theme; label: string }[] = [
    { id: "system", label: t("settings.theme_system") },
    { id: "light", label: t("settings.theme_light") },
    { id: "dark", label: t("settings.theme_dark") },
  ];

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
        {t("settings.appearance")}
      </h3>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        {locale === "vi"
          ? "Chọn chủ đề giao diện của bạn. Chế độ hệ thống tự động khớp với thiết bị."
          : "Choose your interface theme. System mode automatically matches your device preference."}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {themeOptions.map((option) => {
          const isSelected = theme === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setTheme(option.id)}
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
