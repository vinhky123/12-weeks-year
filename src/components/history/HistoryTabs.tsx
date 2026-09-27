"use client";

interface HistoryTabsProps {
  activeTab: "cycles" | "insights";
  onTabChange: (tab: "cycles" | "insights") => void;
}

export function HistoryTabs({ activeTab, onTabChange }: HistoryTabsProps) {
  return (
    <div className="flex border-b border-slate-200">
      <button
        type="button"
        onClick={() => onTabChange("cycles")}
        className={`border-b-2 px-4 py-2.5 text-xs font-bold transition ${
          activeTab === "cycles"
            ? "border-slate-900 text-slate-900"
            : "border-transparent text-slate-500 hover:text-slate-800"
        }`}
      >
        Cycles
      </button>
      <button
        type="button"
        onClick={() => onTabChange("insights")}
        className={`border-b-2 px-4 py-2.5 text-xs font-bold transition ${
          activeTab === "insights"
            ? "border-slate-900 text-slate-900"
            : "border-transparent text-slate-500 hover:text-slate-800"
        }`}
      >
        Insights
      </button>
    </div>
  );
}
