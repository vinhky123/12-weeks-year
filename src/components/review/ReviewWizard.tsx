"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CelebrationDto, CycleDto, CycleReviewDto, GoalDto, NextCycleCreate, ReviewSave } from "@/lib/contracts";
import { apiFetch, ClientApiError } from "@/components/common/api";
import { useSettings } from "@/context/SettingsContext";
import { StepIndicator } from "./StepIndicator";
import { CelebrateStep } from "./CelebrateStep";
import { ResultsStep, type GoalResultItem } from "./ResultsStep";
import { QolStep, BOOK_QOL_AREAS, type QolItem } from "./QolStep";
import { DisciplinesStep, BOOK_DISCIPLINES, type DisciplineItem } from "./DisciplinesStep";
import { BreakthroughsStep } from "./BreakthroughsStep";
import { ReloadStep } from "./ReloadStep";

interface ReviewWizardProps { cycle: CycleDto; celebration: CelebrationDto; initialReview: CycleReviewDto | null; goals: GoalDto[]; currentWeekNumber: number; }
type ReviewWithLegacyStatus = Omit<CycleReviewDto, "status"> & { status?: CycleReviewDto["status"] };

function mergeResults(review: ReviewWithLegacyStatus | null, goals: GoalDto[]): GoalResultItem[] {
  const saved = new Map(review?.results.map((row) => [row.goalId, row]));
  return goals.map((goal) => {
    const row = saved.get(goal.id);
    return row ? { ...row } : { goalId: goal.id, title: goal.title, percentComplete: goal.status === "achieved" ? 100 : null, avgScore: null, grade: goal.status === "achieved" ? 9 : 5, note: "" };
  });
}
function mergeQol(review: ReviewWithLegacyStatus | null): QolItem[] {
  const saved = new Map(review?.qol.map((row) => [row.area, row]));
  return BOOK_QOL_AREAS.map((area) => ({ area, rating: saved.get(area)?.rating ?? 5, anchor1: saved.get(area)?.anchor1 ?? "", anchor10: saved.get(area)?.anchor10 ?? "" }));
}
function mergeDisciplines(review: ReviewWithLegacyStatus | null): DisciplineItem[] {
  const saved = new Map(review?.disciplines.map((row) => [row.name, row]));
  return BOOK_DISCIPLINES.map((name) => ({ name, rating: saved.get(name)?.rating ?? 5 }));
}
function initialStep(review: ReviewWithLegacyStatus | null, goals: GoalDto[]): number {
  if (!review) return 1;
  if (goals.some((goal) => !review.results.some((row) => row.goalId === goal.id))) return 2;
  if (BOOK_QOL_AREAS.some((area) => !review.qol.some((row) => row.area === area))) return 3;
  if (BOOK_DISCIPLINES.some((name) => !review.disciplines.some((row) => row.name === name))) return 4;
  if (review.breakthroughs === null && review.nextCycleNotes === null) return 5;
  return review.status === "draft" ? 5 : 6;
}
const equal = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

function confirmedResults(review: ReviewWithLegacyStatus, goals: GoalDto[]) {
  const rows = new Map(review.results.map((row) => [row.goalId, row]));
  return goals.flatMap((goal) => {
    const row = rows.get(goal.id);
    return row ? [{ goalId: row.goalId, title: row.title, percentComplete: row.percentComplete, avgScore: row.avgScore, grade: row.grade, note: row.note ?? "" }] : [];
  });
}

function confirmedQol(review: ReviewWithLegacyStatus) {
  const rows = new Map(review.qol.map((row) => [row.area, row]));
  return BOOK_QOL_AREAS.flatMap((area) => {
    const row = rows.get(area);
    return row ? [{ area: row.area, rating: row.rating, anchor1: row.anchor1 ?? "", anchor10: row.anchor10 ?? "" }] : [];
  });
}

