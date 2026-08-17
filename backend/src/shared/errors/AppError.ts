// A known, expected failure (bad input, wrong credentials, missing record) that
// should reach the client as a specific HTTP status instead of a generic 500.
// Business logic throws this directly; anything else is treated as unexpected.
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    // Optional machine-readable extras (e.g. { code: "MACHINE_LIMIT_REACHED",
    // upgradeUrl }) merged into the error response alongside `error`, so a
    // frontend can react to a specific condition without string-matching
    // the message. Most AppErrors don't need this.
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}
