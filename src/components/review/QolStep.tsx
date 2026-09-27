"use client";

export interface QolItem {
  area: string;
  rating: number;
  anchor1?: string;
  anchor10?: string;
}

export const BOOK_QOL_AREAS = [
  "Spiritual",
  "Spouse/Key Relationship",
  "Family",
  "Business",
  "Personal",
  "Physical",
];

interface QolStepProps {
  qol: QolItem[];
  onChange: (updated: QolItem[]) => void;
  readOnly?: boolean;
}

export function QolStep({ qol, onChange, readOnly = false }: QolStepProps) {
  const handleRatingChange = (area: string, rating: number) => {
    const clamped = Math.min(10, Math.max(1, rating));
    const next = qol.map((item) => (item.area === area ? { ...item, rating: clamped } : item));
    onChange(next);
  };

  const handleAnchorChange = (area: string, field: "anchor1" | "anchor10", text: string) => {
    const next = qol.map((item) => (item.area === area ? { ...item, [field]: text } : item));
    onChange(next);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900">Step 3: Quality of Life</h3>
        <p className="mt-1 text-xs text-slate-600 font-medium">
          Life balance is an illusion — strive for intentional imbalance. Where did you over-invest, and where deliberately not?
        </p>
      </div>

      <div className="space-y-4">
        {qol.map((item) => (
          <div
            key={item.area}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3"
          >
            <div className="flex items-baseline justify-between">
              <h4 className="font-bold text-sm text-slate-900">{item.area}</h4>
              <span className="text-sm font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                {item.rating} / 10
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
                  value={item.rating}
                  disabled={readOnly}
                  onChange={(e) => handleRatingChange(item.area, Number(e.target.value))}
                  className="w-full accent-slate-900 cursor-pointer"
                />
                <span className="text-[11px] font-semibold text-slate-400">10</span>
              </div>
            ) : (
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-slate-800"
                  style={{ width: `${(item.rating / 10) * 100}%` }}
                />
              </div>
            )}

            {/* Anchors (What 1 means / What 10 means) */}
            <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-0.5">
                  What 1 means to you:
                </label>
                {readOnly ? (
                  <p className="text-xs text-slate-700 italic bg-slate-50 p-2 rounded">
                    {item.anchor1 || "—"}
                  </p>
                ) : (
                  <input
                    type="text"
                    value={item.anchor1 ?? ""}
                    onChange={(e) => handleAnchorChange(item.area, "anchor1", e.target.value)}
                    placeholder="e.g. Neglected, completely disconnected"
                    className="w-full rounded border border-slate-200 p-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-slate-800 focus:outline-none"
                  />
                )}
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-0.5">
                  What 10 means to you:
                </label>
                {readOnly ? (
                  <p className="text-xs text-slate-700 italic bg-slate-50 p-2 rounded">
                    {item.anchor10 || "—"}
                  </p>
                ) : (
                  <input
                    type="text"
                    value={item.anchor10 ?? ""}
                    onChange={(e) => handleAnchorChange(item.area, "anchor10", e.target.value)}
                    placeholder="e.g. Thriving, intentional daily presence"
                    className="w-full rounded border border-slate-200 p-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-slate-800 focus:outline-none"
                  />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
