// A known, expected failure (bad input, wrong credentials, missing record) that
// should reach the client as a specific HTTP status instead of a generic 500.
// Business logic throws this directly; anything else is treated as unexpected.
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}
