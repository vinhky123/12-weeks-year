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

export const QOL_AREA_LABELS: Record<string, string> = {
  Spiritual: "Tâm linh / Tinh thần",
  "Spouse/Key Relationship": "Vợ chồng / Mối quan hệ then chốt",
  Family: "Gia đình",
  Business: "Sự nghiệp / Kinh doanh",
  Personal: "Phát triển cá nhân",
  Physical: "Sức khỏe thể chất",
};

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
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Bước 3: Chất lượng cuộc sống</h3>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 font-medium">
          Cân bằng cuộc sống là một ảo tưởng — hãy hướng tới sự mất cân bằng có chủ đích. Bạn đã đầu tư vượt mức ở đâu, và cố tình tiết giảm ở đâu?
        </p>
      </div>

      <div className="space-y-4">
        {qol.map((item) => (
          <div
            key={item.area}
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs space-y-3"
          >
            <div className="flex items-baseline justify-between">
              <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                {QOL_AREA_LABELS[item.area] ?? item.area}
              </h4>
              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                {item.rating} / 10
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
                  value={item.rating}
                  disabled={readOnly}
                  onChange={(e) => handleRatingChange(item.area, Number(e.target.value))}
                  className="w-full accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                />
                <span className="text-[11px] font-semibold text-zinc-400">10</span>
              </div>
            ) : (
              <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-zinc-900 dark:bg-zinc-100"
                  style={{ width: `${(item.rating / 10) * 100}%` }}
                />
              </div>
            )}

            {/* Anchors (What 1 means / What 10 means) */}
            <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-0.5">
                  Điểm 1 có ý nghĩa gì đối với bạn:
                </label>
                {readOnly ? (
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 italic bg-zinc-50 dark:bg-zinc-800 p-2 rounded">
                    {item.anchor1 || "—"}
                  </p>
                ) : (
                  <input
                    type="text"
                    value={item.anchor1 ?? ""}
                    onChange={(e) => handleAnchorChange(item.area, "anchor1", e.target.value)}
                    placeholder="VD: Bị bỏ bê, hoàn toàn mất kết nối"
                    className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-1.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-zinc-900 dark:focus:border-zinc-100 focus:outline-none"
                  />
                )}
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-0.5">
                  Điểm 10 có ý nghĩa gì đối với bạn:
                </label>
                {readOnly ? (
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 italic bg-zinc-50 dark:bg-zinc-800 p-2 rounded">
                    {item.anchor10 || "—"}
                  </p>
                ) : (
                  <input
                    type="text"
                    value={item.anchor10 ?? ""}
                    onChange={(e) => handleAnchorChange(item.area, "anchor10", e.target.value)}
                    placeholder="VD: Phát triển mạnh mẽ, hiện diện chủ đích mỗi ngày"
                    className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-1.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-zinc-900 dark:focus:border-zinc-100 focus:outline-none"
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
