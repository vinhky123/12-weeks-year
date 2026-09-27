"use client";

export interface DisciplineItem {
  name: string;
  rating: number;
}

export const BOOK_DISCIPLINES = [
  "Vision",
  "12-Week Planning",
  "Weekly Routine (Score · Plan · WAM)",
  "Performance Time (Blocks)",
  "Key Measures",
];

const DISCIPLINE_HINTS: Record<string, string> = {
  Vision: "Emotional connection to long-term and 3-year outcomes; clear 'why'.",
  "12-Week Planning": "Clear 12-week targets and specific weekly tactics that drive them.",
  "Weekly Routine (Score · Plan · WAM)": "Using weekly plans, daily checklists, and honest WAM accountability.",
  "Performance Time (Blocks)": "Allocating strategic, buffer, and breakout blocks into your model week.",
  "Key Measures": "Tracking execution score and lead/lag numbers weekly without rationalizing.",
};

interface DisciplinesStepProps {
  disciplines: DisciplineItem[];
  onChange: (updated: DisciplineItem[]) => void;
  readOnly?: boolean;
}

export function DisciplinesStep({
  disciplines,
  onChange,
  readOnly = false,
}: DisciplinesStepProps) {
  const handleRatingChange = (name: string, rating: number) => {
    const clamped = Math.min(10, Math.max(1, rating));
    const next = disciplines.map((d) => (d.name === name ? { ...d, rating: clamped } : d));
    onChange(next);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900">Step 4: Success Disciplines</h3>
        <p className="mt-1 text-xs text-slate-600 font-medium">
          Rate how you executed the system itself — not the results, the disciplines.
        </p>
      </div>

      <div className="space-y-4">
        {disciplines.map((d) => (
          <div
            key={d.name}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3"
          >
            <div className="flex items-baseline justify-between">
              <div>
                <h4 className="font-bold text-sm text-slate-900">{d.name}</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {DISCIPLINE_HINTS[d.name] ?? "Core 12 Week Year discipline"}
                </p>
              </div>
              <span className="text-sm font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                {d.rating} / 10
              </span>
            </div>

            {/* Slider */}
            {!readOnly ? (
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-semibold text-slate-400">1</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={d.rating}
                  disabled={readOnly}
                  onChange={(e) => handleRatingChange(d.name, Number(e.target.value))}
                  className="w-full accent-slate-900 cursor-pointer"
                />
                <span className="text-[11px] font-semibold text-slate-400">10</span>
              </div>
            ) : (
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-slate-800"
                  style={{ width: `${(d.rating / 10) * 100}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
