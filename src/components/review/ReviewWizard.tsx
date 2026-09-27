"use client";

import { useState } from "react";
import type {
  CycleDto,
  CelebrationDto,
  CycleReviewDto,
  GoalDto,
  ReviewSave,
  NextCycleCreate,
} from "@/lib/contracts";
import { apiFetch, ClientApiError } from "@/components/common/api";
import { StepIndicator } from "./StepIndicator";
import { CelebrateStep } from "./CelebrateStep";
import { ResultsStep, type GoalResultItem } from "./ResultsStep";
import { QolStep, BOOK_QOL_AREAS, type QolItem } from "./QolStep";
import { DisciplinesStep, BOOK_DISCIPLINES, type DisciplineItem } from "./DisciplinesStep";
import { BreakthroughsStep } from "./BreakthroughsStep";
import { ReloadStep } from "./ReloadStep";

interface ReviewWizardProps {
  cycle: CycleDto;
  celebration: CelebrationDto;
  initialReview: CycleReviewDto | null;
  goals: GoalDto[];
  currentWeekNumber: number;
}

export function ReviewWizard({
  cycle,
  celebration,
  initialReview,
  goals,
  currentWeekNumber,
}: ReviewWizardProps) {
  const [step, setStep] = useState(1);
  const isArchived = cycle.status === "archived";

  // State initialization
  const [results, setResults] = useState<GoalResultItem[]>(() => {
    if (initialReview?.results && initialReview.results.length > 0) {
      return initialReview.results.map((r) => ({
        goalId: r.goalId,
        title: r.title,
        percentComplete: r.percentComplete,
        avgScore: r.avgScore,
        grade: r.grade,
        note: r.note,
      }));
    }
    // Default from goals
    return goals.map((g) => ({
      goalId: g.id,
      title: g.title,
      percentComplete: g.status === "achieved" ? 100 : null,
      avgScore: null,
      grade: g.status === "achieved" ? 9 : 5,
      note: "",
    }));
  });

  const [qol, setQol] = useState<QolItem[]>(() => {
    if (initialReview?.qol && initialReview.qol.length > 0) {
      return initialReview.qol;
    }
    return BOOK_QOL_AREAS.map((area) => ({
      area,
      rating: 5,
      anchor1: "",
      anchor10: "",
    }));
  });

  const [disciplines, setDisciplines] = useState<DisciplineItem[]>(() => {
    if (initialReview?.disciplines && initialReview.disciplines.length > 0) {
      return initialReview.disciplines;
    }
    return BOOK_DISCIPLINES.map((name) => ({
      name,
      rating: 5,
    }));
  });

  const [breakthroughs, setBreakthroughs] = useState(initialReview?.breakthroughs ?? "");
  const [nextCycleNotes, setNextCycleNotes] = useState(initialReview?.nextCycleNotes ?? "");

  const [savingStep, setSavingStep] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  const savePartialReview = async (payload: ReviewSave) => {
    if (isArchived) return; // Do not save if archived
    await apiFetch<{ review: CycleReviewDto }>(`/api/cycles/${cycle.id}/review`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  };

  const handleNext = async () => {
    setStepError(null);
    if (step >= 6) return;

    // Save as you go for steps 2–5
    if (!isArchived) {
      setSavingStep(true);
      try {
        if (step === 2) {
          await savePartialReview({
            results: results.map((r) => ({
              goalId: r.goalId,
              title: r.title,
              percentComplete: r.percentComplete,
              avgScore: r.avgScore,
              grade: r.grade,
              note: r.note,
            })),
          });
        } else if (step === 3) {
          await savePartialReview({
            qol: qol.map((item) => ({
              area: item.area,
              rating: item.rating,
              anchor1: item.anchor1 || undefined,
              anchor10: item.anchor10 || undefined,
            })),
          });
        } else if (step === 4) {
          await savePartialReview({
            disciplines: disciplines.map((d) => ({
              name: d.name,
              rating: d.rating,
            })),
          });
        } else if (step === 5) {
          await savePartialReview({
            breakthroughs: breakthroughs.trim() || undefined,
            nextCycleNotes: nextCycleNotes.trim() || undefined,
          });
        }
      } catch (err) {
        if (err instanceof ClientApiError) {
          setStepError(err.message);
        } else {
          setStepError("Failed to save review step.");
        }
        setSavingStep(false);
        return;
      } finally {
        setSavingStep(false);
      }
    }

    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setStepError(null);
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleReload = async (data: NextCycleCreate) => {
    const res = await apiFetch<CycleDto>(`/api/cycles/${cycle.id}/next`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return { id: res.id, name: res.name };
  };

  const handleArchive = async () => {
    await apiFetch<CycleDto>(`/api/cycles/${cycle.id}/archive`, {
      method: "POST",
    });
  };

  const isWeek13 = currentWeekNumber === 13;

  return (
    <div className="space-y-6 pb-28">
      {/* Gentle banner if running outside week 13 */}
      {!isWeek13 && !isArchived && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3.5 text-xs text-blue-900">
          <span>Week 13 is the natural time for this. You&apos;re in week {currentWeekNumber}.</span>
        </div>
      )}

      {/* Step Indicator */}
      <StepIndicator currentStep={step} onStepClick={(s) => setStep(s)} />

      {stepError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800">
          {stepError}
        </div>
      )}

      {/* Step Content */}
      <div className="min-h-[420px]">
        {step === 1 && <CelebrateStep celebration={celebration} />}
        {step === 2 && (
          <ResultsStep results={results} onChange={setResults} readOnly={isArchived} />
        )}
        {step === 3 && <QolStep qol={qol} onChange={setQol} readOnly={isArchived} />}
        {step === 4 && (
          <DisciplinesStep disciplines={disciplines} onChange={setDisciplines} readOnly={isArchived} />
        )}
        {step === 5 && (
          <BreakthroughsStep
            breakthroughs={breakthroughs}
            nextCycleNotes={nextCycleNotes}
            onChangeBreakthroughs={setBreakthroughs}
            onChangeNextCycleNotes={setNextCycleNotes}
            readOnly={isArchived}
          />
        )}
        {step === 6 && (
          <ReloadStep
            cycleId={cycle.id}
            cycleName={cycle.name}
            isArchived={isArchived}
            goals={goals}
            onReload={handleReload}
            onArchive={handleArchive}
          />
        )}
      </div>

      {/* Sticky Navigation Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/95 px-8 py-3.5 backdrop-blur shadow-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <button
            type="button"
            disabled={step === 1 || savingStep}
            onClick={handleBack}
            className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Back
          </button>

          <span className="text-xs text-slate-500 font-medium">Step {step} of 6</span>

          {step < 6 ? (
            <button
              type="button"
              disabled={savingStep}
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50"
            >
              {savingStep ? (
                "Saving..."
              ) : (
                <>
                  <span>Next</span>
                  <span>→</span>
                </>
              )}
            </button>
          ) : (
            <div className="w-16" />
          )}
        </div>
      </div>
    </div>
  );
}
