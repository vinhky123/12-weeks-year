"use client";

import type { CycleDto, GoalWithTacticsDto, CycleScoresDto } from "@/lib/contracts";
import ScoreHistoryStrip from "@/components/dashboard/ScoreHistoryStrip";
import { ReviewSection } from "./ReviewSection";

interface CycleDetailProps {
  detail: {
    cycle: CycleDto;
    goals: GoalWithTacticsDto[];
    scores: CycleScoresDto;
    review: any;
    weeks: {
      weekNumber: number;
      status: string;
      reflection: string | null;
    }[];
  };
  onBack: () => void;
}

export function CycleDetail({ detail, onBack }: CycleDetailProps) {
  const { cycle, goals, scores, review, weeks } = detail;

  const reflectionsWithText = weeks.filter((w) => w.reflection && w.reflection.trim().length > 0);

  return (
    <div className="space-y-6">
      {/* Header & Back Affordance */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition mb-2"
        >
          ← Back to all cycles
        </button>

        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-slate-900">{cycle.name}</h2>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                {cycle.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Started {cycle.startDate}
              {cycle.archivedAt && <> · Archived {cycle.archivedAt.slice(0, 10)}</>}
            </p>
          </div>

          {scores.averageScore !== null && (
            <div className="text-right">
              <span className="text-xs text-slate-400 uppercase font-semibold">Cycle Average</span>
              <div className="text-xl font-black text-slate-900">{scores.averageScore}%</div>
            </div>
          )}
        </div>
      </div>

      {/* 12-Week Score Strip */}
      <div>
        <ScoreHistoryStrip scoreHistory={scores.weeks} currentWeekNumber={scores.currentWeek} />
      </div>

      {/* Goals List */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
          12-Week Goals ({goals.length})
        </h3>

        <div className="space-y-3">
          {goals.map((g) => (
            <div
              key={g.id}
              className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-xs space-y-1"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-bold text-slate-900">{g.title}</span>
                <span
                  className={`rounded px-1.5 py-0.2 text-[10px] font-semibold uppercase ${
                    g.status === "achieved"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {g.status}
                </span>
              </div>
              <p className="text-slate-500">
                Target: {g.lagMetricName} ({g.lagStart} → {g.lagTarget} {g.lagUnit}) · {g.tactics.length} tactics
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Retrospective Section */}
      <ReviewSection review={review} />

      {/* Weekly Reflections Timeline */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
          Weekly Reflections
        </h3>

        {reflectionsWithText.length === 0 ? (
          <p className="text-xs italic text-slate-400">No weekly reflections saved in this cycle.</p>
        ) : (
          <div className="space-y-3">
            {reflectionsWithText.map((w) => (
              <div key={w.weekNumber} className="border-l-2 border-slate-200 pl-3 py-1">
                <span className="font-bold text-xs text-slate-800">Week {w.weekNumber}</span>
                <p className="mt-0.5 text-xs text-slate-600 italic">“{w.reflection}”</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
