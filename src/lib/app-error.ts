export class AppError extends Error {
  constructor(
    message: string,
    public code: string = "INTERNAL_ERROR",
    public status: number = 500,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, "FORBIDDEN", 403);
  }
}

export class NotFoundError extends AppError {
  constructor(entity = "Resource") {
    super(`${entity} not found`, "NOT_FOUND", 404);
  }
}

export class RateLimitError extends AppError {
  constructor() {
    super("Too many requests.", "RATE_LIMIT", 429);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Invalid input.") {
    super(message, "VALIDATION", 400);
  }
}

export class ReadOnlyError extends AppError {
  constructor() {
    super("Content is read-only in production.", "READ_ONLY", 400);
  }
}

export function assertAccess(ok: boolean, message?: string): asserts ok is true {
  if (!ok) throw new ForbiddenError(message);
}
