"use client";

export function reportClientBoundaryError(source: string, digest?: string) {
  const body = JSON.stringify({
    source: source.slice(0, 80),
    ...(digest ? { digest: digest.slice(0, 128) } : {}),
  });

  void fetch("/api/monitoring/client-error", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // Reporting must never make the error fallback itself fail.
  });
}
