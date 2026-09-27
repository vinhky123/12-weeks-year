"use client";

import React, { useState } from "react";
import type { GoalWithTacticsDto, TacticDto, TacticCreate } from "@/lib/contracts";
import TacticForm from "./TacticForm";
import { useSettings } from "@/context/SettingsContext";

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
  const { locale } = useSettings();
  const [showTacticForm, setShowTacticForm] = useState(false);
  const [editingTacticId, setEditingTacticId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [dropping, setDropping] = useState(false);

  const isDropped = goal.status === "dropped";

  const handleDrop = async () => {
    const confirmed = window.confirm(
      locale === "vi"
        ? "Hủy mục tiêu này? Các hành động sẽ bị đóng băng từ tuần này. Dữ liệu lịch sử vẫn được giữ nguyên trung thực."
        : "Drop this goal? Its tactics freeze from this week. History stays honest.",
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
    const confirmed = window.confirm(
      locale === "vi"
        ? "Ngừng tính hành động này từ tuần này."
        : "Stops counting from this week.",
    );
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

  const statusLabel =
    locale === "vi"
      ? goal.status === "active"
        ? "Đang thực hiện"
        : goal.status === "achieved"
        ? "Đạt mục tiêu"
        : goal.status === "dropped"
        ? "Đã hủy"
        : "Không đạt"
      : goal.status;

  return (
    <div
      className={`rounded-lg border p-6 shadow-xs transition ${
        isDropped
          ? "border-zinc-200 bg-zinc-50/60 opacity-60 dark:border-zinc-800 dark:bg-zinc-900/40"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      }`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{goal.title}</h3>
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                isDropped
                  ? "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                  : "bg-zinc-100 text-zinc-800 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700"
              }`}
            >
              {statusLabel}
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              {locale === "vi" ? `Hạn chót: Tuần ${goal.deadlineWeek}` : `Deadline: Week ${goal.deadlineWeek}`}
            </span>
          </div>

          <p className="mt-1 text-sm text-zinc-600 italic dark:text-zinc-400">
            &ldquo;{goal.why}&rdquo;
          </p>

          <div className="mt-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
            <span className="text-zinc-400 uppercase font-semibold dark:text-zinc-500">
              {locale === "vi" ? "Chỉ số kết quả (Lag):" : "Lag:"}
            </span>{" "}
            {goal.lagMetricName} &middot; {goal.lagStart} &rarr; {goal.lagTarget}{" "}
            {goal.lagUnit}
          </div>
        </div>

        {!isDropped && (
          <button
            type="button"
            onClick={handleDrop}
            disabled={dropping}
            className="no-print rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition shrink-0 dark:border-zinc-800 dark:text-rose-400 dark:hover:bg-rose-950/40"
          >
            {dropping ? (locale === "vi" ? "Đang hủy..." : "Dropping...") : (locale === "vi" ? "Hủy mục tiêu" : "Drop Goal")}
          </button>
        )}
      </div>

      {/* Tactics section */}
      <div className="mt-6 border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Tactics ({goal.tactics.length})
          </h4>
          {!isDropped && !showTacticForm && (
            <button
              type="button"
              onClick={() => setShowTacticForm(true)}
              className="no-print text-xs font-semibold text-zinc-700 hover:text-zinc-900 transition dark:text-zinc-300 dark:hover:text-zinc-100"
            >
              {locale === "vi" ? "+ Thêm hành động (+ Add Tactic)" : "+ Add Tactic"}
            </button>
          )}
        </div>

        {goal.tactics.length === 0 ? (
          <p className="text-xs text-zinc-400 italic py-2 dark:text-zinc-500">
            {locale === "vi"
              ? "Chưa có hành động nào. Thêm các hành động cụ thể, bắt đầu bằng động từ để tạo nên kết quả này."
              : "No tactics defined. Add the specific, verb-first actions that produce this goal."}
          </p>
        ) : (
          <div className="space-y-2">
            {goal.tactics.map((tactic) => {
              const isDeactivated = tactic.deactivatedAtWeek !== null;

              return (
                <div
                  key={tactic.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border p-3 text-sm transition ${
                    isDeactivated
                      ? "border-zinc-200 bg-zinc-100/50 opacity-60 dark:border-zinc-800 dark:bg-zinc-900/40"
                      : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    {/* Badge */}
                    <span className="shrink-0 rounded-md bg-zinc-100 border border-zinc-200 px-2 py-0.5 text-xs font-bold text-zinc-800 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200">
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
                          className="flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(tactic.id)}
                          className="rounded bg-zinc-900 px-2 py-1 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
                        >
                          {locale === "vi" ? "Lưu" : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTacticId(null)}
                          className="rounded bg-zinc-200 px-2 py-1 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        >
                          {locale === "vi" ? "Hủy" : "Cancel"}
                        </button>
                      </div>
                    ) : (
                      <span className="text-zinc-900 dark:text-zinc-100 font-medium truncate">
                        {tactic.text}
                      </span>
                    )}

                    {isDeactivated && (
                      <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 shrink-0 dark:bg-zinc-800 dark:text-zinc-400">
                        {locale === "vi" ? `đến hết tuần ${tactic.deactivatedAtWeek}` : `through week ${tactic.deactivatedAtWeek}`}
                      </span>
                    )}
                  </div>

                  {/* Actions on active tactics */}
                  {!isDeactivated && !isDropped && editingTacticId !== tactic.id && (
                    <div className="no-print flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(tactic)}
                        className="text-xs text-zinc-500 hover:text-zinc-900 transition dark:text-zinc-400 dark:hover:text-zinc-100"
                      >
                        {locale === "vi" ? "Sửa" : "Edit"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeactivate(tactic)}
                        className="text-xs text-rose-500 hover:text-rose-700 transition dark:text-rose-400 dark:hover:text-rose-300"
                      >
                        {locale === "vi" ? "Ngừng tính" : "Deactivate"}
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
