# FE Spec — The Journey guide & Next-Ritual card (Phase 5)

> **For Antigravity:** build exactly what this spec says — no more, no less. Rules: [`docs/fe-specs/README.md`](./README.md). If something here is wrong or missing, note it in `## Feedback` below instead of improvising.

## Idea & why (book basis)

The 12 Week Year only works as a *system*: vision → plan → commitment → model week → the weekly rhythm → the week-13 review → reload. Most people quit in the valley because they lose sight of where they are and what the system asks of them next. Phase 5 turns the `/guide` page from static prose into a **live "you are here" journey**: the server computes which of the 14 steps is done, current, or still ahead, and the page teaches the method around that live state. The dashboard's next-ritual card upgrades to lead with the same single next action, so the whole app always answers one question: *what does the system want from me right now?* Book basis: [§1 The 12 Week Year](../../12-week-year-book-content.md) (compressed year, commitment, model week), [§6 Execution scoring](../../12-week-year-book-content.md), [§13 Week 13](../../12-week-year-book-content.md). Backed by `src/server/journeyRules.ts` + `GET /api/guide/journey` (Phase 5A, already implemented and tested — do not touch them).

## Screens & routes

### Route `/guide` (rebuild — replace the contents of `src/app/guide/page.tsx`)

One long page, four sections top to bottom. Everything renders in the active locale (`useSettings().locale` from `@/context/SettingsContext`; all `{ en, vi }` strings — see Copy & tone).

**1. "You are here" / "Bạn đang ở đây" — the live journey**

- **Journey rail**: the 14 steps grouped into the three phases from `journey.phase` — Foundation (steps 1–7), Execution (steps 8–11), Completion (steps 12–14), in `JOURNEY_STEP_IDS` order within each group. Each step row shows its `STEP_META` title plus a status glyph from `step.status`: ✓ checkmark for `done`, **pulsing dot** for `current`, hollow circle for `todo`. Rows are static (not links); only the hero CTA navigates.
- **Hero next-action card** (the most important element on the page): when `journey.nextAction !== null`, render the `STEP_META` entry for `nextAction.id` — title, detail, and one CTA button labeled "Continue" / "Tiếp tục" → navigate to the entry's `href`. When `nextAction.id === "close_week"` and `journey.context.unclosedWeek !== null`, append "Week {N} is waiting." / "Tuần {N} đang chờ." (N = `context.unclosedWeek`) to the detail line.
- **Caught-up card**: when `journey.nextAction === null`, render the mandated caught-up line instead (verbatim below) — no CTA.
- **Foundation gaps group**: when any foundation step has `status === "todo"` while `journey.phase !== "foundation"`, render an extra rail group at the bottom of the rail (after Completion) labeled "Foundation gaps" / "Lỗ hổng nền móng" with the mandated explainer sentence (verbatim below), containing exactly those todo foundation steps. Those steps are rendered *only* in this group — omit them from the regular Foundation group so nothing appears twice.
- Above the rail, show the cycle context line when `context.cycleName` is non-null: "{cycleName} · Week {weekNumber}" / "{cycleName} · Tuần {weekNumber}" — except when `weekNumber` is 0 (cycle still in planning): render just "{cycleName}". When `cycleName` is null, omit the line entirely (no cycle yet).

**2. "The journey on one page" / "Toàn bộ hành trình trên một trang" — static timeline**

No API. A vertical timeline with five stops, tightening the prose already in `src/app/guide/page.tsx` (sections "One-time setup" and "The rhythm") into timeline entries. Keep the strongest existing callouts ("Max 3 active goals per cycle." and "Closing a week is final — by design.") inside the relevant stops. Stops:

