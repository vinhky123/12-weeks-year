"use client";

import { useState } from "react";

const DAYS_OPTIONS = [
  { value: 0, label: "Monday" },
  { value: 1, label: "Tuesday" },
  { value: 2, label: "Wednesday" },
  { value: 3, label: "Thursday" },
  { value: 4, label: "Friday" },
  { value: 5, label: "Saturday" },
  { value: 6, label: "Sunday" },
];

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (label: string, dayOfWeek: number) => Promise<void>;
}

export default function AddItemModal({
  isOpen,
  onClose,
  onAdd,
}: AddItemModalProps) {
  const [label, setLabel] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState<number>(0);
  const [showConfirmRevision, setShowConfirmRevision] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      setError("Item label is required.");
      return;
    }
    setError(null);
    // Show process-control discipline confirmation
    setShowConfirmRevision(true);
  };

  const handleConfirmAdd = async () => {
    try {
      setSubmitting(true);
      setError(null);
      await onAdd(label.trim(), dayOfWeek);
      setLabel("");
      setShowConfirmRevision(false);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to add plan item.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {!showConfirmRevision ? (
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Add Ad-hoc Task to Week Plan
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                &times;
              </button>
            </div>

            {error && (
              <div className="mt-3 rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleInitialSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Task Label
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Urgent client presentation follow-up"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Placed on Day
                </label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden"
                >
                  {DAYS_OPTIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!label.trim()}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition"
                >
                  Continue
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-amber-600">
              <span className="text-xl">⚠️</span>
              <h3 className="text-base font-bold text-slate-900">
                Plan Revision Confirmation
              </h3>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed font-medium bg-amber-50 border border-amber-200 rounded-xl p-4">
              This isn&rsquo;t from your 12-Week Plan. Adding it as a plan revision keeps the weekly plan strategic. Add anyway?
            </p>

            {error && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 font-medium">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfirmRevision(false)}
                disabled={submitting}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleConfirmAdd}
                disabled={submitting}
                className="rounded-lg bg-amber-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-500 disabled:opacity-50 transition"
              >
                {submitting ? "Adding..." : "Confirm & Add"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
