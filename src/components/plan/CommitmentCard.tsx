"use client";

import React, { useEffect, useState } from "react";
import type { CommitmentDto } from "@/lib/contracts";
import { apiFetch, ClientApiError } from "@/components/common/api";
import { useSettings } from "@/context/SettingsContext";

interface CommitmentCardProps {
  cycleId: number;
  cycleStatus: string;
}

export function CommitmentCard({ cycleId, cycleStatus }: CommitmentCardProps) {
  const { locale } = useSettings();
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
      } catch {
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
    return <div className="h-16 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!costs.trim() || !statement.trim()) {
      setError(
        !costs.trim()
          ? locale === "vi"
            ? "Hãy tính toán cái giá phải trả — sự thoải mái, thú vui nào bạn sẽ phải hy sinh?"
            : "Count the costs — what will this commitment cost you in comfort and pleasure?"
          : locale === "vi"
          ? 'Hãy viết tuyên ngôn cam kết: "Tôi chọn…".'
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
        setError(locale === "vi" ? "Không thể lưu cam kết." : "Failed to save commitment.");
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
        className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-xs dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex items-center gap-2 overflow-hidden text-xs text-zinc-700 dark:text-zinc-300">
          <span className="font-semibold text-zinc-900 dark:text-zinc-100 shrink-0">
            {locale === "vi" ? "Lời cam kết (Your commitment):" : "Your commitment:"}
          </span>
          <span className="truncate italic text-zinc-600 dark:text-zinc-400">“{commitment.statement}”</span>
        </div>
        <button
          type="button"
          onClick={() => {
            setCosts(commitment.costs);
            setStatement(commitment.statement);
            setIsEditing(true);
          }}
          className="no-print ml-3 shrink-0 rounded px-2.5 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          {locale === "vi" ? "Chỉnh sửa (Edit)" : "Edit"}
        </button>
      </div>
    );
  }

  // If null or editing: show form
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2 mb-3">
        <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
          {locale === "vi" ? "Thiết lập lời cam kết (Make it a commitment)." : "Make it a commitment."}
        </h3>
        {commitment && isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            {locale === "vi" ? "Hủy" : "Cancel"}
          </button>
        )}
      </div>

      <p className="text-xs text-zinc-500 mb-4 dark:text-zinc-400">
        {locale === "vi"
          ? "Cam kết là việc giữ lời hứa ngay cả khi cảm hứng ban đầu đã tan biến. Hãy tính trước những hy sinh để bạn không bất ngờ khi bước vào thung lũng."
          : "Commitment is keeping a promise long after the mood has passed. Count the sacrifices up front so you aren't surprised in the valley."}
      </p>

      {error && (
        <div className="mb-3 rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1 dark:text-zinc-300">
            {locale === "vi"
              ? "Tính toán cái giá phải trả (Count the costs — comfort, pleasure, some opportunities):"
              : "Count the costs — comfort, pleasure, some opportunities."}
          </label>
          <textarea
            value={costs}
            onChange={(e) => setCosts(e.target.value)}
            rows={2}
            placeholder={
              locale === "vi"
                ? "Bạn sẵn sàng từ bỏ điều gì? (Ví dụ: xem TV khuya, mua sắm tùy hứng, nhận thêm việc ngoài luồng...)"
                : "What will you have to give up? (e.g. late night TV, impulsive spending, saying yes to extra projects...)"
            }
            className="w-full rounded-lg border border-zinc-300 p-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-800 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1 dark:text-zinc-300">
            {locale === "vi" ? "Tuyên ngôn “Tôi chọn…” (“I choose to…”):" : "“I choose to…”"}
          </label>
          <textarea
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            rows={2}
            placeholder={
              locale === "vi"
                ? "Tôi chọn thực thi các hành động mỗi ngày bất kể cảm xúc, bởi vì..."
                : "I choose to execute my tactics daily regardless of mood or feeling, because..."
            }
            className="w-full rounded-lg border border-zinc-300 p-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-800 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>

        <div className="flex justify-end gap-2">
          {commitment && isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {locale === "vi" ? "Hủy" : "Cancel"}
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 transition dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {saving ? (locale === "vi" ? "Đang lưu..." : "Saving...") : (locale === "vi" ? "Cam kết (Commit)" : "Commit")}
          </button>
        </div>
      </form>
    </div>
  );
}
