"use client";

import { useState } from "react";
import type { DuePattern, TacticCreate } from "@/lib/contracts";
import DuePatternInput from "./DuePatternInput";

interface TacticFormProps {
  onAdd: (data: TacticCreate) => Promise<void>;
  onCancel: () => void;
}

export default function TacticForm({ onAdd, onCancel }: TacticFormProps) {
  const [text, setText] = useState("");
  const [duePattern, setDuePattern] = useState<DuePattern>({
    type: "EVERY_WEEK",
    timesPerWeek: 3,
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setError("Tactic text is required.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onAdd({ text: text.trim(), duePattern });
      setText("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to add tactic.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
          New Tactic
        </label>
        <p className="text-xs text-slate-500 mt-0.5">
          Verb-first and concrete: &lsquo;Perform 30-min strength training 3&times;/week&rsquo;.
        </p>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Write 500 words daily"
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:outline-hidden"
          disabled={submitting}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
          Due Pattern
        </label>
        <DuePatternInput
          value={duePattern}
          onChange={setDuePattern}
          disabled={submitting}
        />
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700 font-medium">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || !text.trim()}
          className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition"
        >
          {submitting ? "Adding..." : "Add Tactic"}
        </button>
      </div>
    </form>
  );
}
