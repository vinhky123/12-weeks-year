"use client";

import { useState } from "react";
import type { MeasuresOverviewDto, LeadMeasureDto } from "@/lib/contracts";
import { LagChart } from "./LagChart";
import { LeadMeasureRow } from "./LeadMeasureRow";
import { AddLeadMeasureForm } from "./AddLeadMeasureForm";
import { DiagnosisBanner } from "./DiagnosisBanner";

type GoalData = MeasuresOverviewDto["goals"][number];

interface GoalMeasuresSectionProps {
  goalData: GoalData;
  currentWeek: number;
}

export function GoalMeasuresSection({ goalData, currentWeek }: GoalMeasuresSectionProps) {
  const { goal, lagSeries, lagProgress, latestLag, currentWeekScore, diagnosis } = goalData;

  const [leadMeasures, setLeadMeasures] = useState(goalData.leadMeasures);

  const handleLeadAdded = (newMeasure: LeadMeasureDto) => {
    setLeadMeasures((prev) => [
      ...prev,
      {
        id: newMeasure.id,
        name: newMeasure.name,
        weeklyTarget: newMeasure.weeklyTarget,
        series: [],
        thisWeek: null,
      },
    ]);
  };

  const handleLeadUpdated = (id: number, updated: { name: string; weeklyTarget: number }) => {
    setLeadMeasures((prev) =>
      prev.map((m) => (m.id === id ? { ...m, name: updated.name, weeklyTarget: updated.weeklyTarget } : m))
    );
  };

  const handleLeadDeleted = (id: number) => {
    setLeadMeasures((prev) => prev.filter((m) => m.id !== id));
  };

  const handleLeadLogged = (leadMeasureId: number, weekNumber: number, value: number) => {
    setLeadMeasures((prev) =>
      prev.map((m) => {
        if (m.id !== leadMeasureId) return m;

        // Upsert series point
        const existingIdx = m.series.findIndex((s) => s.week === weekNumber);
        let nextSeries = [...m.series];
        if (existingIdx >= 0) {
          nextSeries[existingIdx] = { week: weekNumber, value };
        } else {
          nextSeries.push({ week: weekNumber, value });
        }

        const isCurrentWeek = weekNumber === currentWeek;
        return {
          ...m,
          series: nextSeries,
          thisWeek: isCurrentWeek ? value : m.thisWeek,
        };
      })
    );
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Goal Header */}
      <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-baseline border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{goal.title}</h3>
          <p className="text-xs text-slate-500">
            Target: {goal.lagMetricName} ({goal.lagStart} → {goal.lagTarget} {goal.lagUnit})
          </p>
        </div>
        {currentWeekScore && (
          <div className="text-xs">
            <span className="text-slate-400">Tactics score: </span>
            <span className="font-bold text-slate-700">{currentWeekScore.scorePct}%</span>
          </div>
        )}
      </div>

      {/* Diagnosis Banner (verbatim copy) */}
      {diagnosis && <DiagnosisBanner diagnosis={diagnosis} />}

      {/* Lag Indicator Component */}
      <LagChart
        goalTitle={goal.title}
        lagMetricName={goal.lagMetricName}
        lagUnit={goal.lagUnit}
        lagStart={goal.lagStart}
        lagTarget={goal.lagTarget}
        latestLag={latestLag}
        lagProgress={lagProgress}
        lagSeries={lagSeries}
      />

      {/* Lead Measures Section */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-bold text-sm text-slate-800">Lead Indicators</h4>
            <p className="text-xs text-slate-500">
              Lead indicators are the activities you control — the lag follows.
            </p>
          </div>
          <AddLeadMeasureForm goalId={goal.id} onAdded={handleLeadAdded} />
        </div>

        {leadMeasures.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center">
            <p className="text-xs italic text-slate-400">
              No lead indicators configured for this goal yet. Add activities that drive your lag result.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {leadMeasures.map((measure) => (
              <LeadMeasureRow
                key={measure.id}
                id={measure.id}
                name={measure.name}
                weeklyTarget={measure.weeklyTarget}
                thisWeek={measure.thisWeek}
                series={measure.series}
                currentWeek={currentWeek}
                onUpdate={handleLeadUpdated}
                onDelete={handleLeadDeleted}
                onLogSuccess={handleLeadLogged}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
