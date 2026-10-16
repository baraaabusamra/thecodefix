import { safeRequestPath } from "./monitoring-contract";

export type CspReportSummary = {
  documentPath?: string;
  blockedUrl?: string;
  directive?: string;
  sourceUrl?: string;
  line?: number;
  column?: number;
};

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function shortString(value: unknown, maxLength = 400): string | undefined {
  return typeof value === "string" && value
    ? value.replace(/[\r\n\t]+/g, " ").slice(0, maxLength)
    : undefined;
}

function safeReportUrl(value: unknown): string | undefined {
  const raw = shortString(value);
  if (!raw) return undefined;
  if (!/^https?:\/\//i.test(raw)) return raw.slice(0, 120);
  try {
    const url = new URL(raw);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return undefined;
  }
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function normalizeOne(input: unknown): CspReportSummary | null {
  const entry = record(input);
  if (!entry) return null;
  const body = record(entry["csp-report"]) ?? record(entry.body) ?? entry;

  const documentUrl = body["document-uri"] ?? body.documentURL ?? entry.url;
  const blockedUrl = body["blocked-uri"] ?? body.blockedURL;
  const directive =
    body["effective-directive"] ??
    body.effectiveDirective ??
    body["violated-directive"];
  const sourceUrl = body["source-file"] ?? body.sourceFile;
  const line = body["line-number"] ?? body.lineNumber;
  const column = body["column-number"] ?? body.columnNumber;

  if (!documentUrl && !blockedUrl && !directive) return null;

  return {
    ...(documentUrl ? { documentPath: safeRequestPath(documentUrl) } : {}),
    ...(safeReportUrl(blockedUrl)
      ? { blockedUrl: safeReportUrl(blockedUrl) }
      : {}),
    ...(shortString(directive, 120)
      ? { directive: shortString(directive, 120) }
      : {}),
    ...(safeReportUrl(sourceUrl) ? { sourceUrl: safeReportUrl(sourceUrl) } : {}),
    ...(finiteNumber(line) !== undefined ? { line: finiteNumber(line) } : {}),
    ...(finiteNumber(column) !== undefined
      ? { column: finiteNumber(column) }
      : {}),
  };
}

export function normalizeCspReports(input: unknown): CspReportSummary[] {
  const entries = Array.isArray(input) ? input.slice(0, 10) : [input];
  return entries
    .map(normalizeOne)
    .filter((item): item is CspReportSummary => item !== null);
}
