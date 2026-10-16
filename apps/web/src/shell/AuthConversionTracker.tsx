"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { consumeSignupMarker, trackProductEvent } from "@tcf/observability/analytics";

export default function AuthConversionTracker() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    const marker = consumeSignupMarker();
    if (marker) trackProductEvent("signup_complete", marker);
  }, [status]);

  return null;
}
