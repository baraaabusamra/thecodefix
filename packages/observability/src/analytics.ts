"use client";

import { sendGAEvent } from "@next/third-parties/google";
import { track as trackVercelEvent } from "@vercel/analytics/react";
import {
  sanitizeAnalyticsProperties,
  type AnalyticsEventMap,
  type AnalyticsEventName,
} from "./analytics-contract";

const SIGNUP_MARKER_KEY = "tcf:analytics:signup";

type SignupMarker = AnalyticsEventMap["signup_start"];

export function trackProductEvent<Name extends AnalyticsEventName>(
  name: Name,
  properties: AnalyticsEventMap[Name]
) {
  const safeProperties = sanitizeAnalyticsProperties(name, properties);

  try {
    trackVercelEvent(name, safeProperties);
  } catch {
    // Analytics must never interrupt the product action the learner requested.
  }

  if (process.env.NEXT_PUBLIC_GA_ID) {
    try {
      sendGAEvent("event", name, safeProperties);
    } catch {
      // Keep GA failures isolated from the learner experience too.
    }
  }
}

export function markSignupStarted(source: string, provider?: string) {
  if (typeof window === "undefined") return;

  let marker: SignupMarker | null = null;
  try {
    const raw = window.sessionStorage.getItem(SIGNUP_MARKER_KEY);
    marker = raw ? (JSON.parse(raw) as SignupMarker) : null;
  } catch {
    marker = null;
  }

  const nextMarker = {
    source: marker?.source ?? source,
    provider: provider ?? marker?.provider,
  } satisfies SignupMarker;

  try {
    window.sessionStorage.setItem(SIGNUP_MARKER_KEY, JSON.stringify(nextMarker));
  } catch {
    // Storage can be unavailable in hardened/private browser modes.
  }

  if (!marker) trackProductEvent("signup_start", nextMarker);
}

export function consumeSignupMarker(): SignupMarker | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SIGNUP_MARKER_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(SIGNUP_MARKER_KEY);
    const marker = JSON.parse(raw) as Partial<SignupMarker>;
    return typeof marker.source === "string"
      ? { source: marker.source, provider: marker.provider }
      : null;
  } catch {
    return null;
  }
}
