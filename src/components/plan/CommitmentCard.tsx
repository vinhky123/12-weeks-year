"use client";

import { useEffect, useState } from "react";
import type { CommitmentDto } from "@/lib/contracts";
import { apiFetch, ClientApiError } from "@/components/common/api";

interface CommitmentCardProps {
  cycleId: number;
  cycleStatus: string;
}

export function CommitmentCard({ cycleId, cycleStatus }: CommitmentCardProps) {
  const [commitment, setCommitment] = useState<CommitmentDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const [costs, setCosts] = useState("");
  const [statement, setStatement] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchCommitment() {
      try {
        setLoading(true);
        setError(null);
        const res = await apiFetch<{ commitment: CommitmentDto | null }>(
          `/api/cycles/${cycleId}/commitment`
        );
        if (active) {
          setCommitment(res.commitment);
          if (res.commitment) {
            setCosts(res.commitment.costs);
            setStatement(res.commitment.statement);
          }
        }
      } catch (err) {
        // Ignore 404 or cycle fetch errors gracefully
      } finally {
        if (active) setLoading(false);
      }
    }

    if (cycleStatus === "planning" || cycleStatus === "active") {
      fetchCommitment();
    } else {
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [cycleId, cycleStatus]);

  if (cycleStatus !== "planning" && cycleStatus !== "active") {
    return null;
  }

  if (loading) {
    return <div className="h-16 animate-pulse rounded-xl bg-slate-100" />;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!costs.trim() || !statement.trim()) {
      setError(
        !costs.trim()
          ? "Count the costs — what will this commitment cost you in comfort and pleasure?"
          : 'Write your commitment: "I choose to…".'
      );
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await apiFetch<{ commitment: CommitmentDto }>(
        `/api/cycles/${cycleId}/commitment`,
        {
          method: "PUT",
          body: JSON.stringify({
            costs: costs.trim(),
            statement: statement.trim(),
          }),
        }
      );
      setCommitment(res.commitment);
      setIsEditing(false);
    } catch (err) {
      if (err instanceof ClientApiError) {
        setError(err.message);
      } else {
        setError("Failed to save commitment.");
      }
    } finally {
      setSaving(false);
    }
  };

  // If saved and not editing: show collapsed reminder
  if (commitment && !isEditing) {
    return (
      <div
        data-testid="commitment-card"
        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xs"
      >
        <div className="flex items-center gap-2 overflow-hidden text-xs text-slate-700">
          <span className="font-semibold text-slate-900 shrink-0">Your commitment:</span>
          <span className="truncate italic text-slate-600">“{commitment.statement}”</span>
        </div>
        <button
          type="button"
          onClick={() => {
            setCosts(commitment.costs);
            setStatement(commitment.statement);
            setIsEditing(true);
          }}
          className="ml-3 shrink-0 rounded px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        >
          Edit
        </button>
      </div>
    );
  }

  // If null or editing: show form
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex items-baseline justify-between border-b border-slate-100 pb-2 mb-3">
        <h3 className="font-bold text-sm text-slate-900">Make it a commitment.</h3>
        {commitment && isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            Cancel
          </button>
        )}
      </div>

      <p className="text-xs text-slate-500 mb-4">
        Commitment is keeping a promise long after the mood has passed. Count the sacrifices up front so you aren&apos;t surprised in the valley.
      </p>

      {error && (
        <div className="mb-3 rounded-lg bg-rose-50 p-2.5 text-xs font-medium text-rose-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Count the costs — comfort, pleasure, some opportunities.
          </label>
          <textarea
            value={costs}
            onChange={(e) => setCosts(e.target.value)}
            rows={2}
            placeholder="What will you have to give up? (e.g. late night TV, impulsive spending, saying yes to extra projects...)"
            className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            &ldquo;I choose to…&rdquo;
          </label>
          <textarea
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            rows={2}
            placeholder="I choose to execute my tactics daily regardless of mood or feeling, because..."
            className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-2">
          {commitment && isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Commit"}
          </button>
        </div>
      </form>
    </div>
  );
}