function confirmedDisciplines(review: ReviewWithLegacyStatus) {
  const rows = new Map(review.disciplines.map((row) => [row.name, row]));
  return BOOK_DISCIPLINES.flatMap((name) => {
    const row = rows.get(name);
    return row ? [{ name: row.name, rating: row.rating }] : [];
  });
}

export function ReviewWizard({ cycle, celebration, initialReview, goals, currentWeekNumber }: ReviewWizardProps) {
  const { t } = useSettings();
  const legacyReview = initialReview as ReviewWithLegacyStatus | null;
  const [confirmedReview, setConfirmedReview] = useState<ReviewWithLegacyStatus | null>(legacyReview);
  const [step, setStep] = useState(() => initialStep(legacyReview, goals));
  const [results, setResults] = useState(() => mergeResults(legacyReview, goals));
  const [qol, setQol] = useState(() => mergeQol(legacyReview));
  const [disciplines, setDisciplines] = useState(() => mergeDisciplines(legacyReview));
  const [breakthroughs, setBreakthroughs] = useState(legacyReview?.breakthroughs ?? "");
  const [nextCycleNotes, setNextCycleNotes] = useState(legacyReview?.nextCycleNotes ?? "");
  const [pending, setPending] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const isArchived = cycle.status === "archived";
  const status = confirmedReview?.status ?? (confirmedReview ? "complete" : "draft");

  useEffect(() => {
    const heading = contentRef.current?.querySelector<HTMLElement>("h1, h2, h3");
    if (heading) { heading.tabIndex = -1; heading.focus(); }
  }, [step]);

  useEffect(() => {
    if (stepError && !pending) actionRef.current?.focus();
  }, [pending, stepError]);

  const completedSteps = useMemo(() => {
    const done = new Set<number>([1]);
    if (confirmedReview) {
      if (goals.every((goal) => confirmedReview.results.some((row) => row.goalId === goal.id))) done.add(2);
      if (BOOK_QOL_AREAS.every((area) => confirmedReview.qol.some((row) => row.area === area))) done.add(3);
      if (BOOK_DISCIPLINES.every((name) => confirmedReview.disciplines.some((row) => row.name === name))) done.add(4);
      if (confirmedReview.breakthroughs !== null || confirmedReview.nextCycleNotes !== null) done.add(5);
      if ((confirmedReview.status ?? "complete") === "complete") done.add(6);
    }
    return done;
  }, [confirmedReview, goals]);

  const payloadForStep = (current: number): ReviewSave | null => {
    if (current === 2) return { results: results.map(({ goalId, title, percentComplete, avgScore, grade, note }) => ({ goalId, title, percentComplete, avgScore, grade, note })) };
    if (current === 3) return { qol: qol.map(({ area, rating, anchor1, anchor10 }) => ({ area, rating, anchor1, anchor10 })) };
    if (current === 4) return { disciplines: disciplines.map(({ name, rating }) => ({ name, rating })) };
    if (current === 5) return { breakthroughs, nextCycleNotes };
    return null;
  };
  const confirmedPayloadForStep = (current: number): unknown => {
    if (!confirmedReview) return null;
    if (current === 2) return { results: confirmedResults(confirmedReview, goals) };
    if (current === 3) return { qol: confirmedQol(confirmedReview) };
    if (current === 4) return { disciplines: confirmedDisciplines(confirmedReview) };
    if (current === 5) return { breakthroughs: confirmedReview.breakthroughs, nextCycleNotes: confirmedReview.nextCycleNotes };
    return null;
  };
  const errorText = (error: unknown) => {
    if (!(error instanceof ClientApiError)) return t("review.save_error");
    const issues = Array.isArray(error.details?.issues) ? error.details.issues : [];
    const detail = issues.map((issue) => typeof issue === "object" && issue && "message" in issue ? String(issue.message) : "").filter(Boolean).join(" ");
    return detail ? `${error.message} ${detail}` : error.message;
  };

  const handleNext = async () => {
    if (pending || step >= 6) return;
    setStepError(null);
    if (step === 1) { setStep(2); return; }
    if (isArchived) { setStep((value) => value + 1); return; }
    setPending(true);
    try {
      const payload = payloadForStep(step);
      let nextReview = confirmedReview;
      if (payload && !equal(payload, confirmedPayloadForStep(step))) {
        const saved = await apiFetch<{ review: CycleReviewDto }>(`/api/cycles/${cycle.id}/review`, { method: "PUT", body: JSON.stringify(payload) });
        nextReview = saved.review;
        setConfirmedReview(saved.review);
      }
      if (step === 5) {
        const nextStatus = nextReview?.status ?? (nextReview ? "complete" : "draft");
        if (nextStatus !== "complete") {
          const finalized = await apiFetch<{ review: CycleReviewDto }>(`/api/cycles/${cycle.id}/review/finalize`, { method: "POST" });
          setConfirmedReview(finalized.review);
          if (finalized.review.status !== "complete") {
            setStepError(t("review.finalize_unconfirmed"));
            setPending(false);
            return;
          }
        }
      }
      setStep((value) => value + 1);
      setPending(false);
    } catch (error) {
      setStepError(errorText(error));
      setPending(false);
    }
  };

  const handleBack = () => { if (!pending) { setStepError(null); setStep((value) => Math.max(1, value - 1)); } };
  const handleStepClick = (next: number) => { if (!pending) { setStepError(null); setStep(next); } };
  const handleReload = async (data: NextCycleCreate) => { const res = await apiFetch<CycleDto>(`/api/cycles/${cycle.id}/next`, { method: "POST", body: JSON.stringify(data) }); return { id: res.id, name: res.name }; };
  const handleArchive = async () => { await apiFetch<CycleDto>(`/api/cycles/${cycle.id}/archive`, { method: "POST" }); };
  const readOnly = isArchived || pending;
  const notesDirty = !equal(payloadForStep(5), confirmedPayloadForStep(5));
  const finishLabel = step === 5 && !isArchived && (status !== "complete" || notesDirty) ? t("review.finish") : t("review.continue");

  return (
    <div className="space-y-6 pb-28" aria-busy={pending}>
      {currentWeekNumber !== 13 && !isArchived && <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">{t("review.week_warning", { week: currentWeekNumber })}</div>}
      <StepIndicator currentStep={step} completedSteps={completedSteps} pending={pending} onStepClick={handleStepClick} />
      {stepError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200">{stepError}</div>}
      <div ref={contentRef} className="min-h-[420px]">
        {step === 1 && <CelebrateStep celebration={celebration} />}
        {step === 2 && <ResultsStep results={results} onChange={setResults} readOnly={readOnly} />}
        {step === 3 && <QolStep qol={qol} onChange={setQol} readOnly={readOnly} />}
        {step === 4 && <DisciplinesStep disciplines={disciplines} onChange={setDisciplines} readOnly={readOnly} />}
        {step === 5 && <BreakthroughsStep breakthroughs={breakthroughs} nextCycleNotes={nextCycleNotes} onChangeBreakthroughs={setBreakthroughs} onChangeNextCycleNotes={setNextCycleNotes} readOnly={readOnly} />}
        {step === 6 && <ReloadStep cycleId={cycle.id} cycleName={cycle.name} isArchived={isArchived} goals={goals} onReload={handleReload} onArchive={handleArchive} />}
      </div>
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-zinc-200 bg-white/95 px-4 py-3.5 shadow-md backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 sm:px-8">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <button type="button" disabled={step === 1 || pending} onClick={handleBack} className="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-30 dark:border-zinc-700 dark:text-zinc-300">← {t("review.back")}</button>
          <span className="shrink-0 text-xs font-medium text-zinc-500 dark:text-zinc-400">{t("review.step_status", { step })}</span>
          {step < 6 ? <button ref={actionRef} type="button" disabled={pending} onClick={handleNext} className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 sm:px-5">{pending ? t("review.saving") : <><span>{finishLabel}</span><span>→</span></>}</button> : <div className="w-16" />}
        </div>
      </div>
    </div>
  );
}
