import {
  redactMonitoringText,
  sanitizeMonitoringContext,
  type MonitoringValue,
} from "./monitoring-contract";

type Severity = "warning" | "error";
type CaptureOptions = { severity?: Severity; notify?: boolean };

type MonitoringEvent = {
  eventId: string;
  kind: string;
  severity: Severity;
  timestamp: string;
  environment: string;
  release?: string;
  error?: { type: string; message: string; digest?: string };
  context: Record<string, MonitoringValue>;
};

const notifiedAt = new Map<string, number>();
const ALERT_COOLDOWN_MS = 5 * 60_000;

function errorDigest(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("digest" in error)) {
    return undefined;
  }
  return redactMonitoringText((error as { digest?: unknown }).digest, 128) || undefined;
}

function buildEvent(
  kind: string,
  context: Record<string, unknown>,
  options: CaptureOptions,
  error?: unknown
): MonitoringEvent {
  const severity = options.severity ?? "error";
  const event: MonitoringEvent = {
    eventId: crypto.randomUUID(),
    kind: redactMonitoringText(kind, 100),
    severity,
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    context: sanitizeMonitoringContext(context),
  };

  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    event.release = process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 40);
  }
  if (error !== undefined) {
    event.error = {
      type:
        error instanceof Error
          ? redactMonitoringText(error.name || "Error", 100)
          : "UnknownError",
      message: redactMonitoringText(
        error instanceof Error ? error.message : "Non-Error value thrown"
      ),
      ...(errorDigest(error) ? { digest: errorDigest(error) } : {}),
    };
  }
  return event;
}

function alertSignature(event: MonitoringEvent): string {
  return [event.kind, event.context.source, event.error?.digest, event.error?.type]
    .filter(Boolean)
    .join(":");
}

async function sendAlert(event: MonitoringEvent) {
  const webhookUrl = process.env.ERROR_ALERT_WEBHOOK_URL;
  if (!webhookUrl) return;

  const signature = alertSignature(event);
  const now = Date.now();
  const previous = notifiedAt.get(signature) ?? 0;
  if (now - previous < ALERT_COOLDOWN_MS) return;
  notifiedAt.set(signature, now);

  const summary = `[${event.severity.toUpperCase()}] ${event.kind} (${event.eventId})`;
  const token = process.env.ERROR_ALERT_WEBHOOK_TOKEN;
  try {
    const hostname = new URL(webhookUrl).hostname;
    const payload = hostname === "hooks.slack.com"
      ? { text: summary }
      : hostname === "discord.com" || hostname.endsWith(".discord.com")
        ? { content: summary }
        : { text: summary, event };
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) {
      console.error(
        `[monitoring] alert webhook returned ${response.status} for ${event.eventId}`
      );
    }
  } catch (error) {
    console.error(
      `[monitoring] alert webhook failed for ${event.eventId}:`,
      error instanceof Error ? redactMonitoringText(error.message, 200) : "unknown"
    );
  }
}

export async function captureOperationalEvent(
  kind: string,
  context: Record<string, unknown> = {},
  options: CaptureOptions = {}
) {
  const event = buildEvent(kind, context, options);
  const logger = event.severity === "warning" ? console.warn : console.error;
  logger(`[monitoring] ${JSON.stringify(event)}`);
  if (options.notify !== false) await sendAlert(event);
  return event.eventId;
}

export async function captureServerError(
  error: unknown,
  context: Record<string, unknown> = {},
  options: CaptureOptions = {}
) {
  const event = buildEvent("server_error", context, options, error);
  const logger = event.severity === "warning" ? console.warn : console.error;
  logger(`[monitoring] ${JSON.stringify(event)}`);
  if (options.notify !== false) await sendAlert(event);
  return event.eventId;
}
