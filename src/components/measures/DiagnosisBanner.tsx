"use client";

interface DiagnosisBannerProps {
  diagnosis: "STRATEGY_PROBLEM" | "EXECUTION_PROBLEM" | null;
}

export function DiagnosisBanner({ diagnosis }: DiagnosisBannerProps) {
  if (!diagnosis) return null;

  if (diagnosis === "STRATEGY_PROBLEM") {
    return (
      <div className="rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/20 p-4 text-amber-950 dark:text-amber-200 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white font-bold text-xs">
            !
          </div>
          <div>
            <p className="font-semibold text-xs uppercase tracking-wider text-amber-800 dark:text-amber-300">
              Vấn đề về chiến lược
            </p>
            <p className="mt-1 text-sm font-medium">
              Bạn đang thực thi tốt, nhưng chỉ số kết quả vẫn không tiến triển. Chiến lược đang có vấn đề — hãy thay đổi chiến thuật, không phải nỗ lực mù quáng.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-rose-300 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/20 p-4 text-rose-950 dark:text-rose-200 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white font-bold text-xs">
          !
        </div>
        <div>
          <p className="font-semibold text-xs uppercase tracking-wider text-rose-800 dark:text-rose-300">
            Vấn đề về thực thi
          </p>
          <p className="mt-1 text-sm font-medium">
            Thực thi đang là điểm nghẽn. Hãy thu hẹp kế hoạch về mức bạn thực sự sẽ hoàn thành — kiểm soát quy trình luôn chiến thắng động lực nhất thời.
          </p>
        </div>
      </div>
    </div>
  );
}
