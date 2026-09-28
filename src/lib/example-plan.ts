// Static worked example for the /guide page — "Minh's first 12-week year".
// Presentational only: shaped like the real DTOs so the FE can reuse card
// components inside a clearly-labeled EXAMPLE frame. No API, no server code.
import type { DuePattern } from "./contracts";

export type Bi = { en: string; vi: string };

export const EXAMPLE_VISION = {
  longTerm: {
    en: "A healthy builder: work I own, a body that carries me, mornings I choose.",
    vi: "Người kiến tạo khỏe mạnh: công việc của chính mình, một cơ thể bền bỉ, những buổi sáng tự chọn.",
  },
  threeYear: {
    en: "Freelance income covers rent; strength training is just what I do.",
    vi: "Thu nhập freelance đủ tiền thuê nhà; tập tạ đã thành thói quen mặc định.",
  },
  cycleConnection: {
    en: "This cycle proves both: 10 lbs off, first $500 earned.",
    vi: "Chu kỳ này chứng minh cả hai: giảm 10 lbs, kiếm 500 đô đầu tiên.",
  },
};

export interface ExampleTactic {
  id: string;
  text: Bi;
  duePattern: DuePattern;
}

export interface ExampleGoal {
  id: string;
  title: Bi;
  why: Bi;
  lagMetricName: string;
  lagUnit: string;
  lagStart: number;
  lagTarget: number;
  deadlineWeek: number;
  tactics: ExampleTactic[];
}

export const EXAMPLE_GOALS: ExampleGoal[] = [
  {
    id: "g-health",
    title: { en: "Get to 170 lbs", vi: "Về 170 lbs" },
    why: {
      en: "Energy for everything else — and proof I can keep a promise to myself.",
      vi: "Có năng lượng cho mọi việc còn lại — và chứng minh tôi giữ được lời hứa với chính mình.",
    },
    lagMetricName: "Weight", lagUnit: "lbs", lagStart: 180, lagTarget: 170, deadlineWeek: 12,
    tactics: [
      { id: "t-lift", text: { en: "Perform 30-min strength training", vi: "Tập tạ 30 phút" }, duePattern: { type: "EVERY_WEEK", timesPerWeek: 3 } },
      { id: "t-log", text: { en: "Log meals in the app", vi: "Ghi bữa ăn vào app" }, duePattern: { type: "EVERY_WEEK", timesPerWeek: 6 } },
    ],
  },
  {
    id: "g-side",
    title: { en: "Earn first $500 from the side project", vi: "Kiếm 500 đô đầu tiên từ dự án phụ" },
    why: {
      en: "The first dollar proves the path; $500 proves it repeats.",
      vi: "Đô đầu tiên chứng minh con đường tồn tại; 500 đô chứng minh nó lặp lại được.",
    },
    lagMetricName: "Revenue", lagUnit: "$", lagStart: 0, lagTarget: 500, deadlineWeek: 12,
    tactics: [
      { id: "t-ship", text: { en: "Ship one customer-facing improvement", vi: "Ship một cải tiến cho người dùng" }, duePattern: { type: "EVERY_WEEK", timesPerWeek: 2 } },
      { id: "t-outreach", text: { en: "Send 5 outreach messages", vi: "Gửi 5 tin nhắn tiếp cận khách" }, duePattern: { type: "EVERY_WEEK", timesPerWeek: 3 } },
      { id: "t-launch", text: { en: "Run the launch week", vi: "Chạy tuần ra mắt" }, duePattern: { type: "SPECIFIC_WEEKS", weeks: [11, 12] } },
    ],
  },
];

export const EXAMPLE_WEEK1_ITEMS = [
  { id: "w1-a", label: { en: "Perform 30-min strength training", vi: "Tập tạ 30 phút" }, dayOfWeek: 0, done: true, goalId: "g-health" },
  { id: "w1-b", label: { en: "Log meals in the app", vi: "Ghi bữa ăn vào app" }, dayOfWeek: 0, done: true, goalId: "g-health" },
  { id: "w1-c", label: { en: "Send 5 outreach messages", vi: "Gửi 5 tin nhắn tiếp cận khách" }, dayOfWeek: 1, done: true, goalId: "g-side" },
  { id: "w1-d", label: { en: "Perform 30-min strength training", vi: "Tập tạ 30 phút" }, dayOfWeek: 2, done: false, goalId: "g-health" },
  { id: "w1-e", label: { en: "Ship one customer-facing improvement", vi: "Ship một cải tiến cho người dùng" }, dayOfWeek: 3, done: false, goalId: "g-side" },
  { id: "w1-f", label: { en: "Send 5 outreach messages", vi: "Gửi 5 tin nhắn tiếp cận khách" }, dayOfWeek: 4, done: false, goalId: "g-side" },
  { id: "w1-g", label: { en: "Perform 30-min strength training", vi: "Tập tạ 30 phút" }, dayOfWeek: 5, done: false, goalId: "g-health" },
];

/** Wednesday of week 1, looking at Today: 2 of 3 actions checked so far. */
export const EXAMPLE_TODAY = {
  projectedScorePct: 71,
  doneToday: 2,
  openCount: 1,
  note: {
    en: "Two checked, one to go. The projected score moves as you work — that's the productive tension.",
    vi: "Đã tick hai việc, còn một. Điểm dự kiến chạy theo bạn làm — đó chính là sức căng hữu ích.",
  },
};

export const EXAMPLE_WEEK1_CLOSE = {
  scorePct: 92,
  reflection: {
    en: "Missed one meal log on Saturday. Everything else held.",
    vi: "Bỏ một lần ghi bữa ăn thứ Bảy. Các việc còn lại đều giữ được.",
  },
};

export const EXAMPLE_VALLEY = {
  week: 4,
  scorePct: 58,
  headline: {
    en: "The valley hit — and she closed the week honestly anyway.",
    vi: "Đáy thung lũng đến — và cô ấy vẫn chốt tuần một cách trung thực.",
  },
  whatChanged: {
    en: "Dinner shifts at the family restaurant were eating the evening workout. She moved one session to Monday lunch and shrank meal logging from 6 to 5 days — a plan revision before week 5 started, not an excuse after it.",
    vi: "Ca tối ở quán gia đình đang nuốt buổi tập buổi tối. Cô dời một buổi sang trưa thứ Hai và giảm ghi bữa ăn từ 6 xuống 5 ngày — sửa kế hoạch trước tuần 5 bắt đầu, chứ không phải bào chữa sau đó.",
  },
};

export const EXAMPLE_REVIEW = {
  grades: [
    { goalId: "g-health", percentComplete: 100, achieved: true }, // 169.5 lbs
    { goalId: "g-side", percentComplete: 62, achieved: false }, // $310
  ],
  breakthrough: {
    en: "The score never lied. Two bad weeks early taught me more than a good month ever did.",
    vi: "Điểm số chưa bao giờ nói dối. Hai tuần tệ ở đầu dạy tôi nhiều hơn một tháng tốt.",
  },
};
