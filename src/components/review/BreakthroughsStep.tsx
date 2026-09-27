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
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Bước 5: Những đột phá</h3>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 font-medium">
          Tư duy của bạn phải thay đổi như thế nào để nhân đôi kết quả? Những hành động mới nào là bắt buộc?
        </p>
      </div>

      <div className="space-y-5">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs space-y-2">
          <label className="block text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
            Đột phá &amp; Bài học sâu sắc
          </label>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Những niềm tin, giả định hay thói quen nào đã thay đổi trong 12 tuần qua? Bạn đã khám phá ra năng lực mới ở đâu?
          </p>

          {readOnly ? (
            <div className="min-h-[80px] rounded-lg bg-zinc-50 dark:bg-zinc-800 p-3 text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
              {breakthroughs || <span className="italic text-zinc-400 dark:text-zinc-500">Chưa có ghi chép nào.</span>}
            </div>
          ) : (
            <textarea
              value={breakthroughs}
              onChange={(e) => onChangeBreakthroughs(e.target.value)}
              placeholder="VD: Nhận ra rằng việc lên lịch các khối thời gian đệm đã ngăn chặn tình trạng quá tải email; phát hiện ra tôi viết tốt nhất trước 10 giờ sáng..."
              rows={4}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-3 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-zinc-900 dark:focus:border-zinc-100 focus:outline-none"
            />
          )}
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs space-y-2">
          <label className="block text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
            Điều chỉnh cho chu kỳ tiếp theo
          </label>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Bạn sẽ làm điều gì khác biệt trong kế hoạch 12 tuần tiếp theo? Chiến thuật nào nên loại bỏ, đơn giản hóa hoặc bổ sung?
          </p>

          {readOnly ? (
            <div className="min-h-[80px] rounded-lg bg-zinc-50 dark:bg-zinc-800 p-3 text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
              {nextCycleNotes || <span className="italic text-zinc-400 dark:text-zinc-500">Chưa có ghi chép nào.</span>}
            </div>
          ) : (
            <textarea
              value={nextCycleNotes}
              onChange={(e) => onChangeNextCycleNotes(e.target.value)}
              placeholder="VD: Rút gọn từ 4 chiến thuật xuống còn 2 chiến thuật then chốt; bắt buộc thực hiện các khối chiến lược vào sáng thứ Ba..."
              rows={4}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-3 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-zinc-900 dark:focus:border-zinc-100 focus:outline-none"
            />
          )}
        </div>
      </div>
    </div>
  );
}
