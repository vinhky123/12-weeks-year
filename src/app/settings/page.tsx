"use client";

import { useSettings } from "@/context/SettingsContext";
import { DataSection } from "@/components/settings/DataSection";
import { ThemeSwitch } from "@/components/settings/ThemeSwitch";
import { LanguageSwitch } from "@/components/settings/LanguageSwitch";

export default function SettingsPage() {
  const { t, locale } = useSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
          {t("settings.title")}
        </h1>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {locale === "vi"
            ? "Tính di động dữ liệu cục bộ, giao diện và tùy chọn ngôn ngữ."
            : "Local-first data portability, appearance, and language preferences."}
        </p>
      </div>

      <div className="space-y-6">
        <DataSection />
        <ThemeSwitch />
        <LanguageSwitch />
      </div>
    </div>
  );
}
