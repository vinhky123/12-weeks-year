/**
 * Comprehensive system audit — walks EVERY API function through the complete
 * 12 Week Year journey against a live dev server, with edge-case checks.
 *
 * Prereq: npm run db:seed && npm run dev (default http://localhost:3210)
 * Run:    node scripts/system-audit.mjs [baseUrl]
 *
 * NOTE: the audit archives the active cycle at the end (week-13 flow) —
 * re-run `npm run db:seed` afterwards to restore the demo state.
 */
const BASE = process.argv[2] ?? "http://localhost:3210";

let pass = 0;
let fail = 0;
const failures = [];

function check(name, condition, detail = "") {
  if (condition) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function api(method, path, body, today) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "content-type": "application/json", ...(today ? { "x-twy-today": today } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, headers: res.headers, json, text };
}

console.log(`\n=== 12 Week Year Local — System Audit against ${BASE} ===\n`);

// ---------- A. Foundations ----------
console.log("A. Foundations (dashboard, cycle, vision, model week, measures)");
{
  const dash = await api("GET", "/api/dashboard");
  check("dashboard 200", dash.status === 200);
  check("dashboard phase=execution", dash.json.phase === "execution");
  check("dashboard week 2 label", /^Week 2 · Day \d$/.test(dash.json.today.weekLabel ?? ""), JSON.stringify(dash.json.today));
  check("valley guidance null outside weeks 3-6", dash.json.valleyGuidance === null);
  check("nextRitual present", typeof dash.json.nextRitual === "string");
  check("daily principle present", typeof dash.json.dailyPrinciple === "string" && dash.json.dailyPrinciple.length > 0);
  check("score history has 12 slots", Array.isArray(dash.json.scoreHistory) && dash.json.scoreHistory.length === 12);
  check("week 1 closed at 92% (honest seed)", dash.json.scoreHistory[0]?.scorePct === 92 && dash.json.scoreHistory[0]?.closed === true);

  const active = await api("GET", "/api/cycles/active");
  check("active cycle 200", active.status === 200 && active.json.cycle.status === "active");
  // days remaining = 84 - whole days elapsed since cycle start
  const startMs = Date.parse(`${active.json.cycle.startDate}T00:00:00Z`);
  const todayMs = Date.parse(`${dash.json.today.isoDate}T00:00:00Z`);
  const elapsed = Math.round((todayMs - startMs) / 86_400_000);
  check("days remaining consistent with cycle math", active.json.daysRemaining === Math.max(0, 84 - elapsed), `${active.json.daysRemaining} vs ${84 - elapsed}`);

  const journey = await api("GET", "/api/guide/journey");
  check("journey 200 with 14 steps", journey.status === 200 && journey.json.journey.steps.length === 14);
  check("journey phase=execution on seed", journey.json.journey.phase === "execution");
  check("journey foundation complete on seed", journey.json.journey.steps
    .filter((s) => ["write_vision", "create_cycle", "set_goals", "add_tactics", "design_model_week", "write_commitment", "start_cycle"].includes(s.id))
    .every((s) => s.status === "done"));
  check("journey nextAction=execute_today on seed (week 2 open)", journey.json.journey.nextAction?.id === "execute_today", JSON.stringify(journey.json.journey.nextAction));
  check("journey wam todo and never selected", journey.json.journey.steps.find((s) => s.id === "wam_report")?.status === "todo" && journey.json.journey.nextAction?.id !== "wam_report");

  const week13 = new Date(Date.parse(`${active.json.cycle.startDate}T00:00:00Z`) + 84 * 86_400_000).toISOString().slice(0, 10);
  const journey13 = await api("GET", "/api/guide/journey", undefined, week13);
  check("journey time-travel week 13 → write_review", journey13.json.journey.phase === "completion" && journey13.json.journey.nextAction?.id === "write_review");

  const vision = await api("GET", "/api/vision");
  check("living vision exists", vision.json.vision !== null);
  check("vision has life domains", Array.isArray(vision.json.vision.lifeDomains) && vision.json.vision.lifeDomains.length >= 3);
  const longTermBefore = vision.json.vision.longTerm;
  const putVision = await api("PUT", "/api/vision", { cycleConnection: "Audit: prove the system works." });
  check("vision partial PUT preserves other fields", putVision.json.vision.longTerm === longTermBefore);
  check("vision PUT applies the edited field", putVision.json.vision.cycleConnection === "Audit: prove the system works.");

  const mw = await api("GET", "/api/model-week");
  check("model week has 10 seeded blocks", mw.json.blocks.length === 10, String(mw.json.blocks.length));
  check("model week zero warnings (book quantities)", mw.json.warnings.length === 0);
  const badBlock = await api("POST", "/api/model-week", { type: "BUFFER", dayOfWeek: 9, startMinute: 0, durationMinutes: 45 });
  check("invalid block day rejected (400)", badBlock.status === 400);

  const measures = await api("GET", "/api/measures");
  check("measures overview 200", measures.status === 200);
  const lagWeek1 = measures.json.goals[0]?.lagSeries?.[0];
  check("lag series week 1 = 178.5 lbs", lagWeek1?.value === 178.5);
  check("lead measure series present", measures.json.goals[0].leadMeasures[0]?.series?.length >= 1);
}

