"use client";

import { useState } from "react";
import type { VisionDto, VisionUpdate } from "@/lib/contracts";
import { apiFetch, ClientApiError } from "@/components/common/api";
import { useI18n } from "@/context/SettingsContext";

interface VisionEditorProps {
  initialVision: VisionDto | null;
  readOnly?: boolean;
}

export function VisionEditor({ initialVision, readOnly = false }: VisionEditorProps) {
  const { t } = useI18n();
  const [vision, setVision] = useState<VisionDto | null>(initialVision);
  const [visionText, setVisionText] = useState(initialVision?.longTerm ?? "");

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dirty tracking
  const initialLongTerm = vision?.longTerm ?? "";
  const isDirty = visionText !== initialLongTerm;

  const handleSave = async () => {
    if (!isDirty || saving) return;

    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    const payload: VisionUpdate = {
      longTerm: visionText,
      threeYear: visionText,
      cycleConnection: visionText,
    };

    try {
      const res = await apiFetch<{ vision: VisionDto }>("/api/vision", {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      setVision(res.vision);
      setVisionText(res.vision.longTerm);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      if (err instanceof ClientApiError) {
        setError(err.message);
      } else {
        setError(t("common.error"));
      }
    } finally {
      setSaving(false);
    }
  };

  const formatLastSaved = (isoString?: string) => {
    if (!isoString) return null;
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return null;
    }
  };

  return (
    <div className="relative space-y-6 pb-28">
      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 p-4 text-sm text-rose-800 dark:text-rose-200">
          <p className="font-semibold">Không thể lưu tầm nhìn</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {/* Single Consolidated Vision Card */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {t("nav.vision")}
            </h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
              Ví dụ tầm nhìn · Example Vision
            </span>
          </div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            5 – 15 năm tới &amp; chu kỳ 12 tuần
          </span>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          Động cơ cảm xúc kết nối lý do sâu xa nhất với hành động thực thi hàng ngày. Hãy viết một tầm nhìn rõ ràng, truyền cảm hứng và không giới hạn:
        </p>

        <div className="mt-4">
          {readOnly ? (
            <div className="min-h-[140px] whitespace-pre-wrap rounded-md bg-zinc-50 p-4 text-sm leading-relaxed text-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-200">
              {visionText || <span className="italic text-zinc-400 dark:text-zinc-500">Chưa nhập tầm nhìn.</span>}
            </div>
          ) : (
            <textarea
              value={visionText}
              onChange={(e) => setVisionText(e.target.value)}
              placeholder="Suy nghĩ không giới hạn. Cuộc sống của bạn sẽ thế nào trong 5, 10 hoặc 15 năm tới? Làm chủ thời gian, tự do làm việc từ bất cứ đâu, chăm sóc gia đình và sức khỏe..."
              rows={6}
              className="w-full rounded-md border border-zinc-300 bg-zinc-50/40 p-4 text-sm leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-800 focus:bg-white focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-400 dark:focus:bg-zinc-900"
            />
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
          <svg className="h-4 w-4 shrink-0 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Tầm nhìn không mang tính cá nhân hoặc quá nhỏ bé sẽ không thể vượt qua thung lũng thử thách.</span>
        </div>
      </div>

      {/* Sticky Save Bar (hidden in readOnly) */}
      {!readOnly && (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 px-8 py-3.5 backdrop-blur shadow-lg">
          <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="flex flex-col">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {vision?.updatedAt ? (
                  <>{t("vision.lastSaved")}: {formatLastSaved(vision.updatedAt)}</>
                ) : (
                  <>{t("vision.notSavedYet")}</>
                )}
                {isDirty && <span className="ml-2 font-medium text-amber-600 dark:text-amber-400">({t("vision.unsavedChanges")})</span>}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {saveSuccess && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t("vision.saved")}
                </span>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={!isDirty || saving}
                className="inline-flex items-center justify-center rounded-md bg-zinc-900 dark:bg-zinc-100 px-5 py-2 text-sm font-semibold text-white dark:text-zinc-900 shadow-xs transition hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin text-white dark:text-zinc-900" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    {t("vision.saving")}
                  </span>
                ) : (
                  t("vision.save")
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
