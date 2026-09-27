"use client";

import { useState } from "react";
import type { GoalWithTacticsDto, TacticDto, TacticCreate } from "@/lib/contracts";
import TacticForm from "./TacticForm";

interface GoalCardProps {
  goal: GoalWithTacticsDto;
  currentWeekNumber: number;
  onDropGoal: (goalId: number) => Promise<void>;
  onAddTactic: (goalId: number, data: TacticCreate) => Promise<void>;
  onDeactivateTactic: (tacticId: number) => Promise<void>;
  onUpdateTacticText: (tacticId: number, text: string) => Promise<void>;
}

export default function GoalCard({
  goal,
  currentWeekNumber,
  onDropGoal,
  onAddTactic,
  onDeactivateTactic,
  onUpdateTacticText,
}: GoalCardProps) {
  const [showTacticForm, setShowTacticForm] = useState(false);
  const [editingTacticId, setEditingTacticId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [dropping, setDropping] = useState(false);

  const isDropped = goal.status === "dropped";

  const handleDrop = async () => {
    const confirmed = window.confirm(
      "Drop this goal? Its tactics freeze from this week. History stays honest.",
    );
    if (!confirmed) return;
    try {
      setDropping(true);
      await onDropGoal(goal.id);
    } finally {
      setDropping(false);
    }
  };

  const handleDeactivate = async (tactic: TacticDto) => {
    const confirmed = window.confirm("Stops counting from this week.");
    if (!confirmed) return;
    await onDeactivateTactic(tactic.id);
  };

  const handleStartEdit = (tactic: TacticDto) => {
    setEditingTacticId(tactic.id);
    setEditText(tactic.text);
  };

  const handleSaveEdit = async (tacticId: number) => {
    if (!editText.trim()) return;
    await onUpdateTacticText(tacticId, editText.trim());
    setEditingTacticId(null);
  };

  return (
    <div
      className={`rounded-2xl border p-6 shadow-xs transition ${
        isDropped
          ? "border-slate-200 bg-slate-50/60 opacity-60"
          : "border-slate-200 bg-white"
      }`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-bold text-slate-900">{goal.title}</h3>
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                isDropped
                  ? "bg-slate-200 text-slate-600"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}
            >
              {goal.status}
            </span>
            <span className="text-xs text-slate-400">
              Deadline: Week {goal.deadlineWeek}
            </span>
          </div>

          <p className="mt-1 text-sm text-slate-600 italic">
            &ldquo;{goal.why}&rdquo;
          </p>

          <div className="mt-2 text-xs font-medium text-slate-700">
            <span className="text-slate-400 uppercase font-semibold">Lag:</span>{" "}
            {goal.lagMetricName} &middot; {goal.lagStart} &rarr; {goal.lagTarget}{" "}
            {goal.lagUnit}
          </div>
        </div>

        {!isDropped && (
          <button
            type="button"
            onClick={handleDrop}
            disabled={dropping}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition shrink-0"
          >
            {dropping ? "Dropping..." : "Drop Goal"}
          </button>
        )}
      </div>

      {/* Tactics section */}
      <div className="mt-6 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Tactics ({goal.tactics.length})
          </h4>
          {!isDropped && !showTacticForm && (
            <button
              type="button"
              onClick={() => setShowTacticForm(true)}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 transition"
            >
              + Add Tactic
            </button>
          )}
        </div>

        {goal.tactics.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">
            No tactics defined. Add the specific, verb-first actions that produce this goal.
          </p>
        ) : (
          <div className="space-y-2">
            {goal.tactics.map((tactic) => {
              const isDeactivated = tactic.deactivatedAtWeek !== null;

              return (
                <div
                  key={tactic.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border p-3 text-sm transition ${
                    isDeactivated
                      ? "border-slate-200 bg-slate-100/50 opacity-60"
                      : "border-slate-100 bg-slate-50/50 hover:border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    {/* Badge */}
                    <span className="shrink-0 rounded-md bg-white border border-slate-200 px-2 py-0.5 text-xs font-bold text-slate-700">
                      {tactic.duePattern.type === "EVERY_WEEK"
                        ? `${tactic.duePattern.timesPerWeek}×/week`
                        : tactic.duePattern.weeks.map((w) => `W${w}`).join(", ")}
                    </span>

                    {/* Text / Editing */}
                    {editingTacticId === tactic.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:outline-hidden"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(tactic.id)}
                          className="rounded bg-slate-900 px-2 py-1 text-xs font-semibold text-white"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTacticId(null)}
                          className="rounded bg-slate-200 px-2 py-1 text-xs text-slate-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-800 font-medium truncate">
                        {tactic.text}
                      </span>
                    )}

                    {isDeactivated && (
                      <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 shrink-0">
                        through week {tactic.deactivatedAtWeek}
                      </span>
                    )}
                  </div>

                  {/* Actions on active tactics */}
                  {!isDeactivated && !isDropped && editingTacticId !== tactic.id && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(tactic)}
                        className="text-xs text-slate-500 hover:text-slate-800 transition"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeactivate(tactic)}
                        className="text-xs text-rose-500 hover:text-rose-700 transition"
                      >
                        Deactivate
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {showTacticForm && (
          <TacticForm
            onAdd={async (data) => {
              await onAddTactic(goal.id, data);
              setShowTacticForm(false);
            }}
            onCancel={() => setShowTacticForm(false)}
          />
        )}
      </div>
    </div>
  );
}