// ---------- B. Plan discipline ----------
console.log("\nB. Plan discipline (goal rules, tactic rules, plan-revision guard)");
let cycleId, g1, g2;
{
  const active = (await api("GET", "/api/cycles/active")).json;
  cycleId = active.cycle?.id;
  const detail = await api("GET", `/api/cycles/${cycleId}`);
  if (detail.json.goals === undefined) {
    console.log(`  [diag] cycle detail status=${detail.status} body=${JSON.stringify(detail.json).slice(0, 200)}`);
  }
  check("cycle detail has 2 goals", detail.json.goals?.length === 2);
  check("due patterns arrive as parsed objects", detail.json.goals[0].tactics[0].duePattern.type === "EVERY_WEEK");
  g1 = detail.json.goals[0].id;
  g2 = detail.json.goals[1].id;

  const third = await api("POST", `/api/cycles/${cycleId}/goals`, {
    title: "Audit goal 3", why: "Fills the last slot", lagMetricName: "M", lagUnit: "u", lagStart: 0, lagTarget: 5,
  });
  check("3rd goal accepted", third.status === 200);
  const fourth = await api("POST", `/api/cycles/${cycleId}/goals`, {
    title: "Audit goal 4", why: "One too many", lagMetricName: "M", lagUnit: "u", lagStart: 0, lagTarget: 6,
  });
  check("4th goal rejected with the vital-few rule", fourth.status === 422 && /Max 3 active goals/.test(fourth.json.error));
  const noWhy = await api("POST", `/api/cycles/${cycleId}/goals`, {
    title: "No why", why: "  ", lagMetricName: "M", lagUnit: "u", lagStart: 0, lagTarget: 7,
  });
  check("goal without a why rejected", noWhy.status === 422 && /why is required/.test(noWhy.json.error));
  const dropped = await api("DELETE", `/api/goals/${third.json.id}`);
  check("3rd goal soft-dropped (frees the slot)", dropped.json.status === "dropped");

  const badTactic = await api("POST", `/api/goals/${g1}/tactics`, { text: "Do it", duePattern: { type: "EVERY_WEEK", timesPerWeek: 0 } });
  check("invalid due pattern rejected", badTactic.status === 400);

  const week2 = await api("GET", `/api/cycles/${cycleId}/weeks/2`);
  check("week 2 plan exists (draft)", week2.json.plan.status === "draft");
  const noConfirm = await api("POST", `/api/week-plans/${week2.json.plan.id}/items`, { label: "Random task", dayOfWeek: 1, confirmPlanRevision: false });
  check("ad-hoc item without confirmation rejected (409)", noConfirm.status === 409);
  const confirmed = await api("POST", `/api/week-plans/${week2.json.plan.id}/items`, { label: "Audit plan revision", dayOfWeek: 1, confirmPlanRevision: true });
  check("plan-revision item added with explicit confirm", confirmed.status === 200);
  const revisionItem = confirmed.json.items.find((i) => i.label === "Audit plan revision");
  check("plan-revision item appears in the plan", revisionItem !== undefined, JSON.stringify(confirmed.json.items.map((i) => i.label)));
  const removed = await api("DELETE", `/api/week-plans/${week2.json.plan.id}/items/${revisionItem?.id}`);
  check("plan-revision item removable", removed.status === 200, `status ${removed.status} ${JSON.stringify(removed.json).slice(0, 120)}`);
}

