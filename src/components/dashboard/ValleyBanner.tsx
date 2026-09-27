"use client";

import React, { useState } from "react";
import { useSettings } from "@/context/SettingsContext";

interface ValleyBannerProps {
  valleyGuidance: {
    headline: string;
    body: string;
  } | null;
}

export function ValleyBanner({ valleyGuidance }: ValleyBannerProps) {
  const { locale } = useSettings();
  const [dismissed, setDismissed] = useState(false);

  if (!valleyGuidance || dismissed) {
    return null;
  }

  const headline =
    locale === "vi" && valleyGuidance.headline.includes("Valley")
      ? "Thung lũng Tuần 4 — Kỷ luật cảm xúc"
      : valleyGuidance.headline;

  const body =
    locale === "vi" && valleyGuidance.body.includes("dip")
      ? "Điểm số thường giảm tự nhiên ở các tuần 3–4 khi cảm giác hào hứng ban đầu qua đi. Hãy kiên định bám sát kế hoạch — đây là chẩn đoán thực tế, không phán xét."
      : valleyGuidance.body;

  return (
    <div className="relative rounded-xl border border-zinc-300 bg-zinc-100 p-4 shadow-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white font-bold text-xs dark:bg-zinc-100 dark:text-zinc-900">
            !
          </div>
          <div>
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{headline}</h3>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">{body}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-200 transition"
          title={locale === "vi" ? "Đóng thông báo này" : "Dismiss for this session"}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
