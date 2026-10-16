// Postgres error helpers that work regardless of driver or wrapping.
//
// drizzle-orm >= 0.44 wraps every driver error in a DrizzleQueryError whose
// `.cause` is the original driver error (NeonDbError in production). Checks
// like `error.name === "NeonDbError"` therefore never match in production —
// that's why the unique-conflict fallbacks in the exam/certificate actions
// were dead code. Walk the cause chain and match on the SQLSTATE instead.

const UNIQUE_VIOLATION = "23505";

function causes(error: unknown): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current && typeof current === "object"; depth++) {
    out.push(current as Record<string, unknown>);
    current = (current as { cause?: unknown }).cause;
  }
  return out;
}

/** True when `error` (or any cause) is a unique violation of `constraint`. */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  return causes(error).some(
    (e) => e.code === UNIQUE_VIOLATION && (constraint === undefined || e.constraint === constraint)
  );
}
