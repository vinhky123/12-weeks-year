"use client";

import { useState } from "react";

interface ValleyBannerProps {
  valleyGuidance: {
    headline: string;
    body: string;
  } | null;
}

export function ValleyBanner({ valleyGuidance }: ValleyBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!valleyGuidance || dismissed) {
    return null;
  }

  return (
    <div className="relative rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-sm text-amber-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white font-bold text-xs">
            !
          </div>
          <div>
            <h3 className="font-bold text-sm text-amber-900">{valleyGuidance.headline}</h3>
            <p className="mt-1 text-xs text-amber-800 leading-relaxed">{valleyGuidance.body}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded p-1 text-amber-600 hover:bg-amber-100 hover:text-amber-900"
          title="Dismiss for this session"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
