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

export const DISCIPLINE_LABELS: Record<string, string> = {
  Vision: "Tầm nhìn",
  "12-Week Planning": "Lập kế hoạch 12 tuần",
  "Weekly Routine (Score · Plan · WAM)": "Nếp sinh hoạt tuần (Chấm điểm · Lên kế hoạch · WAM)",
  "Performance Time (Blocks)": "Quản trị thời gian hiệu suất (Các khối)",
  "Key Measures": "Chỉ số then chốt (Lead / Lag)",
};

const DISCIPLINE_HINTS: Record<string, string> = {
  Vision: "Kết nối cảm xúc với các kết quả dài hạn và 3 năm; làm rõ lý do 'tại sao'.",
  "12-Week Planning": "Mục tiêu 12 tuần rõ ràng và các chiến thuật cụ thể hàng tuần để đạt được chúng.",
  "Weekly Routine (Score · Plan · WAM)": "Sử dụng kế hoạch tuần, danh sách việc hàng ngày và tự giải trình trung thực qua WAM.",
  "Performance Time (Blocks)": "Phân bổ các khối chiến lược, khối đệm và khối nghỉ ngơi vào tuần mẫu của bạn.",
  "Key Measures": "Theo dõi điểm thực thi và các chỉ số lead/lag hàng tuần mà không bao biện.",
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
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Bước 4: Các kỷ luật thành công</h3>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 font-medium">
          Đánh giá mức độ bạn thực thi chính hệ thống — không phải kết quả, mà là các nguyên tắc kỷ luật.
        </p>
      </div>

      <div className="space-y-4">
        {disciplines.map((d) => (
          <div
            key={d.name}
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs space-y-3"
          >
            <div className="flex items-baseline justify-between">
              <div>
                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  {DISCIPLINE_LABELS[d.name] ?? d.name}
                </h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {DISCIPLINE_HINTS[d.name] ?? "Kỷ luật cốt lõi của Năm 12 Tuần"}
                </p>
              </div>
              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                {d.rating} / 10
              </span>
            </div>

            {/* Slider */}
            {!readOnly ? (
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-semibold text-zinc-400">1</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={d.rating}
                  disabled={readOnly}
                  onChange={(e) => handleRatingChange(d.name, Number(e.target.value))}
                  className="w-full accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                />
                <span className="text-[11px] font-semibold text-zinc-400">10</span>
              </div>
            ) : (
              <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-zinc-900 dark:bg-zinc-100"
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
