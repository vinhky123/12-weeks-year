"use client";

import type { CelebrationDto } from "@/lib/contracts";

interface CelebrateStepProps {
  celebration: CelebrationDto;
}

export function CelebrateStep({ celebration }: CelebrateStepProps) {
  const { cycleName, bestWeek, averageScore, goalsCompleted, goalsTotal } = celebration;

  return (
    <div className="space-y-6 text-center py-4">
      {/* Celebration Header */}
      <div className="space-y-2">
        <span className="inline-block text-3xl animate-bounce">🎉</span>
        <h2 className="text-2xl font-black tracking-tight text-slate-900">
          Celebrate before you analyze.
        </h2>
        <p className="mx-auto max-w-lg text-xs text-slate-500">
          Most people rush straight into analyzing their failures or planning the next grind. Stop and acknowledge what was executed in {cycleName}.
        </p>
      </div>

      {/* Wins Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2">
        {/* Best Week */}
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-white p-5 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
            Peak Execution
          </span>
          <div className="mt-2 text-2xl font-black text-emerald-950">
            {bestWeek ? `${bestWeek.scorePct}%` : "—"}
          </div>
          <p className="mt-1 text-xs text-emerald-700">
            {bestWeek ? `Week ${bestWeek.week} was your best week` : "No scored weeks recorded"}
          </p>
        </div>

        {/* Average Score */}
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-5 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
            12-Week Average
          </span>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {averageScore !== null ? `${averageScore}%` : "—"}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {celebration.scoredWeeks} weeks executed
          </p>
        </div>

        {/* Goals Achieved */}
        <div className="rounded-2xl border border-violet-200 bg-gradient-to-b from-violet-50 to-white p-5 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-violet-800">
            Goals Achieved
          </span>
          <div className="mt-2 text-2xl font-black text-violet-950">
            {goalsCompleted} of {goalsTotal}
          </div>
          <p className="mt-1 text-xs text-violet-700">
            {goalsTotal > 0 ? `${Math.round((goalsCompleted / goalsTotal) * 100)}% completion rate` : "No active goals"}
          </p>
        </div>
      </div>

      {/* Book Reflection Quote */}
      <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 text-xs italic text-slate-600 max-w-xl mx-auto">
        &ldquo;Success is not about perfection — it is about the discipline of consistent action. Every percentage point above your baseline is compounded growth.&rdquo;
      </div>
    </div>
  );
}
