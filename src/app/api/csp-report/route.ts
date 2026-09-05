import { NextRequest, NextResponse } from "next/server";
import { normalizeCspReports } from "@/lib/csp-report";
import { captureOperationalEvent } from "@/lib/monitoring";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { readRequestBodyWithLimit } from "@/lib/request-body";

const MAX_CSP_REPORT_BYTES = 16_384;
const CSP_CONTENT_TYPES = [
  "application/csp-report",
  "application/reports+json",
  "application/json",
];

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_CSP_REPORT_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!CSP_CONTENT_TYPES.some((type) => contentType.startsWith(type))) {
    return NextResponse.json({ error: "Unsupported media type" }, { status: 415 });
  }

  const ip = await getClientIp();
  if (!rateLimit(`csp-report:${ip}`, 60, 60_000)) {
    return new NextResponse(null, { status: 429 });
  }

  const raw = await readRequestBodyWithLimit(request, MAX_CSP_REPORT_BYTES);
  if (raw === null) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  for (const report of normalizeCspReports(input)) {
    await captureOperationalEvent("csp_violation", report, {
      severity: "warning",
      notify: false,
    });
  }
  return new NextResponse(null, { status: 204 });
}
