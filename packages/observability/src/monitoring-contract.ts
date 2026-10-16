export type MonitoringValue = string | number | boolean | null;

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const BEARER_PATTERN = /\bBearer\s+[A-Z0-9._~+/=-]+/gi;
const SECRET_QUERY_PATTERN = /([?&](?:token|key|secret|password|code|email)=)[^&#\s]+/gi;
const URL_CREDENTIALS_PATTERN = /\b([a-z][a-z0-9+.-]*:\/\/)[^@\s/]+@/gi;
const SECRET_ASSIGNMENT_PATTERN = /\b(password|pass|token|secret|api[_-]?key)\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi;
const FORBIDDEN_CONTEXT_KEY = /email|name|user|code|content|message|phone|address|token|secret|password/i;

export function redactMonitoringText(input: unknown, maxLength = 600): string {
  const flattened = String(input ?? "").replace(/[\r\n\t]+/g, " ");
  return flattened
    .replace(URL_CREDENTIALS_PATTERN, "$1[redacted]@")
    .replace(EMAIL_PATTERN, "[redacted-email]")
    .replace(BEARER_PATTERN, "Bearer [redacted]")
    .replace(SECRET_QUERY_PATTERN, "$1[redacted]")
    .replace(SECRET_ASSIGNMENT_PATTERN, "$1=[redacted]")
    .slice(0, maxLength);
}

export function safeRequestPath(input: unknown): string {
  const value = String(input ?? "");
  if (!value) return "/";
  try {
    return new URL(value, "https://monitoring.invalid").pathname || "/";
  } catch {
    return "/";
  }
}

export function sanitizeMonitoringContext(
  context: Record<string, unknown>
): Record<string, MonitoringValue> {
  const safe: Record<string, MonitoringValue> = {};
  for (const [key, value] of Object.entries(context)) {
    if (FORBIDDEN_CONTEXT_KEY.test(key)) continue;
    if (value === null || typeof value === "boolean") {
      safe[key] = value;
    } else if (typeof value === "number" && Number.isFinite(value)) {
      safe[key] = value;
    } else if (typeof value === "string") {
      safe[key] = redactMonitoringText(value, 300);
    }
  }
  return safe;
}
