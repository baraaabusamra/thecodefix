"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import ProgressSync from "./ProgressSync";

function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ServiceWorkerRegistrar />
      <ProgressSync />
      {children}
    </SessionProvider>
  );
}
