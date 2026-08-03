"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

// Split out of Certificate.tsx so useSession() is only ever called when this
// is mounted — the caller must only mount it when auth is enabled
// (SessionProvider is otherwise absent, see src/app/layout.tsx, and calling
// useSession() without it crashes; do not add an `enabled` prop here as a
// substitute for that — the hook below would still run every render
// regardless). Renders nothing; just prefills the certificate name field
// from the verified sign-in name so a signed-in user isn't asked to
// hand-type their own name.
export default function CertificateNamePrefill({
  onName,
}: {
  onName: (name: string) => void;
}) {
  const { data: session } = useSession();
  useEffect(() => {
    if (session?.user?.name) onName(session.user.name);
  }, [session?.user?.name, onName]);
  return null;
}
