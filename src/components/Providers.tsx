"use client";

import { SessionProvider } from "next-auth/react";
import AuthConversionTracker from "./AuthConversionTracker";
import ProgressSync from "./ProgressSync";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthConversionTracker />
      <ProgressSync />
      {children}
    </SessionProvider>
  );
}
