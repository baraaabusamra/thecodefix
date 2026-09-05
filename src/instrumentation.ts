import type { Instrumentation } from "next";
import { captureServerError } from "@/lib/monitoring";
import { safeRequestPath } from "@/lib/monitoring-contract";

export function register() {
  // Reserved for runtime-specific provider registration if one is added later.
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context
) => {
  await captureServerError(error, {
    source: "next_on_request_error",
    method: request.method,
    requestPath: safeRequestPath(request.path),
    routePath: context.routePath,
    routeType: context.routeType,
    routerKind: context.routerKind,
    renderSource: context.renderSource,
    revalidateReason: context.revalidateReason ?? null,
  });
};
