"use client";

interface ReviewData {
  results: {
    goalId: number;
    title?: string;
    percentComplete?: number | null;
    avgScore?: number | null;
    grade: number;
    note?: string;
  }[];
  qol: {
    area: string;
    rating: number;
    anchor1?: string;
    anchor10?: string;
  }[];
  disciplines: {
    name: string;
    rating: number;
  }[];
  breakthroughs: string | null;
  nextCycleNotes: string | null;
  updatedAt: string;
}

interface ReviewSectionProps {
  review: ReviewData | null;
}

export function ReviewSection({ review }: ReviewSectionProps) {
  if (!review) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
        <p className="text-xs italic text-slate-500">
          No review saved — the year closed without a retrospective.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
      <div className="border-b border-slate-100 pb-3">
        <h3 className="font-bold text-base text-slate-900">12-Week Retrospective</h3>
        <p className="text-xs text-slate-400">
          Completed on {new Date(review.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        </p>
      </div>

      {/* 1. Results */}
      <div>
        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600 mb-3">
          Results &amp; Goal Grades
        </h4>
        <div className="space-y-2">
          {review.results.map((r, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div>
                <span className="font-bold text-slate-900">{r.title || `Goal #${r.goalId}`}</span>
                {r.note && <p className="text-slate-500 italic mt-0.5">{r.note}</p>}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {r.percentComplete !== null && r.percentComplete !== undefined && (
                  <span className="text-slate-500">Lag: {r.percentComplete}%</span>
                )}
                <span className="rounded bg-slate-900 px-2 py-0.5 font-bold text-white">
                  Grade: {r.grade}/10
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Quality of Life */}
      <div>
        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600 mb-3">
          Quality of Life Ratings
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {review.qol.map((item, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 text-xs space-y-1"
            >
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-slate-800">{item.area}</span>
                <span className="font-bold text-slate-900">{item.rating}/10</span>
              </div>
              {(item.anchor1 || item.anchor10) && (
                <div className="text-[11px] text-slate-400">
                  {item.anchor1 && <div>1: {item.anchor1}</div>}
                  {item.anchor10 && <div>10: {item.anchor10}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Disciplines */}
      <div>
        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600 mb-3">
          Execution Disciplines
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {review.disciplines.map((d, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-slate-100 bg-slate-50/60 p-2.5 text-center text-xs"
            >
              <div className="font-semibold text-slate-700 truncate">{d.name}</div>
              <div className="mt-1 font-black text-slate-900 text-sm">{d.rating}/10</div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Breakthroughs & Next Cycle */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
        <div>
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600 mb-1">
            Breakthroughs
          </h4>
          <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-800 whitespace-pre-wrap">
            {review.breakthroughs || <span className="italic text-slate-400">None recorded.</span>}
          </p>
        </div>

        <div>
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600 mb-1">
            Next Cycle Notes
          </h4>
          <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-800 whitespace-pre-wrap">
            {review.nextCycleNotes || <span className="italic text-slate-400">None recorded.</span>}
          </p>
        </div>
      </div>
    </div>
  );
}
