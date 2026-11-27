export class AppError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code = "APP_ERROR",
    status?: number,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.context = context;
  }
}

export function normalizeErrorMessage(
  err: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (err instanceof AppError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err.trim()) return err;
  return fallback;
}

export function reportClientEvent(event: string, payload?: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== "production" && typeof console !== "undefined") {
    console.info(`[GuruMusic:event] ${event}`, payload || {});
  }
}

export function reportClientError(
  scope: string,
  err: unknown,
  context?: Record<string, unknown>
): string {
  const message = normalizeErrorMessage(err);
  if (typeof console !== "undefined") {
    console.error(`[GuruMusic:error:${scope}]`, message, context || {});
  }
  return message;
}
