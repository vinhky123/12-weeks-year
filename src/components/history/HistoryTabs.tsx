"use client";

import { useSettings } from "@/context/SettingsContext";

interface HistoryTabsProps {
  activeTab: "cycles" | "insights";
  onTabChange: (tab: "cycles" | "insights") => void;
}

export function HistoryTabs({ activeTab, onTabChange }: HistoryTabsProps) {
  const { t } = useSettings();

  return (
    <div className="flex border-b border-zinc-200 dark:border-zinc-800">
      <button
        type="button"
        onClick={() => onTabChange("cycles")}
        className={`border-b-2 px-4 py-2.5 text-xs font-bold transition ${
          activeTab === "cycles"
            ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
            : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
        }`}
      >
        {t("history.tab_cycles")}
      </button>
      <button
        type="button"
        onClick={() => onTabChange("insights")}
        className={`border-b-2 px-4 py-2.5 text-xs font-bold transition ${
          activeTab === "insights"
            ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
            : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
        }`}
      >
        {t("history.tab_insights")}
      </button>
    </div>
  );
}
