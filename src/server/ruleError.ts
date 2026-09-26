/** A domain rule violation — routes map this to an HTTP status + ApiError. */
export class RuleError extends Error {
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(status: number, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "RuleError";
    this.status = status;
    this.details = details;
  }
}

export function notFound(what: string): RuleError {
  return new RuleError(404, `${what} not found.`);
}

export function conflict(message: string, details?: Record<string, unknown>): RuleError {
  return new RuleError(409, message, details);
}

export function invalid(message: string, details?: Record<string, unknown>): RuleError {
  return new RuleError(422, message, details);
}