- **Day 0 — build the foundation**: write the vision (what if, not how), create the 12-week cycle, set 1–3 goals (vital few; each with a *why* and a measurable lag target), break them into verb-first countable tactics, design the model week (3-hour strategic block, daily buffers, a breakout), make the commitment ("I choose to…", 12 weeks — that's what makes going all-in possible).
- **Monday — the heartbeat**: generate this week's plan fresh from your tactics and place items on days. Never skip.
- **Daily — ~5 minutes**: open Today, check off actions, watch the projected score move. The score measures achievements, not effort.
- **Sunday→Monday — close, then plan**: final score, lag values, one-line reflection; closed weeks are immutable. Below 65? That's diagnosis, not judgment.
- **Week 13 — review and reload**: celebrate first, grade goals / quality of life / the five disciplines, archive the year, carry the vital few forward. Four fresh starts a year.

**3. "A full cycle, played out" / "Một chu kỳ trọn vẹn" — the worked example**

Six example frames built from the static exports in `src/lib/example-plan.ts` (import types/values from `@/lib/example-plan`; presentational only, shaped like the real DTOs so you can reuse the plan/week/today card components inside the frames). **Every frame is wrapped in an `ExampleFrame` component whose header renders the mandated label verbatim** (both locales): "Example — Minh's first cycle (not your data)" / "Ví dụ minh họa — chu kỳ đầu của Minh (không phải dữ liệu của bạn)". Frames, in order, each with a small sub-caption (given in Copy & tone):

1. **The plan as built** — `EXAMPLE_VISION` (three lines: long-term, three-year, cycle connection) + one card per `EXAMPLE_GOALS` entry: title, *why* (muted), lag line `Weight 180 → 170 lbs · week 12` / `Revenue $0 → $500 · week 12` (from `lagMetricName`/`lagUnit`/`lagStart`/`lagTarget`/`deadlineWeek`), and its tactics with due patterns ("3×/week", "weeks 11–12") — reuse the `/plan` goal-card rendering.
2. **Week 1 on the board** — `EXAMPLE_WEEK1_ITEMS` as a Mon–Sun board (`dayOfWeek` 0 = Monday), done items checked. Reuse the `/week` board rendering.
3. **Wednesday: Today** — `EXAMPLE_TODAY`: `{doneToday}` of `{doneToday + openCount}` checked, the projected score badge `{projectedScorePct}%`, and the `note` line. Reuse the `/today` card.
4. **Sunday: the close** — `EXAMPLE_WEEK1_CLOSE`: big `92%` score + the one-line `reflection`. Reuse the `/week` close summary.
5. **Week 4: the valley** — `EXAMPLE_VALLEY`: `Week 4 · 58%` headline row with the `headline` and `whatChanged` copy. Reuse the valley banner styling.
6. **Week 13: the review** — `EXAMPLE_REVIEW`: one grade row per goal (`percentComplete`, achieved ✓/✗: 100% achieved, 62% not achieved) + the `breakthrough` quote. Reuse the `/review` results rendering.

**4. "Reference" / "Tham khảo" — keep the current reference prose**

Keep the existing `/guide` sections nearly as-is, bilingualized: "Keep score without flinching" (the 85% benchmark, strategy-vs-execution diagnosis, lead/lag), "Expect the valley (weeks 3–6)", and "Your data is yours". Keep the book-provenance footer. These stay static (no API).

### Route `/` (dashboard — amend `src/components/dashboard/NextRitualCard.tsx` + its fetch)

`NextRitualCard` now leads with the journey's next action:

- When `journey.nextAction !== null`: the card's title/detail/CTA come from `STEP_META[nextAction.id]` (same rendering as the guide hero card, including the "Week N is waiting." append). Below the detail, a **muted secondary hint line** renders the existing ritual description (what `getDescription(nextRitual, …)` produces today) — the existing `nextRitual` value is never shown as the headline anymore. Exception: when `nextAction.id === "start_cycle"`, the CTA does not navigate to `"/"` (that would reload this same page) — it triggers the existing `onStartCycle` → `POST /api/cycles/:id/start` flow exactly as the card does today.
- When `journey.nextAction === null` (or the journey fetch failed): fall back to the current card rendering unchanged (existing `nextRitual` headline + action). The dashboard must never break because the journey endpoint failed.
- The dashboard page fetches `/api/guide/journey` **in parallel** with `/api/dashboard` (`Promise.all` via `apiFetch`).

## Components & layout

- `src/components/guide/` — `JourneyRail` (phase groups + step rows + optional Foundation-gaps group), `NextActionCard` (hero card; reused on the dashboard by `NextRitualCard`), `CaughtUpCard`, `ExampleFrame` (labeled wrapper). `src/components/guide/stepMeta.ts` — the client-side `STEP_META` map (below).
- `src/app/guide/page.tsx` — client component; fetches the journey on mount; renders the four sections.
- `src/components/dashboard/NextRitualCard.tsx` — gains an optional `journey: JourneyDto | null` prop; rendering per the dashboard rules above.
- Reused as-is where possible: plan goal cards, week board, today card, valley banner, review grade rows (import into the example frames).
- Desktop-first single column (`max-w-3xl` like today); the rail may sit beside the hero card on ≥1024px and stack below it; don't over-invest in mobile.
- No new UI libraries; Tailwind v4 utilities, slate/zinc palette, existing `AppShell` sidebar. Respect dark mode (`dark:` variants) like the rest of the app.

## States

- **Loading** — skeleton for the rail + hero card (local API is fast; skeletons on first load only). Dashboard: existing skeleton, journey joins it.
- **Error** — `/guide`: red inline banner with the `ApiError` `error` message + retry button. Dashboard: **graceful degradation** — render the legacy `nextRitual` card and the rest of the dashboard; do not block on journey failure.
- **Empty DB** — not a special case: the API returns `phase: "foundation"`, `nextAction: { id: "write_vision" }`, `context: { cycleName: null, weekNumber: 0, unclosedWeek: null }`. Render the Foundation group with everything todo, write_vision pulsing, hero card CTA → `/vision`, no context line.
- **Caught up** — `nextAction === null` (week closed, next week not yet generated): caught-up card on `/guide`; dashboard falls back to the legacy ritual card.
- **Foundation gaps mid-cycle** — todo foundation steps while `phase !== "foundation"`: the Foundation-gaps group at the bottom of the rail with the mandated sentence.
- **Week 13 / completion** — `phase === "completion"`: Execution group steps may all read `done`; `nextAction` walks `write_review` → `archive_cycle` → `start_next_cycle`. During weeks 1–12 the server *never* picks a completion step (its guarantee — don't try to reproduce the rule client-side).
- **`wam_report`** — the server never marks it `current` (optional ritual). It only ever renders `done` or `todo`; never give it a pulsing dot.
- **Locale** — every string resolves through the active locale; when locale is `vi` the Vietnamese column of `STEP_META` renders verbatim (no fallback mixing).

## Interactions

- `/guide` performs **no mutations**. The only interactive elements: the hero/caught-up card CTA (`next/link` to `STEP_META.href`) and the Reference section's existing in-prose links.
- Rail rows are not clickable. Scroll-margin on the four sections for deep links, as today.
- Dashboard: `Promise.all([apiFetch<DashboardDto>("/api/dashboard"), apiFetch<{ journey: JourneyDto }>("/api/guide/journey")])`. When `nextAction.id === "start_cycle"`, the CTA runs the existing start flow (`POST /api/cycles/:id/start`, spinner, refetch) instead of navigating.
- **Never send the `x-twy-today` header** from UI code — it is a backend/e2e test hook only.

## Data contract

```
GET /api/guide/journey     → { journey: JourneyDto }
```

Copied verbatim from `src/lib/contracts.ts`:

```ts
export const JOURNEY_STEP_IDS = [
  "write_vision", "create_cycle", "set_goals", "add_tactics", "design_model_week",
  "write_commitment", "start_cycle", "plan_current_week", "execute_today", "close_week",
  "wam_report", "write_review", "archive_cycle", "start_next_cycle",
] as const;

export const JOURNEY_STEP_DTO = z.object({
  id: JOURNEY_STEP_ID_SCHEMA,                    // z.enum(JOURNEY_STEP_IDS)
  status: z.enum(["done", "current", "todo"]),
});

export const JOURNEY_DTO = z.object({
  phase: z.enum(["foundation", "execution", "completion"]),
  steps: z.array(JOURNEY_STEP_DTO),              // always 14, JOURNEY_STEP_IDS order
  nextAction: z.object({ id: JOURNEY_STEP_ID_SCHEMA }).nullable(),
  context: z.object({
    cycleName: z.string().nullable(),
    weekNumber: z.number().int(),                // 0 pre-start, 1–12 execution, 13 review
    unclosedWeek: z.number().int().nullable(),   // set → "Week N is waiting."
  }),
});
export type JourneyDto = z.infer<typeof JOURNEY_DTO>;
```

Types: import `JourneyDto`, `JourneyStepId` from `@/lib/contracts`; `ExampleGoal`, `Bi` etc. from `@/lib/example-plan`; `apiFetch` from `@/components/common/api`; locale from `@/context/SettingsContext`. Never import from `src/server/**`.

## Copy & tone

**`STEP_META`** — client-side map keyed by step id (`Record<JourneyStepId, { href: string; title: Bi; detail: Bi }>` with `Bi = { en: string; vi: string }`), rendered by locale. **Verbatim, both columns — do not paraphrase or re-translate:**

| id | href | title en / vi | detail en / vi |
|----|------|---------------|----------------|
| `write_vision` | `/vision` | Write your vision / Viết tầm nhìn | Long-term (5–15 years), 3-year outlook, and why this cycle matters. Start with *what if*, not how. / Dài hạn (5–15 năm), triển vọng 3 năm, vì sao chu kỳ này quan trọng. Bắt đầu bằng "nếu như", chưa cần "làm sao". |
| `create_cycle` | `/plan` | Create your 12-week cycle / Tạo chu kỳ 12 tuần | Name it and pick the Monday it starts. A year is no longer 12 months. / Đặt tên và chọn thứ Hai khởi động. Một năm không còn là 12 tháng. |
| `set_goals` | `/plan` | Set 1–3 goals — the vital few / Đặt 1–3 mục tiêu — vital few | Each needs a *why* and a measurable lag target: 180 → 170 lbs, $0 → $500. A fourth goal dilutes the first three. / Mỗi mục tiêu cần *lý do* và chỉ số đo được: 180 → 170 lbs, $0 → $500. Mục tiêu thứ tư làm loãng ba mục tiêu đầu. |
| `add_tactics` | `/plan` | Break goals into tactics / Chia mục tiêu thành chiến thuật | Verb-first, countable actions with a due pattern — "Strength train 30 min, 3×/week". The week plan generates from these. / Động từ đứng đầu, đếm được, có tần suất — "Tập tạ 30 phút, 3 lần/tuần". Kế hoạch tuần sinh ra từ đây. |
| `design_model_week` | `/model-week` | Design your model week / Thiết kế tuần mẫu | Reserve the 3-hour strategic block, daily buffers, and a breakout. The model week is where tactics physically fit. / Giữ khối chiến lược 3 tiếng, các khối đệm hằng ngày và khối nghỉ xả. Tuần mẫu là chỗ chiến thuật nằm vừa. |
| `write_commitment` | `/plan` | Make the commitment / Đưa ra cam kết | Count the costs honestly, then write "I choose to…". The promise only spans 12 weeks — that's what makes going all-in possible. / Đếm giá phải trả thật lòng, rồi viết "Tôi chọn…". Lời hứa chỉ kéo dài 12 tuần — nên dồn toàn lực được. |
| `start_cycle` | `/` | Start the cycle / Khởi động chu kỳ | Day 1 begins the 84 days. From here the rhythm takes over: plan Monday, execute daily, close weekly. / Ngày 1 bắt đầu 84 ngày. Từ đây nhịp độ dẫn đường: lập kế hoạch thứ Hai, thực thi hằng ngày, chốt cuối tuần. |
| `plan_current_week` | `/week` | Generate this week's plan / Sinh kế hoạch tuần này | Monday ritual: fresh items from your tactics, placed on days. Never skip — it's the heartbeat. / Nghi thức thứ Hai: mục mới từ chiến thuật, xếp vào các ngày. Không bao giờ bỏ — đây là nhịp tim. |
| `execute_today` | `/today` | Execute today / Thực thi hôm nay | Check off today's actions, ~5 minutes. The score measures achievements, not effort. / Tick các hành động hôm nay, ~5 phút. Điểm đo kết quả đạt được, không đo nỗ lực. |
| `close_week` | `/week` | Close the week honestly / Chốt tuần trung thực | Final score, log lag values, one-line reflection. Closed weeks are immutable — that's what keeps the record true. / Điểm cuối, ghi chỉ số kết quả, một dòng suy ngẫm. Tuần đã chốt không sửa được — điều đó khiến số liệu đáng tin. |
| `wam_report` | `/wam` | Write your WAM report / Viết báo cáo WAM | Weekly accountability check-in with yourself: blockers, what worked, encouragement. Optional but powerful. / Buổi đối diện trách nhiệm hằng tuần: vướng mắc, điều hiệu quả, lời động viên. Không bắt buộc nhưng rất hiệu quả. |
| `write_review` | `/review` | Week 13: review the year / Tuần 13: tổng kết năm | Celebrate first, then grade goals, quality of life, and the five disciplines. / Ăn mừng trước, rồi chấm điểm mục tiêu, chất lượng cuộc sống và 5 kỷ luật. |
| `archive_cycle` | `/review` | Archive the year / Lưu trữ năm | Freeze scores, review, and vision snapshot. History stays browsable forever. / Đóng băng điểm số, tổng kết và ảnh tầm nhìn. Lịch sử xem lại mãi mãi. |
| `start_next_cycle` | `/plan` | Start your next 12-week year / Bắt đầu năm 12 tuần tiếp theo | Carry the vital few forward, refine, go again. Four fresh starts a year. / Giữ lại vital few, tinh chỉnh, chạy tiếp. Bốn lần khởi đầu mới mỗi năm. |

**Additional mandated copy (verbatim):**

- **Caught-up card** (`nextAction === null`): "All caught up — nothing owed right now. See you tomorrow on Today." / "Đã xong hết — hiện không còn việc đến hạn. Hẹn gặp mai ở trang Hôm nay."
- **Foundation gaps group** (any foundation step `todo` while `phase !== "foundation"`): group label "Foundation gaps" / "Lỗ hổng nền móng", with sentence: "You started without these. Filling them strengthens the cycle; leaving them empty is also a choice." / "Bạn khởi động thiếu những mục này. Bổ sung sẽ làm chu kỳ vững hơn; để trống cũng là một lựa chọn."
- **`close_week` detail append** (when `context.unclosedWeek` is set, on the guide hero card and the dashboard card): "Week N is waiting." / "Tuần N đang chờ." (N = `context.unclosedWeek`).
- **Example frame label** (every `ExampleFrame`, both locales): "Example — Minh's first cycle (not your data)" / "Ví dụ minh họa — chu kỳ đầu của Minh (không phải dữ liệu của bạn)".

**Other UI strings specified by this spec (en / vi):**

- Section titles: "You are here" / "Bạn đang ở đây" · "The journey on one page" / "Toàn bộ hành trình trên một trang" · "A full cycle, played out" / "Một chu kỳ trọn vẹn" · "Reference" / "Tham khảo".
- Phase group labels on the rail: "Foundation" / "Nền móng" · "Execution" / "Thực thi" · "Completion" / "Hoàn thành".
- Hero CTA label: "Continue" / "Tiếp tục". Context line: "{cycleName} · Week {n}" / "{cycleName} · Tuần {n}" (just "{cycleName}" while the cycle is still in planning, n = 0).
- Example frame sub-captions: "The plan as built" / "Kế hoạch như đã lập" · "Week 1 on the board" / "Tuần 1 trên bảng" · "Wednesday: Today" / "Thứ Tư: Hôm nay" · "Sunday: the close" / "Chủ Nhật: chốt tuần" · "Week 4: the valley" / "Tuần 4: đáy thung lũng" · "Week 13: the review" / "Tuần 13: tổng kết".
- Timeline stop titles: "Day 0 — build the foundation" / "Ngày 0 — dựng nền móng" · "Monday — the heartbeat" / "Thứ Hai — nhịp tim" · "Daily — ~5 minutes" / "Hằng ngày — ~5 phút" · "Close, then plan" / "Chốt tuần, rồi lập kế hoạch" · "Week 13 — review and reload" / "Tuần 13 — tổng kết và khởi động lại".

Tone: honest-but-supportive, same as the rest of the app — the score is a mirror, not a judge; no streak-consolation, no partial credit. The mandated vi lines are final translations, not suggestions. Emphasis markers in the deck (`*what if*`, `*why*`) render as italics.

## Acceptance

- [ ] The rail renders per live state across all eight e2e scenarios below (statuses, phase grouping, pulsing current dot, Foundation-gaps group when applicable)
- [ ] The hero CTA (and dashboard card CTA) navigates to the `STEP_META` href; the `start_cycle` CTA on the dashboard triggers the existing start flow instead
- [ ] Every example frame carries the mandated example label ("Example — Minh's first cycle (not your data)" / vi) — frames are unmistakably not user data
- [ ] **en + vi complete**: every visible string on `/guide` and the upgraded card renders in both locales (flip language in Settings and re-check)
- [ ] No completion step is ever shown as `nextAction` during weeks 1–12 (server guarantee; verified in e2e only, via the `x-twy-today` header — the UI itself never sends it)
- [ ] Caught-up state (`nextAction === null`) renders the mandated caught-up line; dashboard falls back to the legacy ritual card
- [ ] "Week N is waiting." / "Tuần N đang chờ." appears with the right N when `context.unclosedWeek` is set
- [ ] Dashboard fetches `/api/guide/journey` in parallel with `/api/dashboard`; a journey failure never breaks the dashboard
- [ ] `wam_report` never renders as current
- [ ] Only `@/lib/contracts` and `@/lib/example-plan` types are imported; no imports from `src/server/**`; no console errors

### E2E scenarios (`tests/e2e/phase5.spec.ts`, mirroring the Phase 5 contract tests in `tests/api/phase5.test.ts`)

1. **Empty DB** → `/guide` shows `foundation`, `write_vision` pulsing as current, hero CTA → `/vision`, no cycle context line (`weekNumber` 0, `cycleName` null).
2. **Foundation complete, cycle in planning** (seed vision, cycle, goal, tactics, strategic block, commitment) → `start_cycle` current with `context.cycleName` rendered; CTA → `/` (dashboard).
3. **Week 1 generated, mid-week** → `phase: "execution"`, `execute_today` current, CTA → `/today`, `unclosedWeek` null.
4. **Sunday of week 1, plan still open** (simulate via `x-twy-today` header in the route interception) → `close_week` current and "Week 1 is waiting." / "Tuần 1 đang chờ." visible (`unclosedWeek: 1`).
5. **Week 1 closed, week 2 not generated** → caught-up card (mandated line, no CTA); after generating week 2 → `execute_today` current again.
6. **Week 13** → `phase: "completion"`, `write_review` current, CTA → `/review`; Foundation steps all `done`, no completion step was suggested in any weeks-1–12 scenario above.
7. **Review saved + archived** → `archive_cycle` done, `start_next_cycle` current, CTA → `/plan`.
8. **Successor cycle created with a carried goal lacking tactics** → back to `phase: "foundation"` with `add_tactics` current, and the "Foundation gaps" / "Lỗ hổng nền móng" group rendered with the mandated sentence.

Plus a locale pass: flip to Vietnamese and verify the rail titles, hero card, caught-up line, and example labels match the vi column verbatim.

## Feedback

(notes from Antigravity; answered in the next spec revision)
