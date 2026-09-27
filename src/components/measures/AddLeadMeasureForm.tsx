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
      setError("Tên chỉ số dẫn dắt không được để trống.");
      return;
    }
    if (isNaN(targetNum) || targetNum < 1) {
      setError("Mục tiêu hàng tuần phải là số nguyên ≥ 1.");
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
        setError("Không thể tạo chỉ số dẫn dắt.");
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
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:border-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <span className="font-bold">+</span> Thêm chỉ số dẫn dắt
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-3.5">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">Thêm chỉ số dẫn dắt</span>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 text-xs"
        >
          Hủy
        </button>
      </div>

      {error && (
        <p className="mb-2 rounded border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 p-2 text-xs font-medium text-rose-700 dark:text-rose-300">{error}</p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tên hoạt động (VD: Cuộc gọi khách hàng, Tập gym)"
          className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-100 focus:outline-none placeholder:text-zinc-400"
        />
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">Mục tiêu/tuần:</label>
          <input
            type="number"
            min="1"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-16 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-100 focus:outline-none"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-zinc-900 dark:bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50"
          >
            {saving ? "Đang thêm..." : "Thêm"}
          </button>
        </div>
      </div>
    </form>
  );
}
