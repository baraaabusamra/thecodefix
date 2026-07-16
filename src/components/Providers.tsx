"use client";

import { SessionProvider } from "next-auth/react";
import ProgressSync from "./ProgressSync";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ProgressSync />
      {children}
    </SessionProvider>
  );
}
