"use client";

interface BreakthroughsStepProps {
  breakthroughs: string;
  nextCycleNotes: string;
  onChangeBreakthroughs: (val: string) => void;
  onChangeNextCycleNotes: (val: string) => void;
  readOnly?: boolean;
}

export function BreakthroughsStep({
  breakthroughs,
  nextCycleNotes,
  onChangeBreakthroughs,
  onChangeNextCycleNotes,
  readOnly = false,
}: BreakthroughsStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900">Step 5: Breakthroughs</h3>
        <p className="mt-1 text-xs text-slate-700 font-medium">
          How must your thinking change to double your results? What new actions are required?
        </p>
      </div>

      <div className="space-y-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
          <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
            Breakthroughs &amp; Insights
          </label>
          <p className="text-xs text-slate-500">
            What beliefs, assumptions, or habits shifted over these 12 weeks? Where did you discover new capacity?
          </p>

          {readOnly ? (
            <div className="min-h-[80px] rounded-lg bg-slate-50 p-3 text-xs text-slate-800 whitespace-pre-wrap">
              {breakthroughs || <span className="italic text-slate-400">None recorded.</span>}
            </div>
          ) : (
            <textarea
              value={breakthroughs}
              onChange={(e) => onChangeBreakthroughs(e.target.value)}
              placeholder="e.g. Realized that scheduling buffer blocks prevented daily email overwhelm; discovered I write best before 10 AM..."
              rows={4}
              className="w-full rounded-lg border border-slate-300 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:outline-none"
            />
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
          <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
            Next Cycle Adjustments
          </label>
          <p className="text-xs text-slate-500">
            What will you do differently in your next 12-week plan? Which tactics should be dropped, simplified, or added?
          </p>

          {readOnly ? (
            <div className="min-h-[80px] rounded-lg bg-slate-50 p-3 text-xs text-slate-800 whitespace-pre-wrap">
              {nextCycleNotes || <span className="italic text-slate-400">None recorded.</span>}
            </div>
          ) : (
            <textarea
              value={nextCycleNotes}
              onChange={(e) => onChangeNextCycleNotes(e.target.value)}
              placeholder="e.g. Shrink from 4 tactics down to 2 vital keystone tactics; schedule strategic blocks strictly on Tuesday mornings..."
              rows={4}
              className="w-full rounded-lg border border-slate-300 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:outline-none"
            />
          )}
        </div>
      </div>
    </div>
  );
}
