"use client";

import { useState } from "react";
import type { LeadMeasureDto } from "@/lib/contracts";
import { apiFetch, ClientApiError } from "@/components/common/api";

interface AddLeadMeasureFormProps {
  goalId: number;
  onAdded: (newMeasure: LeadMeasureDto) => void;
}

export function AddLeadMeasureForm({ goalId, onAdded }: AddLeadMeasureFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("3");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    const targetNum = parseInt(target, 10);

    if (!trimmed) {
      setError("Lead measure name is required.");
      return;
    }
    if (isNaN(targetNum) || targetNum < 1) {
      setError("Weekly target must be an integer ≥ 1.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const created = await apiFetch<LeadMeasureDto>(`/api/goals/${goalId}/lead-measures`, {
        method: "POST",
        body: JSON.stringify({
          name: trimmed,
          weeklyTarget: targetNum,
        }),
      });

      onAdded(created);
      setName("");
      setTarget("3");
      setOpen(false);
    } catch (err) {
      if (err instanceof ClientApiError) {
        setError(err.message);
      } else {
        setError("Failed to create lead measure.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-400 hover:text-slate-900"
      >
        <span className="font-bold">+</span> Add lead indicator
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-xs text-slate-800">Add Lead Measure</span>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="text-slate-400 hover:text-slate-600 text-xs"
        >
          Cancel
        </button>
      </div>

      {error && (
        <p className="mb-2 rounded bg-rose-50 p-2 text-xs font-medium text-rose-700">{error}</p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Activity name (e.g. Prospecting calls, Gym sessions)"
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-slate-800 focus:outline-none"
        />
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 whitespace-nowrap">Target/wk:</label>
          <input
            type="number"
            min="1"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 focus:border-slate-800 focus:outline-none"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? "Adding..." : "Add"}
          </button>
        </div>
      </div>
    </form>
  );
}