// ---------- C. Execution & the honest score ----------
console.log("\nC. Execution & honest scoring (caps, undo, freeze, valley)");
{
  const week2 = (await api("GET", `/api/cycles/${cycleId}/weeks/2`)).json;
  const train = week2.items.find((i) => i.tacticId !== null && i.plannedCount === 3);
  // the seed pre-logs some week-2 completions — assert relative to current state
  let before = train.done;
  let first;
  if (before < train.plannedCount) {
    first = await api("POST", "/api/completions", { tacticId: train.tacticId, weekNumber: 2 });
    check("completion logs (done increments)", first.json.done === before + 1 && first.json.due === 3, JSON.stringify(first.json));
    before = first.json.done;
  }
  while (before < train.plannedCount) {
    const r = await api("POST", "/api/completions", { tacticId: train.tacticId, weekNumber: 2 });
    before = r.json.done ?? before;
  }
  const over = await api("POST", "/api/completions", { tacticId: train.tacticId, weekNumber: 2 });
  check("over-completion rejected — no extra credit (409)", over.status === 409 && /no extra credit/.test(over.json.error));
  check("done capped at due", before === train.plannedCount, `${before}/${train.plannedCount}`);
  const undo = await api("DELETE", "/api/completions", { tacticId: train.tacticId, weekNumber: 2 });
  check("undo removes the latest completion", undo.json.done === train.plannedCount - 1, JSON.stringify(undo.json));

  const today = await api("GET", "/api/today");
  check("today view has 7 day sections", today.json.days.length === 7);
  check("today carries projected score", today.json.projectedScore !== null && typeof today.json.projectedScore.scorePct === "number");

  const w13 = await api("POST", "/api/completions", { tacticId: train.tacticId, weekNumber: 13 });
  check("week 13 never scored (400)", w13.status === 400);
  const future = await api("POST", "/api/completions", { tacticId: train.tacticId, weekNumber: 5 });
  check("future week rejected (409)", future.status === 409 && /future week/.test(future.json.error));
  const badDay = await api("PATCH", `/api/week-plans/${week2.plan.id}/items/${train.id}`, { dayOfWeek: 9 });
  check("invalid day placement rejected", badDay.status === 400 || badDay.status === 422);

  // valley guardrail: time-travel to week 4 Monday (execution dipped in seeds)
  const valley = await api("GET", "/api/dashboard", undefined, "2026-10-05");
  check("valley guidance fires in weeks 3-6 with low average", valley.json.valleyGuidance !== null && /valley/i.test(valley.json.valleyGuidance.headline));

  // close week 2 → frozen forever
  const close = await api("POST", `/api/week-plans/${week2.plan.id}/close`, {
    reflection: "Audit close.",
    lagValues: [{ goalId: g1, value: 177 }],
  });
  check("week 2 closes with reflection + lag", close.json.plan.status === "closed");
  const afterClose = await api("POST", "/api/completions", { tacticId: train.tacticId, weekNumber: 2 });
  check("completion on closed week rejected (409)", afterClose.status === 409 && /closed/.test(afterClose.json.error));
  const regen = await api("POST", `/api/cycles/${cycleId}/weeks/2/generate`);
  check("regenerating a closed week rejected (409)", regen.status === 409);
  const scores = await api("GET", `/api/cycles/${cycleId}/scores`);
  check("scores mark week 2 closed", scores.json.weeks[1]?.closed === true);
  check("future weeks never score", scores.json.weeks[4] === null);
  check("average recomputed over scored weeks", typeof scores.json.averageScore === "number");
}

// ---------- D. WAM ----------
console.log("\nD. WAM (auto data, save, markdown export)");
{
  const empty = await api("GET", `/api/cycles/${cycleId}/wam/3`);
  check("WAM auto data present before save", empty.json.report === null && empty.json.auto.cycleName !== undefined);
  check("auto lists next week commitments", Array.isArray(empty.json.auto.nextWeekCommitments) && empty.json.auto.nextWeekCommitments.length > 0);
  const saved = await api("PUT", `/api/cycles/${cycleId}/wam/3`, { blockers: "Audit blocker", whatWorked: "Audit worked" });
  check("WAM save returns full view", saved.json.report?.blockers === "Audit blocker" && saved.json.auto !== undefined);
  const w13 = await api("GET", `/api/cycles/${cycleId}/wam/13`);
  check("WAM rejects week 13", w13.status === 422 || w13.status === 400);
  const exported = await fetch(`${BASE}/api/cycles/${cycleId}/wam/3/export`);
  const md = await exported.text();
  check("export is markdown with header", exported.status === 200 && md.startsWith("# WAM Report"));
  check("export contains saved text", md.includes("Audit worked"));
}

