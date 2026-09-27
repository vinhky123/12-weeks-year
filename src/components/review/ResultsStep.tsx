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
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Bước 2: Kết quả</h3>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Chấm điểm thực thi và kết quả cho từng mục tiêu theo thang 1–10. Đây là sự đo lường trung thực, không phải tự phán xét bản thân.
        </p>
      </div>

      <div className="space-y-4">
        {results.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-6 text-center text-xs italic text-zinc-400 dark:text-zinc-500">
            Không tìm thấy mục tiêu nào cho chu kỳ này.
          </p>
        ) : (
          results.map((r, idx) => (
            <div
              key={r.goalId}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{r.title}</h4>
                <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                  {r.percentComplete !== null && r.percentComplete !== undefined && (
                    <span>Kết quả: <strong className="text-zinc-800 dark:text-zinc-200">{r.percentComplete}%</strong></span>
                  )}
                  {r.avgScore !== null && r.avgScore !== undefined && (
                    <span>Điểm TB chiến thuật: <strong className="text-zinc-800 dark:text-zinc-200">{r.avgScore}%</strong></span>
                  )}
                </div>
              </div>

              {/* Grade Slider (1–10) */}
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Tự chấm điểm (1–10)
                  </label>
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                    {r.grade} / 10
                  </span>
                </div>

                {!readOnly ? (
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-semibold text-zinc-400">1</span>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={r.grade}
                      disabled={readOnly}
                      onChange={(e) => handleGradeChange(idx, Number(e.target.value))}
                      className="w-full accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                    />
                    <span className="text-[11px] font-semibold text-zinc-400">10</span>
                  </div>
                ) : (
                  <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-zinc-900 dark:bg-zinc-100"
                      style={{ width: `${(r.grade / 10) * 100}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Ghi chú &amp; Phản tư (tùy chọn)
                </label>
                {readOnly ? (
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 italic bg-zinc-50 dark:bg-zinc-800 p-2.5 rounded-lg">
                    {r.note || "Không có ghi chú nào."}
                  </p>
                ) : (
                  <input
                    type="text"
                    value={r.note ?? ""}
                    onChange={(e) => handleNoteChange(idx, e.target.value)}
                    placeholder="Những yếu tố nào đã dẫn đến kết quả này?"
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-zinc-900 dark:focus:border-zinc-100 focus:outline-none"
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
