// Pure model-week validation: the book's time-blocking quantities as nudges.
// Warnings, never errors — the book guides, it doesn't block.

export type BlockTypeLike = "STRATEGIC" | "BUFFER" | "BREAKOUT" | "PLANNING" | "WAM";

export interface BlockSummary {
  type: BlockTypeLike;
  durationMinutes: number;
}

export interface Warning {
  field: string;
  message: string;
}

const STRATEGIC_MIN = 180; // 3 hours, once a week, uninterrupted
const BREAKOUT_MIN = 180; // 3+ hours fully away from work

/** The book's model-week quantities, as warnings for what's missing. */
export function validateModelWeek(blocks: BlockSummary[]): Warning[] {
  const warnings: Warning[] = [];
  const has = (type: BlockTypeLike, minDuration = 0) =>
    blocks.some((b) => b.type === type && b.durationMinutes >= minDuration);

  if (!has("STRATEGIC", STRATEGIC_MIN)) {
    warnings.push({
      field: "STRATEGIC",
      message: "Add a 3-hour strategic block — your most important work gets first claim on the week.",
    });
  }
  if (!has("BREAKOUT", BREAKOUT_MIN)) {
    warnings.push({
      field: "BREAKOUT",
      message: "Add a 3h+ breakout block — rest is what makes 12-week intensity sustainable.",
    });
  }
  if (!has("BUFFER")) {
    warnings.push({
      field: "BUFFER",
      message: "Add daily buffer blocks (30–60 min) to contain email, admin and interruptions.",
    });
  }
  if (!has("PLANNING")) {
    warnings.push({
      field: "PLANNING",
      message: "Reserve a weekly planning slot (15–20 min) — score last week, plan this one.",
    });
  }
  if (!has("WAM")) {
    warnings.push({
      field: "WAM",
      message: "Reserve your Weekly Accountability Meeting slot — the week itself is a deadline.",
    });
  }
  return warnings;
}
