import { NextRequest, NextResponse } from "next/server";
import { captureOperationalEvent } from "@/lib/monitoring";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { readRequestBodyWithLimit } from "@/lib/request-body";

const MAX_CLIENT_ERROR_BYTES = 1_024;
const ALLOWED_SOURCES = new Set(["app_error", "global_error", "admin_error"]);

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_CLIENT_ERROR_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "Unsupported media type" }, { status: 415 });
  }

  const ip = await getClientIp();
  if (!rateLimit(`client-error:${ip}`, 20, 60_000)) {
    return new NextResponse(null, { status: 429 });
  }

  const raw = await readRequestBodyWithLimit(request, MAX_CLIENT_ERROR_BYTES);
  if (raw === null) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return NextResponse.json({ error: "Invalid report" }, { status: 400 });
  }

  const { source, digest } = input as Record<string, unknown>;
  if (typeof source !== "string" || !ALLOWED_SOURCES.has(source)) {
    return NextResponse.json({ error: "Invalid report" }, { status: 400 });
  }
  if (digest !== undefined && (typeof digest !== "string" || digest.length > 128)) {
    return NextResponse.json({ error: "Invalid report" }, { status: 400 });
  }

  await captureOperationalEvent(
    "client_error_boundary",
    { source, ...(digest ? { digest } : {}) },
    { severity: "error", notify: true }
  );
  return new NextResponse(null, { status: 204 });
}
