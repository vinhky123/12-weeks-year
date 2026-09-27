"use client";

export interface GoalResultItem {
  goalId: number;
  title: string;
  percentComplete?: number | null;
  avgScore?: number | null;
  grade: number;
  note?: string;
}

interface ResultsStepProps {
  results: GoalResultItem[];
  onChange: (updated: GoalResultItem[]) => void;
  readOnly?: boolean;
}

export function ResultsStep({ results, onChange, readOnly = false }: ResultsStepProps) {
  const handleGradeChange = (index: number, newGrade: number) => {
    const clamped = Math.min(10, Math.max(1, newGrade));
    const next = results.map((r, i) => (i === index ? { ...r, grade: clamped } : r));
    onChange(next);
  };

  const handleNoteChange = (index: number, note: string) => {
    const next = results.map((r, i) => (i === index ? { ...r, note } : r));
    onChange(next);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900">Step 2: Results</h3>
        <p className="mt-1 text-xs text-slate-500">
          Grade your execution and outcome for each goal on a 1–10 scale. This is honest measurement, not self-judgment.
        </p>
      </div>

      <div className="space-y-4">
        {results.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs italic text-slate-400">
            No goals found for this cycle.
          </p>
        ) : (
          results.map((r, idx) => (
            <div
              key={r.goalId}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <h4 className="font-bold text-sm text-slate-900">{r.title}</h4>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  {r.percentComplete !== null && r.percentComplete !== undefined && (
                    <span>Lag: <strong>{r.percentComplete}%</strong></span>
                  )}
                  {r.avgScore !== null && r.avgScore !== undefined && (
                    <span>Tactics avg: <strong>{r.avgScore}%</strong></span>
                  )}
                </div>
              </div>

              {/* Grade Slider (1–10) */}
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Self-Assigned Grade (1–10)
                  </label>
                  <span className="text-sm font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                    {r.grade} / 10
                  </span>
                </div>

                {!readOnly ? (
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-semibold text-slate-400">1</span>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={r.grade}
                      disabled={readOnly}
                      onChange={(e) => handleGradeChange(idx, Number(e.target.value))}
                      className="w-full accent-slate-900 cursor-pointer"
                    />
                    <span className="text-[11px] font-semibold text-slate-400">10</span>
                  </div>
                ) : (
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-slate-800"
                      style={{ width: `${(r.grade / 10) * 100}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Notes &amp; Reflections (optional)
                </label>
                {readOnly ? (
                  <p className="text-xs text-slate-700 italic bg-slate-50 p-2.5 rounded-lg">
                    {r.note || "No notes recorded."}
                  </p>
                ) : (
                  <input
                    type="text"
                    value={r.note ?? ""}
                    onChange={(e) => handleNoteChange(idx, e.target.value)}
                    placeholder="What factors contributed to this result?"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:outline-none"
                  />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
