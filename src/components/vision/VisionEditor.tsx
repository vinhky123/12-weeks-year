"use client";

import { useState } from "react";
import type { VisionDto, VisionUpdate, LifeDomainDto } from "@/lib/contracts";
import { VisionSection } from "./VisionSection";
import { LifeDomainList } from "./LifeDomainList";
import { apiFetch, ClientApiError } from "@/components/common/api";

interface VisionEditorProps {
  initialVision: VisionDto | null;
  readOnly?: boolean;
}

export function VisionEditor({ initialVision, readOnly = false }: VisionEditorProps) {
  const [vision, setVision] = useState<VisionDto | null>(initialVision);

  const [longTerm, setLongTerm] = useState(initialVision?.longTerm ?? "");
  const [threeYear, setThreeYear] = useState(initialVision?.threeYear ?? "");
  const [cycleConnection, setCycleConnection] = useState(initialVision?.cycleConnection ?? "");
  const [lifeDomains, setLifeDomains] = useState<LifeDomainDto[]>(initialVision?.lifeDomains ?? []);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dirty tracking
  const initialLongTerm = vision?.longTerm ?? "";
  const initialThreeYear = vision?.threeYear ?? "";
  const initialCycleConnection = vision?.cycleConnection ?? "";
  const initialLifeDomains = vision?.lifeDomains ?? [];

  const isLongTermDirty = longTerm !== initialLongTerm;
  const isThreeYearDirty = threeYear !== initialThreeYear;
  const isCycleConnectionDirty = cycleConnection !== initialCycleConnection;
  const isLifeDomainsDirty =
    JSON.stringify(lifeDomains) !== JSON.stringify(initialLifeDomains);

  const isDirty =
    isLongTermDirty || isThreeYearDirty || isCycleConnectionDirty || isLifeDomainsDirty;

  const handleSave = async () => {
    if (!isDirty || saving) return;

    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    const payload: VisionUpdate = {};
    if (isLongTermDirty) payload.longTerm = longTerm;
    if (isThreeYearDirty) payload.threeYear = threeYear;
    if (isCycleConnectionDirty) payload.cycleConnection = cycleConnection;
    if (isLifeDomainsDirty) payload.lifeDomains = lifeDomains;

    try {
      const res = await apiFetch<{ vision: VisionDto }>("/api/vision", {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      setVision(res.vision);
      setLongTerm(res.vision.longTerm);
      setThreeYear(res.vision.threeYear);
      setCycleConnection(res.vision.cycleConnection);
      setLifeDomains(res.vision.lifeDomains);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      if (err instanceof ClientApiError) {
        setError(err.message);
      } else {
        setError("Failed to save vision. Please try again.");
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
    <div className="relative space-y-8 pb-28">
      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <p className="font-semibold">Unable to save vision</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {/* Visual thread container */}
      <div className="relative space-y-6">
        <div className="absolute left-10 top-10 bottom-10 -z-10 w-0.5 bg-slate-200" />

        {/* Section 1: Long-term */}
        <VisionSection
          step={1}
          title="Long-Term Vision"
          subtitle="5–15+ Years"
          prompt="Five to fifteen years out. What does an ideal ordinary Tuesday look like?"
          value={longTerm}
          onChange={setLongTerm}
          placeholder="Unconstrained thinking. What does life look like in 5, 10, or 15 years? Career, health, lifestyle, impact..."
          readOnly={readOnly}
        />

        {/* Section 2: Three-year */}
        <VisionSection
          step={2}
          title="Three-Year Vision"
          subtitle="~36 Months"
          prompt="Three years: the bridge between the dream and this quarter."
          value={threeYear}
          onChange={setThreeYear}
          placeholder="Concrete milestones. What needs to happen in 3 years to make the long-term vision possible?"
          readOnly={readOnly}
        />

        {/* Section 3: Cycle Connection */}
        <VisionSection
          step={3}
          title="This Cycle's Connection"
          subtitle="Current 12-Week Cycle"
          prompt="Why does this cycle matter? What must be true at week 12?"
          value={cycleConnection}
          onChange={setCycleConnection}
          placeholder="Why does this specific 12-week year matter? What tangible progress will you look back on?"
          readOnly={readOnly}
        />
      </div>

      {/* Life Domains */}
      <LifeDomainList domains={lifeDomains} onChange={setLifeDomains} readOnly={readOnly} />

      {/* Sticky Save Bar (hidden in readOnly) */}
      {!readOnly && (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/95 px-8 py-4 backdrop-blur shadow-lg">
          <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="flex flex-col">
              <span className="text-xs text-slate-500">
                {vision?.updatedAt ? (
                  <>Last saved: {formatLastSaved(vision.updatedAt)}</>
                ) : (
                  <>Draft not saved yet</>
                )}
                {isDirty && <span className="ml-2 font-medium text-amber-600">(unsaved changes)</span>}
              </span>
              <p className="text-[11px] text-slate-400">
                A vision that isn&apos;t personal, isn&apos;t linked to daily actions, or is too small won&apos;t survive the valley.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {saveSuccess && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved
                </span>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={!isDirty || saving}
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Saving...
                  </span>
                ) : (
                  "Save vision"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
