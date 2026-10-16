export type AnalyticsPropertyValue = string | number | boolean | null;

export const ANALYTICS_EVENT_PROPERTIES = {
  track_view: ["track"],
  lesson_start: ["track", "lesson"],
  lesson_complete: ["track", "lesson"],
  playground_run: ["mode"],
  quiz_start: ["track", "lesson"],
  quiz_pass: ["track", "lesson", "score", "total"],
  signup_start: ["source", "provider"],
  signup_complete: ["source", "provider"],
  certificate_issue: ["track"],
  certificate_share: ["track", "platform"],
  job_apply_click: ["source", "country", "specialty", "job", "mode"],
  pricing_cta_click: ["plan", "destination"],
  contact_company_click: ["source"],
  learn_cta_click: ["source"],
  exam_start: ["track"],
  exam_pass: ["track", "score", "total"],
  exam_fail: ["track", "score", "total"],
  job_alert_subscribe: ["country", "specialty"],
  article_share: ["slug", "platform"],
} as const;

export type AnalyticsEventName = keyof typeof ANALYTICS_EVENT_PROPERTIES;

export interface AnalyticsEventMap {
  track_view: { track: string };
  lesson_start: { track: string; lesson: string };
  lesson_complete: { track: string; lesson: string };
  playground_run: { mode: "js" | "html" | "python" };
  quiz_start: { track: string; lesson?: string };
  quiz_pass: { track: string; lesson?: string; score: number; total: number };
  signup_start: { source: string; provider?: string };
  signup_complete: { source: string; provider?: string };
  certificate_issue: { track: string };
  certificate_share: { track: string; platform: string };
  job_apply_click: {
    source: string;
    country?: string;
    specialty?: string;
    job?: string;
    mode?: "jobs" | "training";
  };
  pricing_cta_click: { plan: string; destination: string };
  contact_company_click: { source: string };
  learn_cta_click: { source: string };
  exam_start: { track: string };
  exam_pass: { track: string; score: number; total: number };
  exam_fail: { track: string; score: number; total: number };
  job_alert_subscribe: { country: string; specialty: string };
  article_share: { slug: string; platform: string };
}

export function sanitizeAnalyticsProperties<Name extends AnalyticsEventName>(
  name: Name,
  properties: AnalyticsEventMap[Name] | Record<string, unknown>
): Record<string, AnalyticsPropertyValue> {
  const input = properties as Record<string, unknown>;
  const safe: Record<string, AnalyticsPropertyValue> = {};

  for (const key of ANALYTICS_EVENT_PROPERTIES[name]) {
    const value = input[key];
    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      safe[key] = value;
    }
  }

  return safe;
}
