// Lightweight i18n for the two supported locales. Screens adopt t() per the
// Phase 4 FE spec (AppShell nav + dashboard + Today first; progressive after).

export type Locale = "en" | "vi";

type Dict = Record<string, string>;

const en: Dict = {
  // navigation
  "nav.dashboard": "Dashboard",
  "nav.today": "Today",
  "nav.plan": "12-Week Plan",
  "nav.week": "Weekly Plan",
  "nav.vision": "Vision",
  "nav.modelWeek": "Model Week",
  "nav.measures": "Measures",
  "nav.wam": "WAM",
  "nav.review": "Review",
  "nav.history": "History",
  "nav.settings": "Settings",
  // rituals
  "ritual.create_cycle": "Create your first 12 weeks",
  "ritual.start_cycle": "Start the year",
  "ritual.plan_week": "Plan week {n}",
  "ritual.close_last_week": "Close week {n}",
  "ritual.execute_today": "Execute today (5 minutes)",
  "ritual.review_mode": "Week 13 — celebrate, review, reload.",
  "ritual.await_week_end": "Week closed. Execute, or wait for the week to end.",
  // scoring
  "score.benchmark": "85% weekly execution is the benchmark — below 65, revise the plan.",
  "score.on_track": "Executing at a high level.",
  "score.at_risk": "Goals at risk.",
  "score.revise": "Revise the plan — this is diagnosis, not judgment.",
  "score.achievements_only": "The score measures achievements, not effort or intentions.",
  // actions
  "action.save": "Save",
  "action.cancel": "Cancel",
  "action.close": "Close",
  "action.export": "Export",
  "action.import": "Import",
  "action.commit": "Commit",
  // misc
  "misc.days_left": "{n} days left in the year.",
  "misc.week_label": "Week {w} · Day {d}",
  "misc.theme": "Theme",
  "misc.language": "Language",
};

const vi: Dict = {
  "nav.dashboard": "Bảng điều khiển",
  "nav.today": "Hôm nay",
  "nav.plan": "Kế hoạch 12 tuần",
  "nav.week": "Kế hoạch tuần",
  "nav.vision": "Tầm nhìn",
  "nav.modelWeek": "Tuần mẫu",
  "nav.measures": "Số đo",
  "nav.wam": "WAM",
  "nav.review": "C Review",
  "nav.history": "Lịch sử",
  "nav.settings": "Cài đặt",
  "ritual.create_cycle": "Tạo 12 tuần đầu tiên",
  "ritual.start_cycle": "Bắt đầu năm mới",
  "ritual.plan_week": "Lập kế hoạch tuần {n}",
  "ritual.close_last_week": "Chốt tuần {n}",
  "ritual.execute_today": "Thực hiện hôm nay (5 phút)",
  "ritual.review_mode": "Tuần 13 — ăn mừng, nhìn lại, khởi động lại.",
  "ritual.await_week_end": "Tuần đã chốt. Thực hiện, hoặc chờ tuần kết thúc.",
  "score.benchmark": "85% thực hiện hàng tuần là chuẩn — dưới 65, hãy sửa kế hoạch.",
  "score.on_track": "Đang thực hiện ở mức cao.",
  "score.at_risk": "Mục tiêu có rủi ro.",
  "score.revise": "Sửa kế hoạch — đây là chẩn đoán, không phán xét.",
  "score.achievements_only": "Điểm số đo thành tựu, không đo ý chí.",
  "action.save": "Lưu",
  "action.cancel": "Hủy",
  "action.close": "Chốt",
  "action.export": "Xuất",
  "action.import": "Nhập",
  "action.commit": "Cam kết",
  "misc.days_left": "Còn {n} ngày trong năm.",
  "misc.week_label": "Tuần {w} · Ngày {d}",
  "misc.theme": "Giao diện",
  "misc.language": "Ngôn ngữ",
};

const DICTS: Record<Locale, Dict> = { en, vi };

export function t(locale: Locale, key: string, params?: Record<string, string | number>): string {
  let text = DICTS[locale]?.[key] ?? DICTS.en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}