// ---------- E. Week-13 flow (destructive: archives the active cycle) ----------
console.log("\nE. Week-13 review & reload (celebration, review, archive, next cycle)");
let oldVisionLongTerm;
{
  const vision = (await api("GET", "/api/vision")).json.vision;
  oldVisionLongTerm = vision.longTerm;

  const celebration = await api("GET", `/api/cycles/${cycleId}/review/celebration`);
  check("celebration: best week is week 1 (92%)", celebration.json.bestWeek?.week === 1 && celebration.json.bestWeek?.scorePct === 92);
  check("celebration counts all goals incl. dropped", celebration.json.goalsTotal === 3 && celebration.json.goalsCompleted === 0, JSON.stringify({ total: celebration.json.goalsTotal, done: celebration.json.goalsCompleted }));

  const badArea = await api("PUT", `/api/cycles/${cycleId}/review`, { qol: [{ area: "Money", rating: 5 }] });
  check("unknown QoL area rejected (422)", badArea.status === 422);
  const review = await api("PUT", `/api/cycles/${cycleId}/review`, {
    qol: [
      { area: "Spiritual", rating: 6 }, { area: "Spouse/Key Relationship", rating: 7 }, { area: "Family", rating: 7 },
      { area: "Business", rating: 6 }, { area: "Personal", rating: 6 }, { area: "Physical", rating: 7 },
    ],
    disciplines: [
      { name: "Vision", rating: 7 }, { name: "12-Week Planning", rating: 8 },
      { name: "Weekly Routine (Score · Plan · WAM)", rating: 7 }, { name: "Performance Time (Blocks)", rating: 6 },
      { name: "Key Measures", rating: 7 },
    ],
    breakthroughs: "Audit breakthrough: the score makes the truth impossible to hide.",
  });
  check("review saves with auto-graded results", review.json.review.results.length === 3 && review.json.review.results.every((r) => r.grade >= 1 && r.grade <= 10));
  check("review persists the six QoL areas", review.json.review.qol.length === 6);

  const commitment = await api("PUT", `/api/cycles/${cycleId}/commitment`, { costs: "Audit costs", statement: "I choose to finish the audit." });
  check("commitment saved", commitment.json.commitment.statement.includes("I choose to"));

  const blocked = await api("POST", `/api/cycles/${cycleId}/next`, { carryoverGoalIds: [g1] });
  check("next-cycle blocked while active (409)", blocked.status === 409);
  await api("POST", `/api/cycles/${cycleId}/archive`);
  const snapshot = await api("GET", `/api/cycles/${cycleId}/vision`);
  check("archive froze a vision snapshot", snapshot.json.vision?.cycleId === cycleId);

  await api("PUT", "/api/vision", { longTerm: "Living vision evolved after archive." });
  const frozen = await api("GET", `/api/cycles/${cycleId}/vision`);
  check("snapshot frozen while living vision evolves", frozen.json.vision.longTerm === oldVisionLongTerm);

  const journeyArchived = await api("GET", "/api/guide/journey");
  check("journey after archive → start_next_cycle", journeyArchived.json.journey.phase === "completion" && journeyArchived.json.journey.nextAction?.id === "start_next_cycle");

  const next = await api("POST", `/api/cycles/${cycleId}/next`, { name: "Audit Q1", carryoverGoalIds: [g1, g2] });
  check("next cycle created in planning", next.json.status === "planning" && next.json.name === "Audit Q1");
  const nextDetail = await api("GET", `/api/cycles/${next.json.id}`);
  check("carried goals copy title/why/lag only (no tactics)", nextDetail.json.goals.length === 2 && nextDetail.json.goals.every((g) => g.tactics.length === 0));

  const journeyNext = await api("GET", "/api/guide/journey");
  check("journey successor cycle → add_tactics (carried goals lack tactics)", journeyNext.json.journey.phase === "foundation" && journeyNext.json.journey.nextAction?.id === "add_tactics");

  const history = await api("GET", "/api/history");
  check("history lists all cycles", history.json.length === 3);
  const archivedEntry = history.json.find((c) => c.id === cycleId);
  check("archived entry flags review + scores", archivedEntry.hasReview === true && archivedEntry.scoredWeeks === 2);
  const detail = await api("GET", `/api/history/${cycleId}`);
  check("history detail exposes review + weeks", detail.json.review?.breakthroughs?.includes("Audit breakthrough") && detail.json.weeks.length >= 2);

  const insights = await api("GET", "/api/insights");
  check("insights: goals achieved counted", insights.json.totalGoalsAchieved >= 1);
  check("insights: best cycle derived", insights.json.bestCycle !== null);
}

// ---------- Summary ----------
console.log(`\n=== AUDIT COMPLETE: ${pass} passed, ${fail} failed ===`);
if (fail > 0) {
  console.log("\nFailures:");
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("\nEvery function of the system walked and verified. Restore demo state with: npm run db:seed\n");
